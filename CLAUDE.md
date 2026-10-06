# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A TypeScript + Playwright test scaffold with two kinds of specs:
- **API tests** (`tests/api/`) that call typed HTTP clients directly (no browser).
- **E2E tests** (`tests/e2e/`) that drive a real browser via Playwright's `page` fixture.

Currently the only client is `CoinMarketCapClient`, used to assert on live CoinMarketCap BTC price data.

## Commands

```bash
npm run test:api      # run tests/api except btc-price.spec.ts, plus tests/contract
npm run test:btc-price # run only btc-price.spec.ts
npm run test:contract # run tests/contract (test:api also runs it)
npm run test:e2e      # run tests/e2e (the navigation suite)
npm run allure:api     # build allure-report/api/ from allure-results/api/ (also allure:btc-price, allure:navigation)
npm run test:allure   # run each suite, then generate its own Allure report even if tests failed
npx playwright test tests/api/simple-price.spec.ts   # run a single file
npx playwright test -g "BTC price is within expected range"  # run a single test by title
npx tsc --noEmit      # type-check without emitting
npm run lint          # ESLint (typescript-eslint + eslint-plugin-playwright)
npm run lint:fix      # same, with autofix
npm run viewer        # read-only web UI for the test cases DB at http://127.0.0.1:4000 (PORT, TEST_CASES_DB override)
```

A Husky `pre-commit` hook (`.husky/pre-commit`, installed by the `prepare` script on `npm install`) runs `npm run lint` and blocks the commit on any error. Config is `eslint.config.mjs`; Playwright rules apply to `tests/**` only. The self-heal agents commit with `--no-verify` so an automated commit isn't blocked by lint.

After lint, the hook also runs `PreCommitCodeReviewHook` (`.agents/code-review-hook/PreCommitCodeReviewHook.mts`, also `npm run code-review`). It diffs all uncommitted `.ts`/`.mts` changes (staged, unstaged, untracked) and reviews them with the `typescript-code-review` skill via a headless, read-only `claude -p` session, blocking the commit on 🔴 critical findings only. It needs the `claude` CLI on `PATH` (or `CLAUDE_BIN`) and fails open with a warning if the CLI is missing, times out, or returns unparseable output. Bypass with `SKIP_CODE_REVIEW=1` or `--no-verify`. Each run adds roughly 30s+ and a model call to every commit.

`typescript` is aliased to `@typescript/typescript6` because typescript-eslint doesn't support TS 7 yet (`typescript7` is kept alongside). Drop the alias once typescript-eslint supports TS >=7.1.

## Allure reporting

Each suite is fully isolated by the `ALLURE_SUITE` env var (`btc-price`, `api` = simple price + gainers-losers, `navigation`; unset → `adhoc`): `playwright.config.ts` writes results to `allure-results/<suite>/`, and `allurerc.mjs` (Allure 3, `appendHistory`) generates `allure-report/<suite>/` and appends to `allure-history/<suite>.jsonl`. The `test:api`/`test:btc-price`/`test:e2e` scripts set the key and clear that suite's results dir before running. Results, reports and history are gitignored locally. In CI, each of the two heal workflows and `api-tests.yml` sets `ALLURE_SUITE` at job level, restores its own `allure-history/<suite>.jsonl` from the `gh-pages` branch, generate the report, and publish it back to `gh-pages` under `btc-price/`, `navigation/` or `api/` (the `api-tests.yml` workflow runs `--project=contract` then `--project=api` as separate steps, i.e. the contract tests followed by the simple-price and gainers-losers specs, every 6 hours plus `workflow_dispatch`) and a summary landing page (`.github/allure-summary/index.html`, copied to the branch root) links all three and shows each one's latest `summary.json` stats. GitHub Pages serves the `gh-pages` branch at https://nknysh.github.io/cmc-tests/ (the repo is public, so reports are too). The navigation heal script sets `ALLURE_SUITE=navigation` and `PLAYWRIGHT_JSON_OUTPUT_NAME` (which makes the config add the `json` reporter), clearing `allure-results/navigation/` once per script run so heal re-runs are recorded too.

## Environment

- Copy `.env.example` to `.env` and set `CMC_API_KEY` (a CoinMarketCap Pro API key) before running API tests.
- `playwright.config.ts` loads `.env` once via `import 'dotenv/config'` at the top, so `process.env.X` is populated in every test.
- `BASE_URL` env var overrides the Playwright `baseURL` (defaults to `http://localhost:3000`) — only relevant for E2E specs that navigate relative paths.

## Architecture

### API client pattern (`src/clients/<api-name>/`)

Each third-party API gets its own folder with three files:
- `<Name>Client.ts` — one class, constructed with an options object (never positional args). Required config (e.g. `apiKey`) is validated in the constructor, throwing immediately. Config is stored as `private readonly`. One public async method per logical operation, returning a small domain type — never the raw API response shape.
- `types.ts` — three kinds of type: the **domain type** returned to callers (camelCase, minimal fields), the **client options** type, and the **raw response type** (snake_case, mirrors the third-party JSON, used only internally to type the parsed response and never exported from the module).
- `index.ts` — barrel file re-exporting the class and its public types only (not the raw response type).

