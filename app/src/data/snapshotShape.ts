import type { Coin } from './types'

/**
 * Shape and value checks for a loaded snapshot (APP-03/AC-7). The file is
 * parsed JSON, so nothing about it is guaranteed: one malformed coin rejects
 * the whole snapshot, like an invalid price does (APP-06). Value checks are
 * limited to what real data never does; e.g. symbols may repeat, and total
 * supply may be below circulating supply. Prices are APP-06's (validate.ts).
 */

const NUMBER_FIELDS = [
  'id',
  'rank',
  'circulatingSupply',
  'totalSupply',
  'price',
  'marketCap',
  'volume24h',
  'marketCapDominance',
  'percentChange1h',
  'percentChange24h',
  'percentChange7d',
  'percentChange30d',
] as const satisfies readonly (keyof Coin)[]

const STRING_FIELDS = ['name', 'symbol', 'slug', 'dateAdded'] as const satisfies readonly (keyof Coin)[]

/** Amounts that can't be negative; `maxSupply` too, when set. */
const AMOUNT_FIELDS = ['circulatingSupply', 'totalSupply', 'marketCap', 'volume24h'] as const satisfies readonly (keyof Coin)[]

/** Fields no two coins may share. */
const UNIQUE_FIELDS = ['id', 'slug', 'rank'] as const satisfies readonly (keyof Coin)[]

const MAX_DOMINANCE_PERCENT = 100

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isDateString = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0

/** Why `coin` doesn't have a coin's fields and types, or null when it does. */
function coinShapeProblem(coin: unknown): string | null {
  if (!isRecord(coin)) return 'is not an object'
  const badNumber = NUMBER_FIELDS.find((field) => typeof coin[field] !== 'number')
  if (badNumber) return `has no numeric ${badNumber}`
  const badString = STRING_FIELDS.find((field) => typeof coin[field] !== 'string')
  if (badString) return `has no string ${badString}`
  if (!Array.isArray(coin.tags) || !coin.tags.every((tag) => typeof tag === 'string')) return 'has no list of tag strings'
  if (coin.maxSupply !== null && typeof coin.maxSupply !== 'number') return 'has a maxSupply that is neither a number nor null'
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
  return duplicateProblem(value.coins as Coin[])
}
