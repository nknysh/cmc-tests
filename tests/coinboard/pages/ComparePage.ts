import type { Locator, Page } from '@playwright/test'

/** Which coin select, and which coin column of the comparison. */
export type Side = 'first' | 'second'

/** The CoinBoard Compare page (`#/compare`). */
export class ComparePage {
  readonly heading: Locator
  readonly firstCoin: Locator
  readonly secondCoin: Locator
  readonly table: Locator
  /** The comparison's header cells: "Metric", then one per coin. */
  readonly columnHeaders: Locator
  readonly alert: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Compare coins' })
    this.firstCoin = page.getByLabel('First coin', { exact: true })
    this.secondCoin = page.getByLabel('Second coin', { exact: true })
    this.table = page.getByRole('table', { name: 'Coin comparison' })
    this.columnHeaders = this.table.getByRole('columnheader')
    this.alert = page.getByRole('alert')
  }

  /** Opens the page, optionally with a pair in the address, e.g. `?a=bnb&b=tether`. */
  async goto(query = '') {
    await this.page.goto(`#/compare${query}`)
    await this.heading.waitFor()
  }

  select(side: Side): Locator {
    return side === 'first' ? this.firstCoin : this.secondCoin
  }

  /** The options of a coin select, in list order. */
  options(side: Side): Locator {
    return this.select(side).getByRole('option')
  }

  /** The option a coin select shows as chosen. */
  selectedOption(side: Side): Locator {
    return this.select(side).getByRole('option', { selected: true })
  }

  /** Chooses a coin by its label, e.g. "BNB (BNB)". */
  async choose(side: Side, label: string) {
    await this.select(side).selectOption({ label })
  }

  /** The header of a coin's column: the first coin's is on the left. */
  coinHeader(side: Side): Locator {
    return this.columnHeaders.nth(side === 'first' ? 1 : 2)
  }

  /** One metric's value for one coin, e.g. `cell('Rank', 'first')`. */
  cell(metric: string, side: Side): Locator {
    const row = this.table.getByRole('row').filter({ has: this.page.getByRole('rowheader', { name: metric, exact: true }) })
    return row.getByRole('cell').nth(side === 'first' ? 0 : 1)
  }
}