Every request/response is logged via `console.log` with a `[ClassName]` prefix, secrets redacted in logged headers. The response body is read as text first (so it's captured in logs even if parsing fails later), then `JSON.parse`d. Non-OK responses throw a plain `Error` with status/statusText after logging — failures are never swallowed or turned into `null`.

See `src/clients/coinmarketcap/` as the reference implementation, and `.claude/skills/api-testing/SKILL.md` for the full pattern writeup (loaded automatically as the `api-testing` skill when adding a client or API spec).

### API test pattern (`tests/api/`)

- Imports the client directly — no `page` fixture, so Playwright doesn't launch a browser for these.
- Reads required env vars and asserts they're present (`expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()`) before constructing the client, so a missing key fails clearly instead of erroring deep inside an API call.
- Declares threshold/expected-value constants at the top of the file, named and explicit, rather than inlined into assertions. Exception: `btc-price.spec.ts` reads its min/max bounds from the self-healing window file below instead of hardcoding them, since the bounds are expected to move over time.
- One `test()` per behavior, asserting on the client's domain type (not the raw response).

### Contract tests (`tests/contract/`)

`src/clients/coinmarketcap/schemas.ts` holds a zod schema per raw response the client parses (plus the shared status/error envelope). The raw types in `types.ts` are `z.infer` of these, so schema and types can't drift. The client doesn't validate at runtime. Schemas list only the fields the client reads, and unknown keys are ignored. Contract specs import `schemas.ts` directly. This is a deliberate test-only exception to the barrel, which still doesn't export raw shapes.

- `provider/` (live, needs `CMC_API_KEY`) GETs each endpoint via Playwright's `request` fixture, bypassing the client, and validates the raw body. A failure means CMC changed the API. Gainers-losers is plan-gated on the Basic key, so only its 403/1006 and 401 envelopes are checked live.
- `consumer/` (offline) stubs `globalThis.fetch` with a fixture from `fixtures/` and runs the real client. It asserts three things: the request (path, snake_case params, key header), the exact domain mapping, and error-envelope handling. Each fixture is itself schema-checked.
- Fixtures were recorded live (2026-10-06) and trimmed. `gainers-losers.success.json` is hand-built from CMC's docs. Re-record them when a provider spec flags drift and the schema is updated.
- Known quirks the schemas encode:
  - `status.error_code` is a number on quotes/latest and gainers-losers, but a numeric string on simple/price.
  - quotes/latest returns every coin sharing a symbol, and only the first (canonical) entry is guaranteed a non-null price.

### E2E test pattern (`tests/e2e/`)

Standard Playwright Page Object Model conventions apply; see the `e2e-testing` skill (`.claude/skills/e2e-testing/SKILL.md`) for structuring page objects, config, CI/CD, artifacts, and flaky-test strategies.

### Playwright config

`globalSetup` runs the self-healing BTC price window (below) before every test session, regardless of which `--project` is selected. The `btc-price` project is split out from `api` so the heal workflow can run it in isolation.

### Self-healing BTC price window (`.agents/btc-price-window/`)

`tests/api/btc-price.spec.ts` asserts live BTC price falls within a `[min, max]` window persisted in `.agents/btc-price-window/btc-price-window.json` (read/written via `btcPriceWindow.ts`), rather than a hardcoded range — BTC price drifts too much for a fixed threshold to stay meaningful.

- `self-heal-btc-price-window.ts` is wired as Playwright's `globalSetup`. On every run it fetches the live price; if it falls outside the current window it computes a recentred window (same width, shifted to the new price), then passes the old window, the fetched price, and the proposed new window to the shared local-model auditor (`.agents/self-heal-commit-auditor/`) before writing anything. Only on a `PASS` verdict does it write the updated JSON and commit; on `CRITICAL` it leaves the existing window untouched and logs why, so a genuinely out-of-bounds price surfaces as an ordinary test failure instead of a bad recentring being silently accepted. In CI, where there's no configured git identity, it scopes the repo owner's identity to that one commit rather than touching any configured identity.
- `.github/workflows/btc-price-window-heal.yml` runs this every 4 hours via cron (plus `workflow_dispatch`), executing `npx playwright test --project=btc-price` (which triggers the same `globalSetup` heal) and pushing the commit if the window changed.
- Net effect: the window self-adjusts to track price drift instead of the test needing manual threshold updates.

A separate daily script heals `tests/e2e/pages/CoinMarketCapHomePage.ts` locators with a local LLM, then runs the same shared auditor on its own proposed patch before committing; details load from `.agents/coinmarketcap-navigation/CLAUDE.md` when working there. Both self-heal scripts route their pre-commit audit through `.agents/self-heal-commit-auditor/` (see its `CLAUDE.md`) — a local-model gate that can veto the commit outright, since both scripts commit with `--no-verify` and would otherwise bypass the pre-commit review hook entirely.

## Git commits

Never commit or push without asking first. Wait for an explicit request each time; approval for one commit or push doesn't carry over to the next.

Do not add a `Co-Authored-By: Claude` trailer to commit messages — commits should read as authored solely by the user.

## Skills

Skills live in `.claude/skills/` (sources tracked in `skills-lock.json`):
- `api-testing` (local, `.claude/skills/api-testing/SKILL.md`) — client/API-test conventions described above.
- `test-design` (local, `.claude/skills/test-design/SKILL.md`) — what to test and how to structure specs.
- `e2e-testing` (from `affaan-m/ECC` on GitHub, locally modified) — Playwright E2E patterns.
- `typescript-code-review` (from `anyproto/anytype-ts`, locally modified; symlinked from `.agents/skills/typescript-code-review/`) — used by the pre-commit review hook.

A `playwright` MCP server (`@playwright/mcp`) is configured in `.mcp.json` for browser automation from Claude Code itself.
