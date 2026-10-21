import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import type { Page, Route } from '@playwright/test'
import { test, expect } from '@tests/coinboard/fixtures'
import { fixtureSnapshot, withCoinChanged } from '@tests/coinboard/data/snapshot'
import { countRequests, Gate, HISTORY_FIXTURE_PATH, routeDataFile } from '@tests/coinboard/data/routes'
import type { AppShell } from '@tests/coinboard/pages/AppShell'
import { Severity, severity } from '@tests/helpers/severity'

// Automates app/user-stories/app-shell/APP-03-market-data-load-failure-can-be-retried.test.md:
// one test per test case, with the same title and severity. Table-driven cases run as one test
// per row, their title suffixed with the row.

const LOAD_ERROR = 'Couldn\'t load market data'
const PAGE_ERROR = 'Something went wrong'
const PAGE_ERROR_REASON = 'This page couldn\'t be shown.'
const TIMEOUT_REASON = 'The server took too long to respond'
const MARKETS_HEADING = 'Cryptocurrency prices by market cap'
const FALLBACK_WARNING = 'latest.json is corrupt; showing the previous snapshot instead'

// The app times a load out after 30 s (AC-2); the timeout cases check either side of it.
const STILL_LOADING_MS = 25_000
const TIMED_OUT_BY_MS = 35_000
const FALLBACK_TIMEOUT_WINDOW_MS = { min: 29_000, max: 33_000 }
const SLOW_LATEST_MS = 20_000

// Chrome logs every failed request to the console as an error.
const FAILED_REQUEST = /Failed to load resource/

/** Bitcoin's name in the previous snapshot stub, so the coin page tells which snapshot it shows. */
const PREVIOUS_SNAPSHOT = withCoinChanged(fixtureSnapshot, 'bitcoin', { name: 'Bitcoin (previous)' })

/** The fixture with one field of one coin set to any value, including one of the wrong type. */
function withCoinField(slug: string, field: string, value: unknown) {
  return { ...fixtureSnapshot, coins: fixtureSnapshot.coins.map((coin) => (coin.slug === slug ? { ...coin, [field]: value } : coin)) }
}

const ADDRESS_ROWS = ['#/', '#/converter', '#/compare', '#/portfolio', '#/coin/bitcoin', '#/does-not-exist']

const STATUS_TEXT_ROWS = [
  { status: 404, reason: '404 Not Found' },
  { status: 503, reason: '503 Service Unavailable' },
  { status: 520, reason: '520 Error' },
]

/** Rows of the corrupt latest snapshot case: a label for the title, then the body served. */
const CORRUPT_ROWS = [
  { label: 'not valid JSON', body: '{"updatedAt": "2026' },
  { label: 'empty body', body: '' },
  { label: '{}', body: '{}' },
  { label: 'coins set to []', body: JSON.stringify({ ...fixtureSnapshot, coins: [] }) },
  { label: 'Bitcoin\'s name set to 123', body: JSON.stringify(withCoinField('bitcoin', 'name', 123)) },
  { label: 'updatedAt set to March 7', body: JSON.stringify({ ...fixtureSnapshot, updatedAt: 'March 7' }) },
  { label: 'Bitcoin\'s marketCap set to -1', body: JSON.stringify(withCoinChanged(fixtureSnapshot, 'bitcoin', { marketCap: -1 })) },
  { label: 'Ethereum\'s slug set to bitcoin', body: JSON.stringify(withCoinChanged(fixtureSnapshot, 'ethereum', { slug: 'bitcoin' })) },
]

/** Rows of the not-corrupt case: values real data has. */
const REAL_VALUE_ROWS = [
  { label: 'Ethereum\'s symbol set to BTC', snapshot: withCoinChanged(fixtureSnapshot, 'ethereum', { symbol: 'BTC' }) },
  { label: 'Bitcoin\'s totalSupply set to 1', snapshot: withCoinChanged(fixtureSnapshot, 'bitcoin', { totalSupply: 1 }) },
  { label: 'Bitcoin\'s maxSupply set to null', snapshot: withCoinChanged(fixtureSnapshot, 'bitcoin', { maxSupply: null }) },
]

/** A route handler answering with an HTTP status and an empty body. */
const withStatus = (status: number) => (route: Route) => route.fulfill({ status, body: '' })

