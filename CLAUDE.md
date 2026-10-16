# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A TypeScript + Playwright test scaffold with two kinds of specs:
- **API tests** (`tests/api/`) that call typed HTTP clients directly (no browser).
- **E2E tests** (`tests/e2e/`) that drive a real browser via Playwright's `page` fixture.

Currently the only client is `CoinMarketCapClient`, used to assert on live CoinMarketCap BTC price data.

## Commands

```bash
npm run test:api      # run tests/api except btc-price.spec.ts (functional API specs)
npm run test:btc-price # run only btc-price.spec.ts
npm run test:contract # run tests/contract (its own Allure suite)
npm run test:e2e      # run tests/e2e (the navigation suite)
npm run test:coinboard # run tests/coinboard (CoinBoard UI tests); starts the app's dev server unless COINBOARD_URL is set
npm run test:perf     # k6 latency baseline, also writes allure-results/perf/ (needs the k6 binary and CMC_API_KEY exported)
npm run allure:api     # build allure-report/api/ from allure-results/api/ (also allure:contract, allure:btc-price, allure:navigation, allure:coinboard, allure:perf)
npm run allure:gate   # check allure-results/$ALLURE_SUITE against that suite's quality gate (e.g. ALLURE_SUITE=api npm run allure:gate)
npm run test:allure   # run each Playwright suite, then generate its own Allure report even if tests failed (not perf)
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

## No new lint or Sonar issues

Any code or config you write must not add ESLint errors/warnings or SonarQube Cloud issues/hotspots. Before calling a change done:
- Run `npm run lint` and `npx tsc --noEmit` and fix what you introduced (don't silence rules with `eslint-disable` unless the user agrees).
- Follow Sonar's rules up front rather than fixing after the scan. Known ones for this repo's workflows: `npm ci --ignore-scripts` (S6505), invoke repo tools via `./node_modules/.bin/<tool>` or `npx --no-install`, never install packages outside the lockfile, and pin third-party actions to a commit SHA with a `# vX.Y.Z` comment.
- If a new issue is unavoidable, say so and explain why instead of shipping it silently.

## SonarQube Cloud

`.github/workflows/sonar.yml` runs SonarQube Cloud static analysis on every push to `main`, on every PR, and on `workflow_dispatch`. It uses the `SONAR_TOKEN` secret and runs no tests. `sonar-project.properties` declares `tests/**` as *sources*, not `sonar.tests`, so specs get the full rule set rather than Sonar's reduced test-file rules. It excludes `tests/contract/fixtures/**` and imports an ESLint JSON report (`eslint-report.json`, gitignored) as external issues. `sonar.qualitygate.wait=true` makes the scan step, and so the check, fail when the project's quality gate fails. Specs have no coverage, so `sonar.coverage.exclusions=**/*` excludes every file from coverage. Without it, any new line under `tests/` counts as 0% covered and fails the gate's coverage-on-new-code condition. The gate actually applied to the project does include one (seen 2026-10-08). Automatic Analysis must stay off in the project settings, because it conflicts with CI analysis.

## Allure reporting

Each suite is fully isolated by the `ALLURE_SUITE` env var (`btc-price`, `api` = functional simple price + quotes/latest specs, `contract` = `tests/contract`, `navigation`, `coinboard` = `tests/coinboard`, `perf` = the k6 baseline; unset → `adhoc`): `playwright.config.ts` writes results to `allure-results/<suite>/`, and `allurerc.mjs` (Allure 3, `appendHistory`) generates `allure-report/<suite>/` and appends to `allure-history/<suite>.jsonl`. The `test:api`/`test:contract`/`test:btc-price`/`test:e2e`/`test:coinboard` scripts set the key and clear that suite's results dir before running. Results, reports and history are gitignored locally. In CI, each of the two heal workflows sets `ALLURE_SUITE` at job level, restores its own `allure-history/<suite>.jsonl` from the `gh-pages` branch, builds the report via `allure run`, and publishes it back to `gh-pages` under `btc-price/` or `navigation/`. `api-tests.yml` (every 6 hours plus `workflow_dispatch`) runs `--project=contract` then `--project=api` as separate steps, each wrapped in `allure run` and setting its own `ALLURE_SUITE` (`contract`, `api`), then publishes both reports in a loop over `ALLURE_SUITES` to `contract/` and `api/`. `perf-tests.yml` does the same for `perf/` (see Performance baseline). A summary landing page (`.github/allure-summary/index.html`, copied to the branch root) links all six and shows each one's latest `summary.json` stats. GitHub Pages serves the `gh-pages` branch at https://nknysh.github.io/cmc-tests/ (the repo is public, so reports are too). The navigation heal script sets `ALLURE_SUITE=navigation` and `PLAYWRIGHT_JSON_OUTPUT_NAME` (which makes the config add the `json` reporter), clearing `allure-results/navigation/` once per script run so heal re-runs are recorded too.

