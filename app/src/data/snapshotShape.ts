import type { Coin } from './types'

/**
 * Shape and value checks for a loaded snapshot (APP-03/AC-7). The file is
 * parsed JSON, so nothing about it is guaranteed: one malformed coin rejects
 * the whole snapshot, like an invalid price does (APP-06). Value checks are
 * limited to what real data never does; e.g. symbols may repeat, and total
 * supply may be below circulating supply. Prices are APP-06's (validate.ts).
 */

type FieldType = 'number' | 'string' | 'string list' | 'number or null'

/**
 * Every Coin field and its JSON type. A Record over `keyof Coin`, so adding a
 * field to Coin doesn't compile until it's listed here, and the shape check
 * below can't silently skip it.
 */
const COIN_FIELD_TYPES: Record<keyof Coin, FieldType> = {
  id: 'number',
  name: 'string',
  symbol: 'string',
  slug: 'string',
  rank: 'number',
  tags: 'string list',
  dateAdded: 'string',
  circulatingSupply: 'number',
  totalSupply: 'number',
  maxSupply: 'number or null',
  price: 'number',
  marketCap: 'number',
  volume24h: 'number',
  marketCapDominance: 'number',
  percentChange1h: 'number',
  percentChange24h: 'number',
  percentChange7d: 'number',
  percentChange30d: 'number',
}

const HAS_FIELD_TYPE: Record<FieldType, (value: unknown) => boolean> = {
  number: (value) => typeof value === 'number',
  string: (value) => typeof value === 'string',
  'string list': (value) => Array.isArray(value) && value.every((item) => typeof item === 'string'),
  'number or null': (value) => value === null || typeof value === 'number',
}

/** Amounts that can't be negative; `maxSupply` too, when set. */
const AMOUNT_FIELDS = ['circulatingSupply', 'totalSupply', 'marketCap', 'volume24h'] as const satisfies readonly (keyof Coin)[]

/** Fields no two coins may share. */
const UNIQUE_FIELDS = ['id', 'slug', 'rank'] as const satisfies readonly (keyof Coin)[]

const MAX_DOMINANCE_PERCENT = 100

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** ISO 8601 date-time, as CoinMarketCap sends it, e.g. `2026-10-15T08:00:00.000Z`. */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

/**
 * Checks the format before Date.parse, which accepts other formats in ways
 * that differ between engines, so the snapshot script (Node) and the app
 * (browser) always agree.
 */
const isDateString = (value: unknown): value is string =>
  typeof value === 'string' && ISO_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value))

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0

/** Why `coin` doesn't have every Coin field with its type, or null when it does. */
function coinShapeProblem(coin: unknown): string | null {
  if (!isRecord(coin)) return 'is not an object'
  for (const [field, type] of Object.entries(COIN_FIELD_TYPES)) {
    if (!HAS_FIELD_TYPE[type](coin[field])) return `has a ${field} that is not a ${type}`
  }
  return null
}

/** Why a well-shaped coin's values are impossible, or null when they're fine. */
function coinValueProblem(coin: Coin): string | null {
  if (!isPositiveInteger(coin.id)) return 'has an id that is not a positive whole number'
  if (!isPositiveInteger(coin.rank)) return 'has a rank that is not a positive whole number'
  const blank = (['name', 'symbol', 'slug'] as const).find((field) => coin[field].trim() === '')
  if (blank) return `has an empty ${blank}`
  if (!isDateString(coin.dateAdded)) return 'has a dateAdded that is not a date'
  const negative = AMOUNT_FIELDS.find((field) => coin[field] < 0)
  if (negative) return `has a negative ${negative}`
  if (coin.maxSupply !== null && coin.maxSupply < 0) return 'has a negative maxSupply'
  if (coin.marketCapDominance < 0 || coin.marketCapDominance > MAX_DOMINANCE_PERCENT) return 'has a marketCapDominance outside 0-100'
  return null
}

// The cast is safe once coinShapeProblem passes: it checks every field of Coin (see COIN_FIELD_TYPES).
const coinProblem = (coin: unknown): string | null => coinShapeProblem(coin) ?? coinValueProblem(coin as Coin)

/** The first field whose value two coins share, with that value, or null when all are unique. */
function duplicateProblem(coins: readonly Coin[]): string | null {
  for (const field of UNIQUE_FIELDS) {
    const seen = new Set<unknown>()
    for (const coin of coins) {
      if (seen.has(coin[field])) return `more than one coin has ${field} ${String(coin[field])}`
      seen.add(coin[field])
    }
  }
  return null
}

/** Why `value` isn't a market snapshot, or null when it is. */
export function snapshotProblem(value: unknown): string | null {
  if (!isRecord(value)) return 'it is not an object'
  if (!isDateString(value.updatedAt)) return 'updatedAt is not a date'
  if (!Array.isArray(value.coins)) return 'coins is not a list'
  if (value.coins.length === 0) return 'coins is empty'
  for (const [index, coin] of value.coins.entries()) {
    const problem = coinProblem(coin)
    if (problem) return `coin ${index + 1} ${problem}`
  }
  // Every coin passed coinProblem, so each one is a Coin.
  return duplicateProblem(value.coins as Coin[])
}
