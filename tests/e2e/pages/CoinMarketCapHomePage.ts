import { Page, Locator } from '@playwright/test'

export type NavTabIndex =
  | 'tab-rank'
  | 'tab-trending'
  | 'tab-watchlist'
  | 'tab-stonks'
  | 'tab-stocks'
  | 'tab-derivatives'
  | 'tab-most_visited'
  | 'tab-new'
  | 'tab-gainers'
  | 'tab-bstocks'
  | 'tab-__more__'

export class CoinMarketCapHomePage {
  readonly page: Page
  readonly heading: Locator
  readonly navTabsContainer: Locator
  readonly navTabs: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { level: 1, name: "Today's Cryptocurrency Prices by Market Cap" })
    this.navTabsContainer = page.locator('[data-test="homepage-table-header"]')
    this.navTabs = this.navTabsContainer.locator('li[data-role="Tab"]')
  }

  async goto() {
    await this.page.goto('/')
    await this.heading.waitFor({ state: 'visible' })
  }

  tab(index: NavTabIndex): Locator {
    return this.navTabsContainer.locator(`li[data-role="Tab"][data-index="${index}"]`)
  }
}
