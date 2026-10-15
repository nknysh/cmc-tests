---
name: e2e-testing
description: Playwright E2E testing patterns for Playwright 1.64+, covering locators, Page Object Model, fixtures, web-first and aria assertions, network/time control, configuration, test locks, CI/CD, artifacts, and flaky-test strategies. Use when writing Playwright tests, structuring page objects, or fixing flaky E2E runs in CI.
metadata:
  origin: ECC
---

# E2E Testing Patterns

Patterns for stable, fast, maintainable Playwright suites. This repo is on
**Playwright 1.64**. Features marked *(1.xx+)* need at least that version, so
check `npx playwright --version` before suggesting one elsewhere.

## Contents

Read the whole file before writing or fixing E2E tests; each section below applies.

- [Test File Organization](#test-file-organization)
- [Locators](#locators)
- [Page Object Model (POM)](#page-object-model-pom)
- [Test Structure](#test-structure)
- [Assertions](#assertions)
- [Tags](#tags)
- [Network and Time Control](#network-and-time-control)
- [Playwright Configuration](#playwright-configuration)
- [Shared Resources and Test Locks](#shared-resources-and-test-locks)
- [Flaky Test Patterns](#flaky-test-patterns)
- [Artifact Management](#artifact-management)
- [Debugging](#debugging)
- [CI/CD Integration](#cicd-integration)
- [Test Report Template](#test-report-template)
- [Wallet / Web3 Testing](#wallet--web3-testing)
- [Financial / Critical Flow Testing](#financial--critical-flow-testing)

## Test File Organization

```
playwright.config.ts          # repo root; projects: api, contract, btc-price, e2e
tests/
├── api/                      # live API specs (no browser) - see the api-testing skill
├── contract/                 # provider/consumer contract specs (no browser)
└── e2e/
    ├── pages/                # page objects, e.g. CoinMarketCapHomePage.ts
    └── navigation/           # E2E specs, grouped by feature
app/                          # CoinBoard demo app, a UI-test target (see CLAUDE.md)
```

## Locators

Pick the first option that uniquely identifies the element, the way a user
would find it:

1. `getByRole('button', { name: 'Save' })`. Add `description` *(1.60+)* to match
   the accessible description when names repeat.
2. `getByLabel`, `getByPlaceholder`, `getByText`, `getByAltText`, `getByTitle`.
3. `getByTestId` for values with no role or label.
4. CSS/attribute selectors only when the page offers nothing better, e.g. the
   live CoinMarketCap site's `data-test`/`data-index` attributes.

Modern helpers:

```typescript
// Only visible matches (1.63+). Replaces the `:visible` CSS pseudo-class.
await page.getByRole('button', { name: 'Menu' }).visible().click()

// Search every frame without locating the iframe first (1.63+).
await page.frameLocator().getByRole('button', { name: 'Accept' }).click()

// Readable names in traces and reports (1.53+).
const tabs = page.locator('li[data-role="Tab"]').describe('homepage nav tabs')
```

Notes:
- `getByLabel` also matches `aria-label`, and by substring: `getByLabel('To')`
  matches a "Switch to dark theme" button. Use `{ exact: true }`, a role, or
  scope it with `within` (below).
- Role queries skip hidden elements; `getByLabel`/`getByText` don't. A closed
  `<dialog>` that's still in the DOM can make them ambiguous; scope to the open
  dialog with `within`.
- Since 1.64, elements inside a hidden iframe count as hidden.

### Scoping with `within()` *(1.64+)*

`child.within(parent)` matches `child` inside each element `parent` matches.
It takes a `Locator`, not a selector string. Reach for it whenever a locator
needs a container:

1. **The same control appears in several places** (a Save button on the page
   and in a dialog, Edit/Remove in every row, a field with the same label in two
   forms). Scope it instead of using `exact`, `nth()` or a test id.
2. **A per-row or per-card value: a column.** `nth()`, `first()` and `last()`
   resolve separately inside each parent, so one locator covers the whole
   column. Chaining can't do this: `rows.getByRole('cell').nth(1)` picks the
   second cell of the *whole* table, a single element.
3. **Both locators already exist**, e.g. page-object fields or shared
   constants. Combine them without rebuilding either one, and reuse one child
   locator across several containers (the same `price` locator in a table row
   and in a mobile card).

```typescript
// 1. Disambiguate a repeated control.
const dialog = page.getByRole('dialog', { name: 'Edit Bitcoin' })
const save = page.getByRole('button', { name: 'Save' })
await save.within(dialog).click()

// 1. A row action: the Edit button in Bitcoin's row only.
// `exact`: a plain hasText 'Bitcoin' would also match "Bitcoin Cash".
const bitcoinRow = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Bitcoin', exact: true }) })
await page.getByRole('button', { name: /^Edit/ }).within(bitcoinRow).click()

// 2. A whole column, one cell per row: assert sort order in one line.
const rows = page.getByRole('table', { name: 'Cryptocurrencies' }).getByRole('row')
const nameColumn = page.getByRole('cell').nth(2).within(rows) // cells: star, rank, name, …
await expect(nameColumn).toHaveText([/^Bitcoin/, /^Ethereum/, /^Tether/]) // header row has no cells

// 2. One cell of one row: positional within a single parent.
await expect(page.getByRole('cell').nth(2).within(bitcoinRow)).toHaveText(/\$/)

// 3. Reuse one child locator across containers.
const price = page.getByTestId('price')
await expect(price.within(page.getByRole('table'))).toHaveCount(25)
await expect(price.within(page.getByRole('list', { name: 'Watchlist' }))).toHaveCount(1)
```

When to chain instead: if you're writing a fresh one-off locator under a
single container you already hold, `dialog.getByRole('button', { name: 'Save' })`
is equivalent and reads fine. Use `within` for the three cases above, and
whenever the chained form would put `nth()`/`first()`/`last()` after a
multi-element parent. On Playwright older than 1.64, fall back to
`parent.locator(child)` (no per-parent positions) or `parent.filter({ has: child })`.

Traces and errors print `within` as
`getByRole('dialog').locator(getByRole('button', { name: 'Save' }))`, so look
for that shape when reading a failure.

## Page Object Model (POM)

Page objects expose locators and user-level actions. They don't assert, and
they wait for something meaningful, never `networkidle` (banned by this repo's
ESLint config: `playwright/no-networkidle`).

```typescript
import type { Locator, Page } from '@playwright/test'

export class MarketsPage {
  readonly heading: Locator
  readonly search: Locator
  readonly table: Locator
  readonly rows: Locator
  /** One name cell per row, in table order (cells: star, rank, name, price, …). */
  readonly nameColumn: Locator
  readonly priceColumn: Locator
  readonly resultCount: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Cryptocurrency prices by market cap' })
    this.search = page.getByRole('searchbox', { name: 'Search' })
    this.table = page.getByRole('table', { name: 'Cryptocurrencies' })
    // Includes the header row; columns below skip it, because it has no `cell`s.
    this.rows = page.getByRole('row').within(this.table).describe('coin rows')
    this.nameColumn = page.getByRole('cell').nth(2).within(this.rows).describe('name column')
    this.priceColumn = page.getByRole('cell').nth(3).within(this.rows).describe('price column')
    this.resultCount = page.getByTestId('result-count')
  }

  async goto() {
    await this.page.goto('/')
    await this.heading.waitFor()
  }

  /** The table row for one coin, by symbol: names collide ("Bitcoin" is a substring of "Bitcoin Cash"). */
  row(symbol: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('link', { name: new RegExp(` ${symbol}$`) }) })
  }

  async toggleWatchlist(symbol: string) {
    // Every row has a star: scope the button to this coin's row.
    await this.page.getByRole('button', { name: /watchlist$/ }).within(this.row(symbol)).click()
  }

  async searchFor(query: string) {
    await this.search.fill(query)
    // The app updates the URL after a debounce: wait for that, not a timeout.
    await this.page.waitForURL(/[?&]q=/)
  }
}
```

Define container locators (tables, dialogs, cards) once, and derive rows,
columns and per-row controls from them with `within`, as above. Then no page
object method needs `nth()` on a flattened list, and a row-level action can't
hit another row's control.

Provide page objects as fixtures rather than building them in `beforeEach`:

```typescript
// tests/e2e/fixtures.ts
import { test as base } from '@playwright/test'
import { MarketsPage } from './pages/MarketsPage'

export const test = base.extend<{ markets: MarketsPage }>({
  markets: async ({ page }, use) => {
    const markets = new MarketsPage(page)
    await markets.goto()
    await use(markets)
  },
})
export { expect } from '@playwright/test'
```

## Test Structure

```typescript
import { test, expect } from '../fixtures'

test.describe('Market search', { tag: '@search' }, () => {
  test('filters coins by name or symbol', async ({ markets }) => {
    await test.step('search', async () => markets.searchFor('eth'), {
      subtitle: 'partial symbol', // shown next to the step title (1.63+)
      params: { query: 'eth' }, // structured data for reporters (1.63+)
    })

    await expect(markets.resultCount).toHaveText(/^\d+ coins?$/)
    // Every remaining row matches: check the whole column (web-first), not just the first row.
    await expect(markets.nameColumn.first()).toBeVisible()
    await expect(markets.nameColumn.filter({ hasNotText: /eth/i })).toHaveCount(0)
  })

  test('sorts by price, highest first', async ({ markets, page }) => {
    await page.getByRole('button', { name: 'Price' }).click()
    await expect(markets.nameColumn.first()).toHaveText(/^Bitcoin/)
  })

  test('shows an empty state for no matches', async ({ markets, page }) => {
    await markets.searchFor('xyznonexistent123')
    await expect(page.getByText('No coins match your filters.')).toBeVisible()
  })
})
```

- One behavior per test. Declare an Allure severity on every test or its
  describe (see the `test-design` skill).
- Steps accept `timeout` *(1.50+)*, and `test.step.skip()` disables one.

## Assertions

Use web-first assertions (`await expect(locator)...`): they retry until the
timeout. Never assert on a one-shot read such as `await locator.count()`
(lint: `playwright/prefer-web-first-assertions`).

```typescript
await expect(rows).toHaveCount(25)
await expect(markets.priceColumn).toHaveCount(25) // one per row, via within
await expect(markets.nameColumn).toHaveText([/^Bitcoin/, /^Ethereum/, /^Tether/]) // whole column in order
await expect(badge).toContainClass('stale') // one class among several (1.52+)
await expect.poll(() => tabs.count()).toBeGreaterThanOrEqual(11) // non-locator values
await expect.soft(price).toHaveText(/\$/) // keep going and report every failure

// Structure, not pixels: aria snapshots. Page-level works too (1.60+).
await expect(page.getByRole('navigation', { name: 'Main' })).toMatchAriaSnapshot(`
  - list:
    - listitem: - link "Markets"
    - listitem: - link "Converter"
`)
```

Visual comparisons: `await expect(page).toHaveScreenshot('home.webp')` stores
lossless WebP *(1.62+)*. Set `expect: { toHaveScreenshot: { type: 'webp' } }`
to make WebP the default for unnamed shots *(1.64+)*. Since 1.64,
`--update-snapshots=missing` passes the run, so CI can create new baselines and
check existing ones in one go.

## Tags

Tag `describe` blocks (and individual tests, for finer-grained filtering)
with a short `@name`, so CI or a local run can select a slice without editing
the file:

```typescript
test.describe('Item Search', { tag: '@search' }, () => {
  test('handles slow network', { tag: '@flaky' }, async ({ page }) => {
    // tags on an individual test add to, not replace, the describe's tags
  })
})
```

```bash
npx playwright test --grep @search
npx playwright test -G @flaky      # --grep-invert shorthand (1.61+)
```

`testConfig.tag` *(1.57+)* tags every test in a run, which helps tell runs
apart after `merge-reports`.

## Network and Time Control

Make UI tests deterministic by owning the data and the clock.

```typescript
// Serve a fixture instead of live data (CoinBoard reads data/latest.json).
await page.route('**/data/latest.json', (route) => route.fulfill({ path: 'tests/ui/fixtures/latest.json' }))

// Exercise the error state.
await page.route('**/data/latest.json', (route) => route.fulfill({ status: 500 }))

// Freeze time for "updated 12 min ago" / staleness logic.
await page.clock.setFixedTime(new Date('2026-10-15T15:24:00Z'))
await page.clock.fastForward('27:00:00') // with clock.install(), runs timers too
```

- Replay recorded traffic with `page.routeFromHAR()`. Since 1.60, tracing can
  record a HAR.
- `page.addInitScript()` and `page.evaluate()` accept functions as arguments
  *(1.62+)*.
- Seed localStorage with `storageState`, or with `addInitScript` before `goto`.

## Playwright Configuration

This repo's config is [playwright.config.ts](../../../playwright.config.ts) at the
repo root: one config and four projects (`api`, `contract`, `btc-price`, `e2e`).
Only `e2e` launches a browser (Desktop Chrome). There is no `webServer`: E2E
specs hit the live CoinMarketCap site. Shared defaults already set under `use`:

```typescript
use: {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  actionTimeout: 10000,
  navigationTimeout: 30000,
},
```

Reporters are `html`, `list` and `allure-playwright` (results under
`allure-results/<ALLURE_SUITE>/`), plus `json` when
`PLAYWRIGHT_JSON_OUTPUT_NAME` is set. Add a new browser suite as another
project rather than a second config file. Every test declares an Allure
severity via `severity()` from `tests/helpers/severity.ts` (the navigation
suite sets `critical` on its `test.describe`); see the `test-design` skill.

Newer options worth reaching for:

```typescript
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  retryStrategy: 'isolated', // run retries at the end, one at a time (1.62+)
  failOnFlakyTests: !!process.env.CI, // a pass-on-retry fails the run (1.52+)
  use: {
    reducedMotion: 'reduce', // standalone option (1.63+); kills animation flake
    trace: { mode: 'retain-on-failure-and-retries', snapshots: { dom: true, aria: true, screen: true } }, // (1.59+ / 1.63+)
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    // Configured but skipped unless selected: --project=firefox or --project="*" (1.64+)
    { name: 'firefox', use: devices['Desktop Firefox'], default: false },
  ],
})
```

Breaking in 1.64: device descriptors now forward `screen`, so `window.screen`
and `device-width` media queries see the emulated size. Set `screen: undefined`
to opt out.

## Shared Resources and Test Locks

Tests that touch one shared resource (an account setting, a rate-limited key,
a single test user) can declare a named lock *(1.63+)*. Tests holding the same
lock never run concurrently, across files, workers and projects. Everything
else stays parallel, which is better than forcing the whole project to
`workers: 1`.

```typescript
test('updates user settings', { lock: 'user-settings' }, async ({ page }) => { /* ... */ })

test.describe('Settings', () => {
  test.describe.configure({ lock: 'user-settings' }) // whole group (1.64+)
})
```

In this repo the live CMC projects still use `workers: 1` plus one shared
`RateLimiter`, because every live call shares the key's per-minute budget.

## Flaky Test Patterns

### Identify flakiness

```bash
npx playwright test tests/e2e/navigation --repeat-each=10
npx playwright test --shuffle            # random order exposes order dependence (1.64+)
npx playwright test --shuffle 271828182  # replay a failing order by its seed
npx playwright test --fail-on-flaky-tests
```

### Quarantine

```typescript
test('complex search', { tag: '@flaky' }, async ({ page }) => {
  test.fixme(true, 'Flaky - Issue #123') // reports as fixme, shows where it was added (1.54+)
})
```

Don't use `test.skip`: `playwright/no-skipped-test` is an error in this repo.
Quarantine with `fixme` and a tracked issue.

### Common causes and fixes

**Hard waits.** `waitForTimeout` and `networkidle` are lint errors here. Wait for
the condition the user would see:

```typescript
// Bad
await page.waitForTimeout(5000)
// Good
await expect(page.getByRole('table', { name: 'Cryptocurrencies' })).toBeVisible()
await page.waitForResponse((r) => r.url().includes('/data/latest.json') && r.ok())
```

**Animations.** Use `reducedMotion: 'reduce'` instead of waiting for them to finish.

**Controlled inputs updated asynchronously.** `check()` verifies the state right
after its click. If the app updates the control in a React transition (e.g.
React Router search params), it can briefly revert and `check()` throws
"Clicking the checkbox did not change its state". Fix the app (update local
state synchronously) rather than adding retries. As a stopgap, use `click()`
then `await expect(box).toBeChecked()`.

**Order dependence.** Shared storage or server state between tests: give each
test its own context/storage, and find culprits with `--shuffle`.

**Cancelling a long wait.** Most actions and assertions accept an `AbortSignal`
*(1.62+)*. A signal doesn't disable the timeout; add `timeout: 0` for that.

## Artifact Management

### Screenshots

```typescript
await page.screenshot({ path: 'artifacts/after-login.png' })
await page.screenshot({ path: 'artifacts/full.webp', fullPage: true, quality: 60 }) // lossy WebP (1.62+)
await page.getByTestId('price-chart').screenshot({ path: 'artifacts/chart.png' })
```

### Traces

The config records a trace on the first retry (`trace: 'on-first-retry'`).
`'retain-on-failure-and-retries'` *(1.59+)* keeps every attempt of a failing
test, so you can compare a passing trace with a failing one. With
`snapshots: { aria: true, screen: true }` *(1.63+)*, the trace viewer's
**Display Aria** mode shows the aria tree beside each screenshot. Open a trace
with `npx playwright show-trace <trace.zip>`.

### Video

```typescript
use: {
  video: {
    mode: 'retain-on-failure',
    size: { width: 1280, height: 720 },
    fps: 30, // (1.64+); Firefox/WebKit cap at 25
    show: { actions: { style: { highlight: 'outline: 2px solid #f00' } } }, // CSS styling (1.64+)
  },
}
```

Videos are VP9 since 1.64, and `fontSize` is deprecated in favor of `style`.
They land under `outputDir` (default `test-results/`).

## Debugging

- `npx playwright test --ui` or `--debug` locally; `npx playwright show-report`
  for the HTML report, which has a step-duration waterfall since 1.63.
- Collect browser errors without listeners: `page.consoleMessages()` and
  `page.pageErrors()` *(1.56+)*.
  `expect(await page.pageErrors()).toEqual([])` makes a cheap smoke check.
- Playwright bundles its MCP server and CLI *(1.62+)*: `npx playwright mcp`,
  `npx playwright cli`. This repo also has the `playwright` MCP server in
  `.mcp.json` for live DOM inspection.
- `page.ariaSnapshot({ mode: 'ai' })` returns refs like `e2`, which
  `page.getByRef('e2')` turns back into a locator *(1.64+)*. Use it for
  exploration, not in committed specs.
- `--add-reporter <name>` *(1.63+)* adds a reporter without replacing the
  configured ones. The `perfetto` reporter *(1.63+)* renders the run as a
  per-worker timeline.

## CI/CD Integration

Follow this repo's workflow conventions (see CLAUDE.md, "No new lint or Sonar
issues"): `npm ci --ignore-scripts`, tools via `./node_modules/.bin/`, and
third-party actions pinned to a SHA.

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci --ignore-scripts
      - run: ./node_modules/.bin/playwright install --with-deps chromium
      - run: ./node_modules/.bin/allure run -- ./node_modules/.bin/playwright test --project=e2e
        env:
          ALLURE_SUITE: navigation
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

- Projects marked `default: false` only run when selected. On CI, pass
  `--project="*"` to run all of them.
- `npx playwright install --no-remove` *(1.63+)* keeps other installs' browsers
  on shared runners.

## Test Report Template

```markdown
# E2E Test Report

**Date:** YYYY-MM-DD HH:MM
**Duration:** Xm Ys
**Status:** PASSING / FAILING

## Summary
- Total: X | Passed: Y (Z%) | Failed: A | Flaky: B | Skipped: C

## Failed Tests

### test-name
**File:** `tests/e2e/feature.spec.ts:45`
**Error:** Expected element to be visible
**Trace:** test-results/<test>/trace.zip
**Recommended Fix:** [description]

## Artifacts
- HTML Report: playwright-report/index.html
- Allure: allure-report/<suite>/index.html
- Videos: test-results/**/*.webm
- Traces: test-results/**/trace.zip
```

## Wallet / Web3 Testing

Stub the injected provider before the page loads. Init scripts accept
arguments *(1.62+)*, so test data stays out of the stub:

```typescript
test('connects a wallet and shows the address', async ({ page }) => {
  await page.addInitScript(
    ({ account, chainId }) => {
      ;(window as unknown as { ethereum: unknown }).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') return [account]
          if (method === 'eth_chainId') return chainId
          return null
        },
      }
    },
    { account: '0x1234567890123456789012345678901234567890', chainId: '0x1' },
  )

  await page.goto('/')
  await page.getByRole('button', { name: 'Connect wallet' }).click()
  await expect(page.getByTestId('wallet-address')).toContainText('0x1234')
})
```

## Financial / Critical Flow Testing

Never run real-money flows against production. Guard with an environment check
in config (a separate project, or `grepInvert` on a `@real-money` tag) rather
than `test.skip`, which is banned here.

```typescript
test('completes a trade and confirms success', { tag: '@real-money' }, async ({ page }) => {
  await page.goto('/markets/test-market')
  await page.getByRole('button', { name: 'Yes' }).click()
  await page.getByLabel('Amount', { exact: true }).fill('1.0')
  await expect(page.getByTestId('trade-preview')).toContainText('1.0')

  const trade = page.waitForResponse((r) => r.url().includes('/api/trade') && r.ok(), { timeout: 30_000 })
  await page.getByRole('button', { name: 'Review trade' }).click()
  // "Confirm" also appears elsewhere on the page: press the one in the review dialog.
  const review = page.getByRole('dialog', { name: 'Review trade' })
  await page.getByRole('button', { name: 'Confirm' }).within(review).click()
  await trade

  await expect(page.getByRole('status')).toHaveText(/trade (placed|confirmed)/i)
})
```
