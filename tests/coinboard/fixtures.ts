import { test as base } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import type { MarketSnapshot } from '../../app/src/data/types'
import { fixtureSnapshot } from './data/snapshot'
import { DOM_SNAPSHOT_ATTACHMENT, DOM_SNAPSHOT_MAX_LENGTH, serializeElement } from './domSnapshot'
import { CoinPage } from './pages/CoinPage'
import { ComparePage } from './pages/ComparePage'

const LATEST_SNAPSHOT_URL = '**/data/latest.json'

interface CoinBoardFixtures {
  /**
   * Serves a stub as `data/latest.json` in place of the committed fixture, which
   * every test gets by default. Call it before opening a page: the app reads the
   * snapshot once, when it loads.
   */
  serveSnapshot: (snapshot: MarketSnapshot) => Promise<void>
  /**
   * Browser errors a test expects, e.g. the failed request of a load-failure test.
   * Any other uncaught page error or `console.error` fails the test.
   */
  expectedBrowserErrors: RegExp[]
  comparePage: ComparePage
  coinPage: CoinPage
}

/** Uncaught page errors and `console.error` messages since the page opened, across navigations. */
async function browserErrors(page: Page): Promise<string[]> {
  const pageErrors = (await page.pageErrors({ filter: 'all' })).map((error) => `Uncaught ${error.stack ?? error.message}`)
  const consoleErrors = (await page.consoleMessages({ filter: 'all' }))
    .filter((message) => message.type() === 'error')
    .map((message) => `console.error: ${message.text()}`)
  return [...pageErrors, ...consoleErrors]
}

/** Attaches the page's DOM, which the CoinBoard locator heal sends to its model to repair a page object. */
async function attachDomSnapshot(page: Page, testInfo: TestInfo): Promise<void> {
  try {
    const dom = await page.locator('body').evaluate(serializeElement, undefined, { timeout: 5_000 })
    await testInfo.attach(DOM_SNAPSHOT_ATTACHMENT, { body: dom.slice(0, DOM_SNAPSHOT_MAX_LENGTH), contentType: 'text/html' })
  } catch (error) {
    // Best effort: the page may already be closed, e.g. after a test timeout.
    console.warn(`Couldn't capture a DOM snapshot: ${String(error)}`)
  }
}

export const test = base.extend<CoinBoardFixtures>({
  expectedBrowserErrors: [[], { option: true }],
  page: async ({ page, expectedBrowserErrors }, use, testInfo) => {
    await page.route(LATEST_SNAPSHOT_URL, (route) => route.fulfill({ json: fixtureSnapshot }))
    await use(page)
    if (testInfo.status !== testInfo.expectedStatus) await attachDomSnapshot(page, testInfo)

    // Checked after the test, so an app error fails it even when every assertion passed.
    const errors = await browserErrors(page)
    if (errors.length === 0) return
    await testInfo.attach('browser errors', { body: errors.join('\n\n'), contentType: 'text/plain' })
    const unexpected = errors.filter((error) => !expectedBrowserErrors.some((pattern) => pattern.test(error)))
    if (unexpected.length > 0) {
      throw new Error(`The app logged ${unexpected.length} unexpected browser error(s):\n${unexpected.join('\n')}`)
    }
  },
  serveSnapshot: async ({ page }, use) => {
    await use(async (snapshot) => {
      await page.unroute(LATEST_SNAPSHOT_URL)
      await page.route(LATEST_SNAPSHOT_URL, (route) => route.fulfill({ json: snapshot }))
    })
  },
  comparePage: async ({ page }, use) => {
    await use(new ComparePage(page))
  },
  coinPage: async ({ page }, use) => {
    await use(new CoinPage(page))
  },
})

export { expect } from '@playwright/test'