/** A route handler that holds the request until `gate` is released, then answers with `answer`. */
const heldBy = (gate: Gate, answer: (route: Route) => Promise<void>) => async (route: Route) => {
  await gate.released
  await answer(route)
}

/** A route handler that never answers. */
const neverAnswer = () => undefined

const serveFixture = (route: Route) => route.fulfill({ json: fixtureSnapshot })

/** Routes previous.json and previous-history.json to the previous snapshot stub. */
async function servePreviousSnapshot(appShell: AppShell) {
  await routeDataFile(appShell.page, 'previous', (route) => route.fulfill({ json: PREVIOUS_SNAPSHOT }))
  await routeDataFile(appShell.page, 'previous-history', (route) => route.fulfill({ path: HISTORY_FIXTURE_PATH }))
}

/** Checks the error panel's heading, reason and button. */
async function expectErrorPanel(appShell: AppShell, heading: string, reason: string) {
  await expect(appShell.errorHeading).toHaveText(heading)
  await expect(appShell.errorReason).toHaveText(reason)
  await expect(appShell.errorPanel.getByRole('button')).toHaveText('Retry')
}

async function expectChromeVisible(appShell: AppShell) {
  for (const part of appShell.chrome()) await expect(part).toBeVisible()
}

/** Milliseconds from `start` until the placeholder disappears, waiting up to `timeout` from `start`. */
async function msUntilPlaceholderGone(appShell: AppShell, start: number, timeout: number): Promise<number> {
  await expect(appShell.placeholder).toBeHidden({ timeout: timeout - (Date.now() - start) })
  return Date.now() - start
}

/** The page's switch for the init script that makes `Number.prototype.toFixed` throw. */
interface CrashWindow extends Window {
  __crash?: boolean
}

/** Turns the forced crash on or off. Markets formats its percentages with `toFixed`. */
const setCrash = (page: Page, crash: boolean) =>
  test.step(`turn the forced crash ${crash ? 'on' : 'off'}`, () =>
    page.evaluate((on) => {
      (window as CrashWindow).__crash = on
    }, crash),
  )

