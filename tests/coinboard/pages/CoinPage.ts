import type { Locator, Page } from '@playwright/test'

/** A coin's change periods, as the "Price change" list labels them. */
export type ChangePeriod = '1h' | '24h' | '7d' | '30d'

/** The CoinBoard coin details page (`#/coin/<slug>`). */
export class CoinPage {
  readonly heading: Locator
  /** The "Rank #N" badge. */
  readonly rankBadge: Locator
  readonly price: Locator
  readonly priceChanges: Locator
  readonly statistics: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 })
    this.rankBadge = page.getByText(/^Rank #\d+$/)
    this.price = page.getByTestId('coin-price')
    this.priceChanges = page.getByRole('list', { name: 'Price change' })
    this.statistics = page.getByRole('region', { name: 'Statistics' })
  }

  /** Opens a coin's details page by its slug, e.g. `bitcoin`. */
  async goto(slug: string) {
    await this.page.goto(`#/coin/${slug}`)
    await this.heading.waitFor()
  }

  /** The value of one "Price change" item, e.g. the `+1.49%` of `1h +1.49%`. */
  change(period: ChangePeriod, value: string): Locator {
    const item = this.priceChanges.getByRole('listitem').filter({ has: this.page.getByText(period, { exact: true }) })
    return item.getByText(value, { exact: true })
  }

  /** The value of one Statistics entry, e.g. `stat('Market cap')`. */
  stat(label: string): Locator {
    const term = this.page.getByRole('term').and(this.page.getByText(label, { exact: true }))
    return this.statistics.locator('div').filter({ has: term }).getByRole('definition')
  }
}