Quality gates are defined in `allurerc.mjs` and tiered by Allure severity. Each suite gets three rules:
- `severe`: no failures allowed among blocker/critical tests.
- `non-severe`: up to `MAX_NON_SEVERE_FAILURES` (2) failures allowed among normal/minor/trivial tests, plus tests with no label.
- `all`: a `minTestsCount` equal to the suite's current test count, which catches specs that silently drop out. Bump it in `minTestsCount` when adding tests.

Every test declares its severity with the `severity(Severity.X)` annotation from `tests/helpers/severity.ts`. It goes on the test, or on its `test.describe` when the whole group shares a level (contract provider = blocker, contract consumer and navigation = critical). allure-playwright maps `allure.label.severity` annotations to the label. Perf sets the label itself in `allureResults.ts`: p99 is normal, every other threshold critical. The btc-price and navigation tests are all blocker/critical, so any failure there still fails the gate, which their heal workflows rely on. Only `allure run -- <test command>` evaluates the gate into the report (its "Quality Gates" tab, `quality-gate.json`). `allure generate` leaves it empty. So every CI test step is wrapped in `allure run`, with history restored from `gh-pages` *before* the tests. `allure run` exits with the gate's result instead of the test command's. Failing tests still fail the step (via `maxFailures`), but the navigation workflow also records the heal script's own exit code, so a non-test failure such as an auditor veto isn't masked. `allurerc.mjs` sets `resultsDir` to `allure-results/<suite>`. Locally, `npm run allure:gate` checks existing results with `allure quality-gate`.

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
- Builds the client with `createCmcClient()` (`tests/helpers/cmc.ts`). It asserts `CMC_API_KEY` is set (`'CMC_API_KEY must be set'`), so a missing key fails clearly instead of erroring deep inside an API call, and attaches the shared rate limiter (see Rate limit below).
- Declares threshold/expected-value constants at the top of the file, named and explicit, rather than inlined into assertions. Exception: `btc-price.spec.ts` reads its min/max bounds from the self-healing window file below instead of hardcoding them, since the bounds are expected to move over time.
- One `test()` per behavior, asserting on the client's domain type (not the raw response).

#### Rate limit

The Basic key allows 30 req/min across every live call (globalSetup heal, provider contract, api, btc-price). A burst of requests used to fail tests with 429 / `error_code 1008`. Now:
- `RateLimiter` (`src/clients/coinmarketcap/RateLimiter.ts`) spaces calls evenly (no bursts) and, on a 429, waits for CMC's per-minute reset and retries once before returning the 429 to the caller. The client takes it via the optional `rateLimiter` option. Offline consumer specs don't pass one, so they stay instant.
- `tests/helpers/cmc.ts` holds one `cmcRateLimiter` per process (25 req/min, override with `CMC_REQUESTS_PER_MINUTE`), shared by `createCmcClient()` and the provider contract helper `cmcRawGet()`. Never call `new CoinMarketCapClient` in a live spec.
- The `api`, `contract` and `btc-price` projects run with `workers: 1` and a 90s test timeout, so one limiter paces the whole run and a wait for the reset fits in the timeout.
- The suite can keep growing, at about 2.4s per live request. To keep it fast, share one memoized call among tests that assert on the same response (`fullIdRangeEntries()` in `quotes-latest.spec.ts`), and put checks that don't need live data in offline consumer contract specs.