test.describe('APP-03: Market data load failure can be retried', { tag: ['@app-shell', '@APP-03'] }, () => {
  // The theme cases start from a light color scheme; each test's fresh context has no saved theme.
  test.use({ colorScheme: 'light' })

  test.describe('while loading', () => {
    let gate: Gate

    test.beforeEach(async ({ page }) => {
      gate = new Gate()
      await routeDataFile(page, 'latest', heldBy(gate, serveFixture))
    })

    test('User sees a loading placeholder while market data loads', severity(Severity.CRITICAL), async ({ appShell }) => {
      await test.step('open / with latest.json held', async () => {
        await appShell.goto('#/')
        await expect(appShell.placeholder).toBeVisible()
        await expect(appShell.placeholder).toHaveAttribute('aria-busy', 'true')
        await expect(appShell.heading).toHaveCount(0)
        await expect(appShell.freshness).toHaveCount(0)
      })

      await test.step('release latest.json', async () => {
        gate.release()
        await expect(appShell.placeholder).toBeHidden()
        await expect(appShell.heading).toHaveText(MARKETS_HEADING)
      })
    })

    test('User can navigate and switch the theme while market data loads', severity(Severity.NORMAL), async ({ appShell, page }) => {
      await test.step('open / with latest.json held', async () => {
        await appShell.goto('#/')
        await expect(appShell.placeholder).toBeVisible()
        await expectChromeVisible(appShell)
      })

      await test.step('go to Converter', async () => {
        await appShell.navLink('Converter').click()
        await expect(page).toHaveURL(/#\/converter$/)
        await expect(appShell.placeholder).toBeVisible()
      })

      await test.step('switch to the dark theme', async () => {
        await expect(appShell.themeToggle).toHaveAccessibleName('Switch to dark theme')
        await appShell.themeToggle.click()
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
        await expect(appShell.themeToggle).toHaveAccessibleName('Switch to light theme')
      })

      await test.step('release latest.json', async () => {
        gate.release()
        await expect(appShell.heading).toHaveText('Converter')
      })
    })

    test('Unknown address shows the placeholder until market data loads, then Page not found', severity(Severity.MINOR), async ({ appShell }) => {
      await test.step('open an unknown address with latest.json held', async () => {
        await appShell.goto('#/does-not-exist')
        await expect(appShell.placeholder).toBeVisible()
        await expect(appShell.page.getByRole('heading', { name: 'Page not found' })).toHaveCount(0)
      })

      await test.step('release latest.json', async () => {
        gate.release()
        await expect(appShell.heading).toHaveText('Page not found')
      })
    })
  })

  test.describe('when latest.json is missing', () => {
    test.use({ expectedBrowserErrors: [FAILED_REQUEST] })

    test.beforeEach(async ({ page }) => {
      await routeDataFile(page, 'latest', withStatus(404))
    })

    for (const address of ADDRESS_ROWS) {
      test(`User sees Couldn't load market data with the reason and Retry on every address when latest.json is missing: ${address}`, severity(Severity.BLOCKER), async ({ appShell }) => {
        await appShell.goto(address)

        await expectErrorPanel(appShell, LOAD_ERROR, '404 Not Found')
        await expect(appShell.placeholder).toHaveCount(0)
        await expect(appShell.heading).toHaveCount(0)
        await expectChromeVisible(appShell)
      })
    }

    test('User can navigate and switch the theme after market data fails to load', severity(Severity.CRITICAL), async ({ appShell, page }) => {
      await test.step('open Converter', async () => {
        await appShell.goto('#/converter')
        await expect(appShell.errorPanel).toBeVisible()
        await expectChromeVisible(appShell)
      })

      await test.step('go to Compare', async () => {
        await appShell.navLink('Compare').click()
        await expect(page).toHaveURL(/#\/compare$/)
        await expectErrorPanel(appShell, LOAD_ERROR, '404 Not Found')
      })

      await test.step('switch to the dark theme', async () => {
        await appShell.themeToggle.click()
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      })

      // Checked rather than clicked, so the test doesn't leave for the live CoinMarketCap site.
      await test.step('check the footer link', async () => {
        await expect(appShell.footerSourceLink).toHaveText('CoinMarketCap')
        await expect(appShell.footerSourceLink).toHaveAttribute('href', 'https://coinmarketcap.com/api/')
      })
    })

    test('User can retry a failed load and sees the section they asked for', severity(Severity.BLOCKER), async ({ appShell, page }) => {
      const gate = new Gate()
      const latestRequests = countRequests(page, 'latest')

      await test.step('open / with latest.json returning 404', async () => {
        await appShell.goto('#/')
        await expectErrorPanel(appShell, LOAD_ERROR, '404 Not Found')
      })

      await test.step('go to Compare', async () => {
        await appShell.navLink('Compare').click()
        await expect(appShell.errorPanel).toBeVisible()
      })

      await test.step('hold latest.json, answering with the fixture on release', async () => {
        await routeDataFile(page, 'latest', heldBy(gate, serveFixture))
        await expect(appShell.errorPanel).toBeVisible()
      })

      await test.step('retry', async () => {
        const before = latestRequests()
        await appShell.retryButton.click()
        await expect(appShell.placeholder).toBeVisible()
        await expect(appShell.errorPanel).toHaveCount(0)
        await expect.poll(latestRequests).toBe(before + 1)
      })

      await test.step('release latest.json', async () => {
        gate.release()
        await expect(appShell.heading).toHaveText('Compare coins')
        await expect(appShell.freshness).toBeVisible()
      })
    })

    test('Failed retry shows the error again with the new reason', severity(Severity.CRITICAL), async ({ appShell, page }) => {
      const gate = new Gate()

      await test.step('open / with latest.json returning 404', async () => {
        await appShell.goto('#/')
        await expectErrorPanel(appShell, LOAD_ERROR, '404 Not Found')
      })

      await test.step('hold latest.json, returning 503 on release', async () => {
        await routeDataFile(page, 'latest', heldBy(gate, withStatus(503)))
        await expect(appShell.errorPanel).toBeVisible()
      })

      await test.step('retry', async () => {
        await appShell.retryButton.click()
        await expect(appShell.placeholder).toBeVisible()
      })

      await test.step('release latest.json', async () => {
        gate.release()
        await expectErrorPanel(appShell, LOAD_ERROR, '503 Service Unavailable')
        await expectChromeVisible(appShell)
      })
    })
  })

  for (const { status, reason } of STATUS_TEXT_ROWS) {
    test(`Error reason shows the standard status text when the server sends none: ${status}`, severity(Severity.NORMAL), async ({ appShell, page }) => {
      // route.fulfill always adds the standard text, so the app's fetch is stubbed instead.
      await page.addInitScript((stubStatus) => {
        const realFetch = window.fetch.bind(window)
        window.fetch = (input, init) => {
          const url = input instanceof Request ? input.url : String(input)
          if (url.includes('latest.json')) return Promise.resolve(new Response('', { status: stubStatus, statusText: '' }))
          return realFetch(input, init)
        }
      }, status)
      await appShell.goto('#/')

      await expectErrorPanel(appShell, LOAD_ERROR, reason)
    })
  }

  test.describe('when the server can\'t be reached', () => {
    test.use({ expectedBrowserErrors: [FAILED_REQUEST] })

    test('User sees Network error when the server can\'t be reached', severity(Severity.CRITICAL), async ({ appShell, page }) => {
      await routeDataFile(page, 'latest', (route) => route.abort('failed'))
      await appShell.goto('#/')

      await expectErrorPanel(appShell, LOAD_ERROR, 'Network error')
      await expect(appShell.errorPanel).not.toContainText('Failed to fetch')
    })
  })

  test('User sees a timeout error when market data doesn\'t arrive within 30 seconds', severity(Severity.CRITICAL), async ({ appShell, page }) => {
    test.setTimeout(TIMED_OUT_BY_MS + 30_000)
    await routeDataFile(page, 'latest', neverAnswer)

    const start = Date.now()
    await appShell.goto('#/')
    await expect(appShell.placeholder).toBeVisible()

    // Waiting for the placeholder to go, rather than sleeping, then checking when it went.
    const elapsed = await msUntilPlaceholderGone(appShell, start, TIMED_OUT_BY_MS)
    expect(elapsed, 'the placeholder stayed up for at least 25 s').toBeGreaterThanOrEqual(STILL_LOADING_MS)
    await expectErrorPanel(appShell, LOAD_ERROR, TIMEOUT_REASON)
    await expect(appShell.placeholder).toHaveCount(0)
  })

  test('Timeout counts the fallback to the previous snapshot within the same 30 seconds', severity(Severity.NORMAL), async ({ appShell, page }) => {
    test.setTimeout(TIMED_OUT_BY_MS + 30_000)
    const zeroBitcoinPrice = withCoinField('bitcoin', 'price', 0)
    await routeDataFile(page, 'latest', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SLOW_LATEST_MS))
      await route.fulfill({ json: zeroBitcoinPrice })
    })
    await routeDataFile(page, 'previous', neverAnswer)
    const previousRequests = countRequests(page, 'previous')

    const start = Date.now()
    await appShell.goto('#/')
    await expect(appShell.placeholder).toBeVisible()

    const elapsed = await msUntilPlaceholderGone(appShell, start, TIMED_OUT_BY_MS)
    await expectErrorPanel(appShell, LOAD_ERROR, TIMEOUT_REASON)
    expect(previousRequests(), 'previous.json was requested').toBeGreaterThan(0)
    expect(elapsed).toBeGreaterThanOrEqual(FALLBACK_TIMEOUT_WINDOW_MS.min)
    expect(elapsed).toBeLessThanOrEqual(FALLBACK_TIMEOUT_WINDOW_MS.max)
  })

  test('Market data loads once per visit and isn\'t refetched when moving between sections', severity(Severity.NORMAL), async ({ appShell, page }) => {
    // Loads, not requests: the dev server's StrictMode starts every load twice and cancels the first.
    const latestRequests = countRequests(page, 'latest', { completedOnly: true })

    await test.step('open /', async () => {
      await appShell.goto('#/')
      await expect(appShell.heading).toHaveText(MARKETS_HEADING)
      await expect.poll(latestRequests).toBe(1)
    })

    await test.step('visit every section', async () => {
      for (const section of ['Converter', 'Compare', 'Portfolio', 'Markets'] as const) {
        await appShell.navLink(section).click()
        await expect(appShell.navLink(section)).toHaveAttribute('aria-current', 'page')
      }
      expect(latestRequests()).toBe(1)
    })

    await test.step('open the first coin', async () => {
      await page.getByTestId('coin-row-link-1').click()
      await expect(appShell.heading).toHaveText('Bitcoin BTC')
    })

    await test.step('go back, then forward', async () => {
      await page.goBack()
      await expect(appShell.heading).toHaveText(MARKETS_HEADING)
      await page.goForward()
      await expect(appShell.heading).toHaveText('Bitcoin BTC')
      expect(latestRequests()).toBe(1)
    })

    await test.step('reload the page', async () => {
      await page.reload()
      await expect(appShell.heading).toHaveText('Bitcoin BTC')
      await expect.poll(latestRequests).toBe(2)
    })
  })

  for (const { label, body } of CORRUPT_ROWS) {
    test(`Corrupt latest snapshot falls back to the previous snapshot and its price history: ${label}`, severity(Severity.CRITICAL), async ({ appShell, page }) => {
      await routeDataFile(page, 'latest', (route) => route.fulfill({ status: 200, contentType: 'application/json', body }))
      await servePreviousSnapshot(appShell)
      const historyRequests = countRequests(page, 'history')
      const previousHistoryRequests = countRequests(page, 'previous-history')

      await appShell.goto('#/coin/bitcoin')

      await expect(appShell.heading).toHaveText('Bitcoin (previous) BTC')
      await expect(appShell.errorPanel).toHaveCount(0)
      await expect(page.getByTestId('price-chart')).toBeVisible()
      expect(previousHistoryRequests(), 'previous-history.json was requested').toBeGreaterThan(0)
      expect(historyRequests(), 'history.json was not requested').toBe(0)
      const warnings = (await page.consoleMessages({ filter: 'all' })).filter((message) => message.type() === 'warning')
      expect(warnings.map((message) => message.text())).toContainEqual(expect.stringContaining(FALLBACK_WARNING))
    })
  }

  test.describe('with no previous snapshot', () => {
    test.use({ expectedBrowserErrors: [FAILED_REQUEST] })

    test('Corrupt latest snapshot with no previous snapshot shows No market data available', severity(Severity.NORMAL), async ({ appShell, page }) => {
      await routeDataFile(page, 'latest', (route) => route.fulfill({ json: {} }))
      await routeDataFile(page, 'previous', withStatus(404))
      await appShell.goto('#/')

      await expect(appShell.noMarketData).toBeVisible()
      await expect(appShell.errorPanel).toHaveCount(0)
      await expect(appShell.heading).toHaveCount(0)
      await expectChromeVisible(appShell)
    })
  })

  test('Corrupt latest and corrupt previous snapshots show The market data file is invalid', severity(Severity.CRITICAL), async ({ appShell, page }) => {
    await routeDataFile(page, 'latest', (route) => route.fulfill({ json: {} }))
    await routeDataFile(page, 'previous', (route) => route.fulfill({ json: [] }))
    await appShell.goto('#/')

    await expectErrorPanel(appShell, LOAD_ERROR, 'The market data file is invalid')
    await expectChromeVisible(appShell)
    await expect(appShell.errorPanel).not.toContainText('Cannot read properties')
  })

  for (const { label, snapshot } of REAL_VALUE_ROWS) {
    test(`Snapshot with values that real data has isn't treated as corrupt: ${label}`, severity(Severity.NORMAL), async ({ appShell, page, serveSnapshot }) => {
      await serveSnapshot(snapshot)
      await routeDataFile(page, 'previous', neverAnswer)
      const previousRequests = countRequests(page, 'previous')
      await appShell.goto('#/coin/bitcoin')

      await expect(appShell.heading).toHaveText('Bitcoin BTC')
      await expect(appShell.errorPanel).toHaveCount(0)
      expect(previousRequests(), 'previous.json was not requested').toBe(0)
    })
  }

  test.describe('when a section fails to draw', () => {
    // React logs the error the section threw.
    test.use({ expectedBrowserErrors: [/Error: forced/] })

    test('Section that fails to draw shows Something went wrong and keeps the chrome', severity(Severity.NORMAL), async ({ appShell, page }) => {
      await page.addInitScript(() => {
        const crashWindow = window as CrashWindow
        const toFixed = Number.prototype.toFixed
        Number.prototype.toFixed = function (this: number, digits?: number) {
          if (crashWindow.__crash) throw new Error('forced')
          return toFixed.call(this, digits)
        }
        crashWindow.__crash = true
      })
      const latestRequests = countRequests(page, 'latest')

      await test.step('open /', async () => {
        await appShell.goto('#/')
        await expectErrorPanel(appShell, PAGE_ERROR, PAGE_ERROR_REASON)
        await expectChromeVisible(appShell)
      })

      await setCrash(page, false)
      await expect(appShell.errorPanel).toBeVisible()

      await test.step('go to Converter', async () => {
        await appShell.navLink('Converter').click()
        await expect(appShell.heading).toHaveText('Converter')
        await expect(appShell.errorPanel).toHaveCount(0)
      })

      await setCrash(page, true)
      await expect(appShell.heading).toHaveText('Converter')

      await test.step('go to Markets', async () => {
        await appShell.navLink('Markets').click()
        await expectErrorPanel(appShell, PAGE_ERROR, PAGE_ERROR_REASON)
      })

      await setCrash(page, false)
      await expect(appShell.errorPanel).toBeVisible()

      await test.step('retry', async () => {
        const before = latestRequests()
        await appShell.retryButton.click()
        await expect(appShell.heading).toHaveText(MARKETS_HEADING)
        await expect.poll(latestRequests).toBe(before + 1)
      })
    })
  })

  test('Daily update doesn\'t publish a malformed snapshot', severity(Severity.CRITICAL), async () => {
    const outDir = test.info().outputPath('out')
    const outputFile = test.info().outputPath('out.txt')
    const fetchStub = test.info().outputPath('fetch-stub.mjs')
    await writeFile(fetchStub, fetchStubModule(listingsWithNamelessSecondCoin()))
    expect(existsSync(outDir)).toBe(false)

    const { code, output } = await runSnapshotScript(fetchStub, outDir, { GITHUB_OUTPUT: outputFile, CMC_API_KEY: 'dummy' })

    expect(code, output).toBe(0)
    expect(output).toContain('rejected the snapshot')
    expect(output).toContain('coin 2 has a name that is not a string')
    expect(existsSync(outDir), 'out/ was not created').toBe(false)
    expect(await readFile(outputFile, 'utf8')).toContain('accepted=false')
  })
})

