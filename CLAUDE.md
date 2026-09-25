# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A TypeScript + Playwright test scaffold with two kinds of specs:
- **API tests** (`tests/api/`) that call typed HTTP clients directly (no browser).
- **E2E tests** (`tests/e2e/`) that drive a real browser via Playwright's `page` fixture.

Currently the only client is `CoinMarketCapClient`, used to assert on live CoinMarketCap BTC price data.

## Commands

```bash
npm test              # run all specs (tests/api + tests/e2e)
npm run test:api      # run tests/api except btc-price.spec.ts
npm run test:btc-price # run only btc-price.spec.ts
npm run test:ui       # Playwright UI mode
npm run test:headed   # run headed (visible browser)
npm run test:report   # open the last HTML report
npm run allure:generate # build allure-report/ from allure-results/ (appends to allure-history.jsonl)
npm run allure:open   # open the generated Allure report
npm run test:allure   # run all specs, then generate the Allure report even if tests failed
npx playwright test tests/api/simple-price.spec.ts   # run a single file
npx playwright test -g "BTC price is above threshold"  # run a single test by title
npx tsc --noEmit      # type-check without emitting
npm run lint          # ESLint (typescript-eslint + eslint-plugin-playwright)
npm run lint:fix      # same, with autofix
```

A Husky `pre-commit` hook (`.husky/pre-commit`, installed by the `prepare` script on `npm install`) runs `npm run lint` and blocks the commit on any error. Config is `eslint.config.mjs`; Playwright rules apply to `tests/**` only. The self-heal agents commit with `--no-verify` so an automated commit isn't blocked by lint.

After lint, the hook also runs `PreCommitCodeReviewHook` (`.agents/code-review-hook/PreCommitCodeReviewHook.mts`, also `npm run code-review`). It diffs all uncommitted `.ts`/`.mts` changes (staged, unstaged, untracked) and reviews them with the `typescript-code-review` skill via a headless, read-only `claude -p` session, blocking the commit on 🔴 critical findings only. It needs the `claude` CLI on `PATH` (or `CLAUDE_BIN`) and fails open with a warning if the CLI is missing, times out, or returns unparseable output. Bypass with `SKIP_CODE_REVIEW=1` or `--no-verify`. Each run adds roughly 30s+ and a model call to every commit.

`typescript` is aliased to `@typescript/typescript6` because typescript-eslint doesn't support TS 7 yet (`typescript7` is kept alongside). Drop the alias once typescript-eslint supports TS >=7.1.

## Allure reporting

`allure-playwright` is a reporter in `playwright.config.ts` and writes raw results to `allure-results/` for every project. `allurerc.mjs` configures Allure 3 (`allure generate`) with `appendHistory`, so each generated report adds the run to `allure-history.jsonl`. Results, report and history are gitignored locally. In CI, both heal workflows restore history from the `gh-pages` branch, generate the report, and publish it back to `gh-pages` under `btc-price/` or `navigation/` and a summary landing page (`.github/allure-summary/index.html`, copied to the branch root) links both and shows each one's latest `summary.json` stats. GitHub Pages serves the `gh-pages` branch at https://nknysh.github.io/cmc-tests/ (the repo is public, so reports are too). The navigation heal script runs its inner suite with `--reporter=json,allure-playwright` so heal re-runs are recorded too.

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

### E2E test pattern (`tests/e2e/`)

Standard Playwright Page Object Model conventions apply; see the `e2e-testing` skill (`.claude/skills/e2e-testing/SKILL.md`) for structuring page objects, config, CI/CD, artifacts, and flaky-test strategies.

### Playwright config

Three projects, all no-browser except `e2e`: `api` (`testDir: tests/api`, excludes `btc-price.spec.ts` via `testIgnore`), `btc-price` (`testDir: tests/api`, matches only `btc-price.spec.ts` via `testMatch` — split out so the self-healing workflow below can run it in isolation), and `e2e` (`testDir: tests/e2e`, Desktop Chrome). `npm run test:api`/`test:btc-price`/`test:e2e` filter via `--project`. `fullyParallel: true`, retries/workers adjust based on `CI` env var. Reporters: HTML (`playwright-report/`) + list. `globalSetup` runs the self-healing BTC price window (below) before every test session, regardless of which project is selected.

### Self-healing BTC price window (`.agents/btc-price-window/`)

`tests/api/btc-price.spec.ts` asserts live BTC price falls within a `[min, max]` window persisted in `.agents/btc-price-window/btc-price-window.json` (read/written via `btcPriceWindow.ts`), rather than a hardcoded range — BTC price drifts too much for a fixed threshold to stay meaningful.

- `self-heal-btc-price-window.ts` is wired as Playwright's `globalSetup`. On every run it fetches the live price; if it falls outside the current window it recentres the window (same width, shifted to the new price) and commits the updated JSON. In CI, where there's no configured git identity, it scopes the repo owner's identity to that one commit rather than touching any configured identity.
- `.github/workflows/btc-price-window-heal.yml` runs this every 4 hours via cron (plus `workflow_dispatch`), executing `npx playwright test --project=btc-price` (which triggers the same `globalSetup` heal) and pushing the commit if the window changed.
- Net effect: the window self-adjusts to track price drift instead of the test needing manual threshold updates.

### Self-healing CoinMarketCap navigation locators (`.agents/coinmarketcap-navigation/`)

`self-heal-navigation-locators.mts` is a standalone script (not wired into Playwright — it runs the suite itself as a subprocess) that keeps `tests/e2e/pages/CoinMarketCapHomePage.ts` working when the live site's markup changes:

- Runs `--project=e2e` and inspects the JSON report. If everything passed, it exits immediately.
- If a failure's error text looks locator-related (`waiting for locator`, `strict mode violation`, etc.) rather than a genuine assertion/business-logic failure, it opens the live site and serializes the nav area's actual tag/attributes/text (not a plain ARIA snapshot — that drops the `data-test`/`data-index` attributes the selectors key off, which made an early version of this agent silently fail to repair anything), then sends the current page object source + the error + that snapshot to a **locally-run** LLM (Qwen2.5-Coder-7B-Instruct, GGUF, via `node-llama-cpp`), asking for the complete corrected file back. No API key, no network call to an LLM provider — inference runs in-process on the machine executing the script. The model is downloaded once (~4.7GB) to `.agents/coinmarketcap-navigation/models/` (gitignored) on first use.
- Writes the proposed file, re-runs the suite to verify the fix actually resolves the failure, and only then commits (reverting otherwise). Uses the same repo-owner CI git identity as the BTC price window agent.
- A non-locator failure (a real behavioral regression) is deliberately left alone — it's not something an LLM patch should paper over — and the script exits non-zero so a human notices.
- `.github/workflows/coinmarketcap-navigation-heal.yml` runs this daily via cron (plus `workflow_dispatch`), caching the downloaded model across runs. CPU-only inference on a standard GitHub-hosted runner is slow (minutes per completion, not seconds) — this is the tradeoff for not depending on a paid API.

## Git commits

Never commit or push without asking first. Wait for an explicit request each time; approval for one commit or push doesn't carry over to the next.

Do not add a `Co-Authored-By: Claude` trailer to commit messages — commits should read as authored solely by the user.

## Skills

This repo has local skills wired up via `skills-lock.json` and symlinked into `.claude/skills/`:
- `api-testing` (local, `skills/api-testing/SKILL.md`) — client/API-test conventions described above.
- `e2e-testing` (from `affaan-m/ECC` on GitHub) — Playwright E2E patterns.

A `playwright` MCP server (`@playwright/mcp`) is configured in `.mcp.json` for browser automation from Claude Code itself.