### Contract tests (`tests/contract/`)

`src/clients/coinmarketcap/schemas.ts` holds a zod schema per raw response the client parses (plus the shared status/error envelope). The raw types in `types.ts` are `z.infer` of these, so schema and types can't drift. The client doesn't validate at runtime. Schemas list only the fields the client reads, and unknown keys are ignored. Contract specs import `schemas.ts` directly. This is a deliberate test-only exception to the barrel, which still doesn't export raw shapes.

- `provider/` (live, needs `CMC_API_KEY`) GETs each endpoint via Playwright's `request` fixture, bypassing the client, and validates the raw body. A failure means CMC changed the API. Gainers-losers is plan-gated on the Basic key, so only its 403/1006 and 401 envelopes are checked live.
- `consumer/` (offline) stubs `globalThis.fetch` with a fixture from `fixtures/` and runs the real client. It asserts three things: the request (path, snake_case params, key header), the exact domain mapping, and error-envelope handling. Each fixture is itself schema-checked.
- Shared values (base URL, key header, dummy/invalid keys, error code 1001) live in `helpers/constants.ts`; provider specs read the key via `requireEnv('CMC_API_KEY')`.
- Fixtures were recorded live (2026-10-06; the v3 quotes/latest ones 2026-10-13) and trimmed. `gainers-losers.success.json` is hand-built from CMC's docs. Re-record them when a provider spec flags drift and the schema is updated.
- Known quirks the schemas encode:
  - `status.error_code` is a number on quotes/latest and gainers-losers, but a numeric string on simple/price.
  - quotes/latest returns every coin sharing a symbol, and only the first (canonical) entry is guaranteed a non-null price.

### Performance baseline (`tests/perf/`)

