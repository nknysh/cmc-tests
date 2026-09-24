import { test, expect } from '@playwright/test'
import { CoinMarketCapHomePage, NavTabIndex } from '@tests/e2e/pages/CoinMarketCapHomePage'

const ALL_TABS: readonly { index: NavTabIndex; label: string }[] = [
  { index: 'tab-rank', label: 'Top' },
  { index: 'tab-trending', label: 'Trending' },
  { index: 'tab-watchlist', label: 'Watchlist' },
  { index: 'tab-stonks', label: 'Stonks' },
  { index: 'tab-stocks', label: 'RWA' },
  { index: 'tab-derivatives', label: 'Derivatives' },
  { index: 'tab-most_visited', label: 'Most Visited' },
  { index: 'tab-new', label: 'New' },
  { index: 'tab-gainers', label: 'Gainers' },
  { index: 'tab-bstocks', label: 'bStocks' },
  { index: 'tab-__more__', label: 'More' },
]

// Tabs that swap the ranking table via query params without a full navigation.
const IN_PAGE_TABS: readonly { index: NavTabIndex; label: string; tableRankBy: string }[] = [
  { index: 'tab-trending', label: 'Trending', tableRankBy: 'trending_all_24h' },
  { index: 'tab-watchlist', label: 'Watchlist', tableRankBy: 'watchlist' },
  { index: 'tab-most_visited', label: 'Most Visited', tableRankBy: 'most_visited_24h' },
  { index: 'tab-new', label: 'New', tableRankBy: 'date_added' },
  { index: 'tab-gainers', label: 'Gainers', tableRankBy: 'gainers_24h' },
]

// Tabs that navigate to their own dedicated page.
const FULL_PAGE_TABS: readonly { index: NavTabIndex; label: string; expectedPath: string }[] = [
  { index: 'tab-stonks', label: 'Stonks', expectedPath: '/stonks/' },
  { index: 'tab-stocks', label: 'RWA', expectedPath: '/real-world-assets/' },
  { index: 'tab-derivatives', label: 'Derivatives', expectedPath: '/derivatives/' },
  { index: 'tab-bstocks', label: 'bStocks', expectedPath: '/view/bstocks/' },
]

test.describe('CoinMarketCap homepage first-level navigation', { tag: '@navigation' }, () => {
  test('exposes all expected first-level tabs', async ({ page }) => {
    const home = new CoinMarketCapHomePage(page)
    await home.goto()

    // CoinMarketCap ships nav-tab experiments (e.g. a "Prediction Markets" tab
    // appeared mid-development of this suite), so the live tab count can run
    // ahead of ALL_TABS. Assert the known tabs are present rather than an
    // exact count, so a site-side experiment doesn't fail this test - only a
    // genuinely missing tab should. expect.poll (not a one-shot check) keeps
    // the same auto-retry tolerance toHaveCount would have given a slow page.
    await expect.poll(() => home.navTabs.count()).toBeGreaterThanOrEqual(ALL_TABS.length)

    for (const { index, label } of ALL_TABS) {
      await expect(home.tab(index)).toBeVisible()
      await expect(home.tab(index)).toContainText(label)
    }
  })

  for (const { index, label, tableRankBy } of IN_PAGE_TABS) {
    test(`selecting "${label}" updates the ranking view in place`, async ({ page }) => {
      const home = new CoinMarketCapHomePage(page)
      await home.goto()

      await home.tab(index).click()
      // The tab swap updates the URL asynchronously - a synchronous page.url()
      // check right after click() races the client-side update (this is what
      // made the "Top" test below flaky under CI's slower CPU: two clicks
      // back-to-back with no wait in between). Wait for the real condition.
      await page.waitForURL(url => url.searchParams.get('tableRankBy') === tableRankBy)

      expect(new URL(page.url()).pathname).toBe('/')
      await expect(home.heading).toBeVisible()
    })
  }

  for (const { index, label, expectedPath } of FULL_PAGE_TABS) {
    test(`selecting "${label}" navigates to its dedicated page`, async ({ page }) => {
      const home = new CoinMarketCapHomePage(page)
      await home.goto()

      await home.tab(index).click()
      await page.waitForURL(`**${expectedPath}*`)

      expect(new URL(page.url()).pathname).toBe(expectedPath)
    })
  }

  test('selecting "More" reveals additional tabs without navigating away', async ({ page }) => {
    const home = new CoinMarketCapHomePage(page)
    await home.goto()

    await home.tab('tab-__more__').click()

    await expect(page).toHaveURL('/')
    await expect(home.heading).toBeVisible()
  })
})