/** A listings/latest response of two coins, priced at 10, the second with a null name. */
function listingsWithNamelessSecondCoin() {
  const coin = (id: number, name: string | null) => ({
    id,
    name,
    symbol: `C${id}`,
    slug: `coin-${id}`,
    cmc_rank: id,
    tags: [],
    date_added: '2020-01-01T00:00:00.000Z',
    circulating_supply: 1000,
    total_supply: 1000,
    max_supply: null,
    quote: [
      {
        symbol: 'USD',
        price: 10,
        market_cap: 10_000,
        market_cap_dominance: 50,
        volume_24h: 100,
        percent_change_1h: 0,
        percent_change_24h: 0,
        percent_change_7d: 0,
        percent_change_30d: 0,
      },
    ],
  })
  return {
    data: [coin(1, 'Coin One'), coin(2, null)],
    status: { timestamp: '2026-10-15T08:00:00.000Z', error_code: 0, error_message: null, elapsed: 1, credit_count: 1 },
  }
}

/** A module that makes `fetch` answer every request with `body`, so the script makes no live call. */
const fetchStubModule = (body: unknown) =>
  `globalThis.fetch = async () => new Response(${JSON.stringify(JSON.stringify(body))}, { status: 200 })\n`

const execFileAsync = promisify(execFile)
const TSX_BIN = path.join(process.cwd(), 'node_modules/.bin/tsx')

/** Runs the daily snapshot script with `fetchStub` preloaded, returning its exit code and combined output. */
async function runSnapshotScript(fetchStub: string, outDir: string, env: Record<string, string>): Promise<{ code: number; output: string }> {
  const args = ['--import', pathToFileURL(fetchStub).href, 'scripts/snapshot-listings.ts', outDir]
  try {
    const { stdout, stderr } = await execFileAsync(TSX_BIN, args, { env: { ...process.env, ...env } })
    return { code: 0, output: `${stdout}${stderr}` }
  } catch (error) {
    // `code` is the exit code, or a string such as 'ENOENT' when the script couldn't be started.
    const failed = error as { code?: number | string; message?: string; stdout?: string; stderr?: string }
    const code = typeof failed.code === 'number' ? failed.code : 1
    return { code, output: `${failed.stdout ?? ''}${failed.stderr ?? ''}${failed.message ?? ''}` }
  }
}
