// Types and constants shared by the CoinBoard specs and page objects. Anything more than one
// spec or page object uses, or that names something the app shows on several pages, lives here.

/** Which coin select, and which coin column of the comparison. */
export type Side = 'first' | 'second'

// Coin labels, as the app's coin selects show them.
export const BITCOIN = 'Bitcoin (BTC)'
export const ETHEREUM = 'Ethereum (ETH)'
export const TETHER = 'Tether USDt (USDT)'
export const BNB = 'BNB (BNB)'
/** The select option for US dollars, offered by the converter but not by the Compare page. */
export const US_DOLLAR = 'US Dollar (USD)'

/** The Compare page's alert when both selects hold the same coin. */
export const SAME_COIN_MESSAGE = 'Pick two different coins to compare.'

/** The rows of the comparison, top to bottom (CMP-02/AC-1). */
export const COMPARE_METRICS = [
  'Rank',
  'Price',
  'Market cap',
  'Volume (24h)',
  '1h change',
  '24h change',
  '7d change',
  '30d change',
  'Circulating supply',
  'Max supply',
] as const
export type CompareMetric = (typeof COMPARE_METRICS)[number]

/** A coin's change periods, as the coin details page's "Price change" list labels them. */
export const CHANGE_PERIODS = ['1h', '24h', '7d', '30d'] as const
export type ChangePeriod = (typeof CHANGE_PERIODS)[number]

/** The comparison row of a change period, e.g. `1h change`. */
export const changeMetric = (period: ChangePeriod): CompareMetric => `${period} change`

/** The CSS class a percent change is shown with, from the sign of its unrounded value. */
export const CHANGE_STATES = ['up', 'down', 'flat'] as const
export type ChangeState = (typeof CHANGE_STATES)[number]
export const isChangeState = (name: string): name is ChangeState => (CHANGE_STATES as readonly string[]).includes(name)

/** How the app shows the Max supply of a coin that has none. */
export const NO_MAX_SUPPLY = '∞'

/** Which currency select of the converter. */
export type Currency = 'from' | 'to'

/** Pepe, the fixture's coin with the smallest price, for very small and very large converter results. */
export const PEPE = 'Pepe (PEPE)'

// The converter's Amount errors, and what its result shows while there's nothing to convert.
export const EMPTY_AMOUNT_ERROR = 'Enter an amount of 0 or more.'
export const MAX_AMOUNT_ERROR = 'Enter an amount up to 1,000,000,000.'
export const NO_RESULT = '—'

/** A phone-sized viewport, at or below the app's 640 px narrow-screen breakpoint. */
export const NARROW_VIEWPORT = { width: 375, height: 812 }
