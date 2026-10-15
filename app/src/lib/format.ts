/**
 * Number and time formatting. The locale is fixed to en-US, so text is the
 * same on every machine and UI tests can assert on it.
 */
const LOCALE = 'en-US'

const usdWhole = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const usdSmall = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 4,
})
const usdCompact = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})
const plain = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const amount = new Intl.NumberFormat(LOCALE, { maximumSignificantDigits: 8 })

/** `$82,074.63` for prices of $1 or more, `$0.1234` (4 significant digits) below. */
export const formatPrice = (value: number): string => (Math.abs(value) >= 1 ? usdWhole : usdSmall).format(value)

/** `$1.65T`, `$41.83B`. */
export const formatCompactUsd = (value: number): string => usdCompact.format(value)

/** `+1.49%`, `-0.27%`, `0.00%`. */
export const formatPercent = (value: number): string => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`

/** `20,098,671`. */
export const formatNumber = (value: number): string => plain.format(value)

/** A token amount, up to 8 significant digits: `23.456789`. */
export const formatAmount = (value: number): string => amount.format(value)

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** `just now`, `12 min ago`, `3 h ago`, `2 d ago`. */
export function formatAge(ageMs: number): string {
  if (ageMs < MINUTE_MS) return 'just now'
  if (ageMs < HOUR_MS) return `${Math.floor(ageMs / MINUTE_MS)} min ago`
  if (ageMs < DAY_MS) return `${Math.floor(ageMs / HOUR_MS)} h ago`
  return `${Math.floor(ageMs / DAY_MS)} d ago`
}

/** `Oct 15, 15:00` in UTC, so chart tooltips don't depend on the machine's time zone. */
export const formatTimestamp = (iso: string): string =>
  new Intl.DateTimeFormat(LOCALE, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(iso))

/** The CSS class for a percent change: up, down or flat. */
export const changeClass = (value: number): string => {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}
