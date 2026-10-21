import type { Locator, Page } from '@playwright/test'

/** A section's link in the main navigation. */
export type NavSection = 'Markets' | 'Converter' | 'Compare' | 'Portfolio'

/**
 * What every CoinBoard address shows around its section: the header, the footer, and the
 * market data status in place of the section (loading, load failure, nothing to show).
 */
export class AppShell {
  /** The loading placeholder shown while market data loads (APP-03/AC-1). */
  readonly placeholder: Locator
  /** A load failure (APP-03/AC-2) or a section that failed to draw (AC-9). */
  readonly errorPanel: Locator
  readonly errorHeading: Locator
  readonly errorReason: Locator
  readonly retryButton: Locator
  /** Shown when market data loaded but none of it is valid (APP-06/AC-10). */
  readonly noMarketData: Locator
  /** The section's level-1 heading, whichever section it is. */
  readonly heading: Locator
  readonly freshness: Locator
  readonly brand: Locator
  readonly nav: Locator
  /** Named "Switch to dark theme" or "Switch to light theme", after the theme it switches to. */
  readonly themeToggle: Locator
  readonly footer: Locator
  readonly footerSourceLink: Locator

  constructor(readonly page: Page) {
    this.placeholder = page.getByRole('status', { name: 'Loading market data' })
    this.errorPanel = page.getByRole('alert')
    this.errorHeading = this.errorPanel.getByRole('heading')
    this.errorReason = this.errorPanel.getByRole('paragraph')
    this.retryButton = this.errorPanel.getByRole('button', { name: 'Retry' })
    this.noMarketData = page.getByRole('heading', { name: 'No market data available' })
    this.heading = page.getByRole('heading', { level: 1 })
    this.freshness = page.getByTestId('freshness')
    this.brand = page.getByRole('link', { name: 'CoinBoard', exact: true })
    this.nav = page.getByRole('navigation', { name: 'Main' })
    this.themeToggle = page.getByTestId('theme-toggle')
    this.footer = page.getByRole('contentinfo')
    this.footerSourceLink = page.getByTestId('footer-source-link')
  }

  /** Opens an address relative to the app root, e.g. `#/converter`, without waiting for data. */
  async goto(address: string) {
    await this.page.goto(address)
  }

  navLink(section: NavSection): Locator {
    return this.nav.getByRole('link', { name: section, exact: true })
  }

  /** The brand link, the four main navigation links, the theme switch and the footer. */
  chrome(): Locator[] {
    const sections: NavSection[] = ['Markets', 'Converter', 'Compare', 'Portfolio']
    return [this.brand, ...sections.map((section) => this.navLink(section)), this.themeToggle, this.footer]
  }
}
