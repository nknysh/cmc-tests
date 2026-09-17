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
npm run test:api      # run only tests/api
npm run test:ui       # Playwright UI mode
npm run test:headed   # run headed (visible browser)
npm run test:report   # open the last HTML report
npx playwright test tests/api/btc-price.spec.ts   # run a single file
npx playwright test -g "BTC price is above threshold"  # run a single test by title
npx tsc --noEmit      # type-check without emitting
```

There is no lint script configured.

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
- Declares threshold/expected-value constants at the top of the file, named and explicit, rather than inlined into assertions.
- One `test()` per behavior, asserting on the client's domain type (not the raw response).

### E2E test pattern (`tests/e2e/`)

Standard Playwright Page Object Model conventions apply; see the `e2e-testing` skill (`.claude/skills/e2e-testing` → `.agents/skills/e2e-testing/SKILL.md`) for structuring page objects, config, CI/CD, artifacts, and flaky-test strategies.

### Playwright config

Single `chromium` project, `fullyParallel: true`, retries/workers adjust based on `CI` env var, `testDir` covers both `tests/api` and `tests/e2e`. Reporters: HTML (`playwright-report/`) + list.

## Git commits

Do not add a `Co-Authored-By: Claude` trailer to commit messages — commits should read as authored solely by the user.

## Skills

This repo has local skills wired up via `skills-lock.json` and symlinked into `.claude/skills/`:
- `api-testing` (local, `skills/api-testing/SKILL.md`) — client/API-test conventions described above.
- `e2e-testing` (from `affaan-m/ECC` on GitHub) — Playwright E2E patterns.

A `playwright` MCP server (`@playwright/mcp`) is configured in `.mcp.json` for browser automation from Claude Code itself.
