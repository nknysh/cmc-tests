import type { Locator, Page } from '@playwright/test'
import type { ConverterSide } from '../types'

/** The CoinBoard Converter page (`#/converter`). */
export class ConverterPage {
  readonly heading: Locator
  readonly amount: Locator
  readonly from: Locator
  readonly to: Locator
  readonly swap: Locator
  /** The `output` the conversion is shown in, a polite live region. */
  readonly result: Locator
  readonly alert: Locator
  /** The Converter link in the main navigation, shown on every page. */
  readonly navLink: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Converter' })
    this.amount = page.getByLabel('Amount', { exact: true })
    this.from = page.getByLabel('From', { exact: true })
    this.to = page.getByLabel('To', { exact: true })
    this.swap = page.getByRole('button', { name: '⇅ Swap' })
    this.result = page.getByTestId('conversion-result')
    this.alert = page.getByRole('alert')
    this.navLink = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Converter', exact: true })
  }

  async goto() {
    await this.page.goto('#/converter')
    await this.heading.waitFor()
  }

  select(side: ConverterSide): Locator {
    return side === 'from' ? this.from : this.to
  }

  /** The options of a currency select, in list order. */
  options(side: ConverterSide): Locator {
    return this.select(side).getByRole('option')
  }

  /** The option a currency select shows as chosen. */
  selectedOption(side: ConverterSide): Locator {
    return this.select(side).getByRole('option', { selected: true })
  }

  /** Chooses a currency by its label, e.g. "US Dollar (USD)". */
  async choose(side: ConverterSide, label: string) {
    await this.select(side).selectOption({ label })
  }

  /** Clears Amount, then types `value` key by key, leaving focus in it. */
  async typeAmount(value: string) {
    await this.amount.clear()
    await this.amount.pressSequentially(value)
  }

  /** Selects all of Amount and pastes `text` over it through the clipboard, as a user would. */
  async pasteAmount(text: string) {
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await this.page.evaluate((value) => navigator.clipboard.writeText(value), text)
    await this.amount.selectText()
    await this.amount.press('ControlOrMeta+V')
  }

  /** How many lines the result's text is laid out on. */
  async resultLineCount(): Promise<number> {
    return this.result.evaluate((output) => {
      const range = document.createRange()
      range.selectNodeContents(output)
      return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size
    })
  }

  /** Whether any part of the result lies outside the viewport's width. */
  async resultOverflowsViewport(): Promise<boolean> {
    const box = await this.result.boundingBox()
    const viewport = this.page.viewportSize()
    if (!box || !viewport) throw new Error('The result has no layout box, or the page has no fixed viewport')
    return box.x < 0 || box.x + box.width > viewport.width
  }

  /** Whether the page is wider than the viewport, so it scrolls sideways. */
  async scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  }
}