`cmc-latency.k6.ts` is a [k6](https://grafana.com/docs/k6/) script, not a Playwright spec. The `.k6.ts` suffix keeps Playwright from collecting it. It measures latency and error rate on simple/price and quotes/latest. It doesn't load-test: the Basic key is capped at 30 req/min, so it sends 10 req/min per endpoint for 3 minutes (60 credits per run). Thresholds are named constants at the top of the file: per-endpoint p95/p99, zero failed requests, and checks rate. A single HTTP 429 aborts the run. Breaching a threshold makes k6 exit non-zero. k6 bundles the TS itself and imports the base URL and header from `tests/contract/helpers/constants.ts`. `@types/k6` is installed only for `tsc`/ESLint. k6 reads `CMC_API_KEY` from the OS environment, not `.env`, so export it before running locally. `handleSummary` writes `perf-results/summary.{md,json}` (gitignored). It also writes Allure results to `allure-results/perf/` via `allureResults.ts`, since k6 has no Allure reporter: one test per k6 threshold (7 today, read from the summary's `thresholds`, so adding a threshold adds a test and needs a `minTestsCount` bump), failed when the threshold is breached, with the observed stats as steps and the Markdown table attached. `.github/workflows/perf-tests.yml` runs it daily at 03:15 UTC (plus `workflow_dispatch`), offset from api-tests so the two don't share the per-minute cap. It wraps k6 in `allure run` with `ALLURE_SUITE=perf`, publishes the report to gh-pages `perf/`, posts the Markdown table as the job summary and uploads `perf-results/` as an artifact.

### E2E test pattern (`tests/e2e/`)

Standard Playwright Page Object Model conventions apply; see the `e2e-testing` skill (`.claude/skills/e2e-testing/SKILL.md`) for structuring page objects, config, CI/CD, artifacts, and flaky-test strategies.

### Playwright config

`globalSetup` runs the self-healing BTC price window (below) before every test session, regardless of which `--project` is selected, unless `SKIP_BTC_PRICE_HEAL` is set (as `test:contract` and the CI contract step do, keeping consumer contract runs offline). The `btc-price` project is split out from `api` so the heal workflow can run it in isolation.

### CoinBoard demo app (`app/`)

A Vite + React + TypeScript app, built as a target for Playwright UI tests and served at https://nknysh.github.io/cmc-tests/app/. It has its own `package.json`, lockfile and `tsconfig.json` (`cd app && npm run dev` / `npm run build` / `npm run typecheck`). The root ESLint config lints it too.

- **Data:** the browser never calls CMC; the repo is public, so the key can't ship to it. `scripts/snapshot-listings.ts` (`npm run snapshot -- <outDir> [previousHistory]`) makes one `fetchListingsLatest({ limit: 100 })` call (1 credit) through the client and writes `latest.json` (a `MarketSnapshot`) plus `history.json` (rolling 7 days of prices for the chart). Per APP-06, a snapshot with any price of 0 or below is rejected whole: it's logged, nothing is written, and the step still succeeds with output `accepted=false`. An accepted run also writes `previous.json`/`previous-history.json`, copies of the confirmed snapshot. The app falls back to them if a published `latest.json` has an invalid price anyway, and only the script writes them. The price check (`isValidPrice`, `findInvalidPrices`) lives in `app/src/data/validate.ts`, shared by the script and the app. The data types live in `app/src/data/types.ts` and are shared by the script and the app. Total market cap and BTC dominance are derived from each coin's `market_cap_dominance`, so no global-metrics call is needed. Logos come from CMC's static CDN by coin id.
- **Fixtures:** `app/public/data/*.json` are committed. `latest.json` is a real snapshot (2026-10-15); `history.json` is synthetic and deterministic, ending at each coin's price. Dev and preview run on them with no key, and UI tests can `page.route('**/data/latest.json', …)` to pin data.
- **Deploy:** `.github/workflows/app-deploy.yml` runs daily at 06:00 UTC (09:00 EEST), on pushes touching the app, the script or the client, and on `workflow_dispatch`. It restores the deployed data from gh-pages, builds history from the confirmed `previous-history.json` (falling back to `history.json` on older deploys), snapshots over the fixtures, builds and publishes to gh-pages `app/` in the shared `gh-pages-publish` concurrency group. After a rejected snapshot it rebuilds with the deployed data, never the fixtures. If nothing has been deployed yet, it publishes nothing. The first deploy has a single history point, so its charts say "Not enough price history yet" until the next run. With one point a day, the 24h range holds at most two points, and the freshness badge turns stale after 26h.
- **Test-friendly choices:** fixed `en-US` formatting with chart times in UTC; chart ranges measured from the snapshot time, not the clock; roles and labels first, with `data-testid` only for values with no role (`result-count`, `stat-*`, `freshness`, `coin-price`, `price-chart`, `chart-tooltip`, `conversion-result`, `portfolio-total`, `portfolio-change`); dialog contents render only while open; localStorage keys are in `STORAGE_KEYS` (`app/src/lib/storage.ts`). Markets filters live in the URL hash query, but `useMarketQuery` keeps them in local state first, because React Router applies URL updates as transitions and a controlled checkbox would otherwise briefly revert, failing Playwright's `check()`.

### CoinBoard UI tests (`tests/coinboard/`)

Playwright specs for the CoinBoard app, one spec per user story, all in `specs/` (`specs/CMP-01-….spec.ts`), automating the story's `.test.md` cases one test each, with the same titles and severities. They run in the `coinboard` project. With `ALLURE_SUITE=coinboard` (set by `test:coinboard`) and no `COINBOARD_URL`, the config starts the app's Vite dev server as `webServer` on port 5173. Other suites never start it, because their CI jobs don't install `app/` dependencies. `test:coinboard` also sets `SKIP_BTC_PRICE_HEAL`, so the run makes no live CMC calls.

- `fixtures.ts` serves a snapshot as `data/latest.json` for every test via `page.route`: the committed fixture by default, or a stub with `test.use({ snapshot })`. Stub builders (`withoutCoin`, `withoutCoinReranked`, `withTopTwoSwapped`) live in `data/snapshot.ts`. They change both the array order and `rank`, because the app lists coins in array order.
- Page objects live in `pages/` and are provided as fixtures (`comparePage`).
- The `page` fixture fails a test on any uncaught page error or `console.error` from the app, even when every assertion passed, and attaches the errors as `browser errors`. A test that expects some declares them with `test.use({ expectedBrowserErrors: [/…/] })`.
- `.github/workflows/coinboard-tests.yml` runs the whole project on pushes to `main` and on pull requests touching the app, `tests/coinboard`, the shared test helpers or the Playwright/Allure config, plus `workflow_dispatch`. It wraps the run in `allure run` with `ALLURE_SUITE=coinboard` and uploads the Playwright report and `test-results/`. Except on pull requests, it publishes the Allure report to gh-pages `coinboard/`. Pull requests don't join the `gh-pages-publish` concurrency group.

### Self-healing BTC price window (`.agents/btc-price-window/`)

`tests/api/btc-price.spec.ts` asserts live BTC price falls within a `[min, max]` window persisted in `.agents/btc-price-window/btc-price-window.json` (read/written via `btcPriceWindow.ts`), rather than a hardcoded range — BTC price drifts too much for a fixed threshold to stay meaningful.

- `self-heal-btc-price-window.ts` is wired as Playwright's `globalSetup`. On every run it fetches the live price; if it falls outside the current window it computes a recentred window (same width, shifted to the new price), then checks the recentring in code before writing anything: the price must be a positive number, the bounds and width must be intact, and the price must be within `MAX_SHIFT_RATIO` (10%) of the current window's centre. These checks used to go to the local-model auditor, which got the arithmetic wrong and blocked valid recentrings. Only when every check passes does it write the updated JSON and commit. Otherwise it leaves the existing window untouched, logs why (also to the job summary) and exits non-zero, so a genuinely out-of-bounds price surfaces as an ordinary test failure instead of a bad recentring being silently accepted. In CI, where there's no configured git identity, it scopes the repo owner's identity to that one commit rather than touching any configured identity.
- `.github/workflows/btc-price-window-heal.yml` runs this every 4 hours via cron (plus `workflow_dispatch`), executing `npx playwright test --project=btc-price` (which triggers the same `globalSetup` heal) and pushing the commit if the window changed.
- Net effect: the window self-adjusts to track price drift instead of the test needing manual threshold updates.

A separate daily script heals `tests/e2e/pages/CoinMarketCapHomePage.ts` locators with a local LLM, then runs the shared local-model auditor (`.agents/self-heal-commit-auditor/`, see its `CLAUDE.md`) on its own proposed patch before committing; details load from `.agents/coinmarketcap-navigation/CLAUDE.md` when working there. The auditor can veto the commit outright, since the script commits with `--no-verify` and would otherwise bypass the pre-commit review hook entirely. The BTC window heal also commits with `--no-verify`, gated by its code checks instead.

## Git commits

Never commit or push without asking first. Wait for an explicit request each time; approval for one commit or push doesn't carry over to the next.

Do not add a `Co-Authored-By: Claude` trailer to commit messages — commits should read as authored solely by the user.

## Skills

**Always use the user's global skills (`~/.claude/skills/`) when writing or updating tests, wherever one applies.** Load the matching skill before you start and follow its workflow, including any step where it asks for approval. Examples: `qa-thinking` and `qa-write-test-cases` before designing new cases, `automate-manual-test-cases` to automate cases from `data/test-cases.db`, `qa-split-testing-levels-pyramid` to choose live API vs offline contract, `detect-useless-tests` / `detect-duplicate-test-cases` / `qa-automation-test-consolidation` before removing or merging tests, and `debug-fix-failed-flaky-autotests` for failing or flaky specs. The local skills below still govern how this repo's code is written.

Skills live in `.claude/skills/` (sources tracked in `skills-lock.json`):
- `api-testing` (local, `.claude/skills/api-testing/SKILL.md`) — client/API-test conventions described above.
- `test-design` (local, `.claude/skills/test-design/SKILL.md`) — what to test and how to structure specs.
- `e2e-testing` (from `affaan-m/ECC` on GitHub, locally modified) — Playwright E2E patterns.
- `typescript-code-review` (from `anyproto/anytype-ts`, locally modified; symlinked from `.agents/skills/typescript-code-review/`) — used by the pre-commit review hook.

A `playwright` MCP server (`@playwright/mcp`) is configured in `.mcp.json` for browser automation from Claude Code itself.
