import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { MarketSnapshot } from '../../app/src/data/types'
import { fixtureSnapshot } from './data/snapshot'
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
}

/** Uncaught page errors and `console.error` messages since the page opened, across navigations. */
async function browserErrors(page: Page): Promise<string[]> {
  const pageErrors = (await page.pageErrors({ filter: 'all' })).map((error) => `Uncaught ${error.stack ?? error.message}`)
  const consoleErrors = (await page.consoleMessages({ filter: 'all' }))
    .filter((message) => message.type() === 'error')
    .map((message) => `console.error: ${message.text()}`)
  return [...pageErrors, ...consoleErrors]
}

export const test = base.extend<CoinBoardFixtures>({
  expectedBrowserErrors: [[], { option: true }],
  page: async ({ page, expectedBrowserErrors }, use, testInfo) => {
    await page.route(LATEST_SNAPSHOT_URL, (route) => route.fulfill({ json: fixtureSnapshot }))
    await use(page)

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
})

export { expect } from '@playwright/test'
