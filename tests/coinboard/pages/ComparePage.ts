import type { Locator, Page } from '@playwright/test'
import type { CompareMetric, Side } from '../types'

/** The route and query of a hash-routed address, e.g. `#/compare?a=bnb&b=tether`. */
export interface HashAddress {
  route: string
  /** Every query parameter as a `[key, value]` pair, sorted, so a repeated key shows up twice. */
  query: [string, string][]
}

/** The CoinBoard Compare page (`#/compare`). */
export class ComparePage {
  readonly heading: Locator
  readonly firstCoin: Locator
  readonly secondCoin: Locator
  readonly table: Locator
  /** The comparison's header cells: "Metric", then one per coin. */
  readonly columnHeaders: Locator
  readonly alert: Locator
  /** The Compare link in the main navigation, shown on every page. */
  readonly navLink: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Compare coins' })
    this.firstCoin = page.getByLabel('First coin', { exact: true })
    this.secondCoin = page.getByLabel('Second coin', { exact: true })
    this.table = page.getByRole('table', { name: 'Coin comparison' })
    this.columnHeaders = this.table.getByRole('columnheader')
    this.alert = page.getByRole('alert')
    this.navLink = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Compare', exact: true })
  }

  /** Opens the page, optionally with a pair in the address, e.g. `?a=bnb&b=tether`. */
  async goto(query = '') {
    await this.page.goto(`#/compare${query}`)
    await this.heading.waitFor()
  }

  /** The current address's hash route and query, so a pair can be checked in any parameter order. */
  address(): HashAddress {
    const hash = new URL(this.page.url()).hash.replace(/^#/, '')
    const [route = '', search = ''] = hash.split('?', 2)
    const byKeyThenValue = ([keyA, valueA]: [string, string], [keyB, valueB]: [string, string]) =>
      keyA.localeCompare(keyB) || valueA.localeCompare(valueB)
    return { route, query: [...new URLSearchParams(search)].sort(byKeyThenValue) }
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

  /** The comparison's metric rows, top to bottom. */
  bodyRows(): Locator {
    return this.table.locator('tbody').getByRole('row')
  }

  /** The metric names heading each row, top to bottom. */
  rowHeaders(): Locator {
    return this.table.getByRole('rowheader')
  }

  /** One metric's value for one coin, e.g. `cell('Rank', 'first')`. */
  cell(metric: CompareMetric, side: Side): Locator {
    const row = this.table.getByRole('row').filter({ has: this.page.getByRole('rowheader', { name: metric, exact: true }) })
    return row.getByRole('cell').nth(side === 'first' ? 0 : 1)
  }
}
