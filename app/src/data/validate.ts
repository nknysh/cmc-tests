import type { Coin, MarketSnapshot } from './types'

/**
 * Price checks shared by the snapshot script (which rejects a snapshot with
 * any invalid price) and the app (which falls back to the previous snapshot
 * when the published one has one anyway). See APP-06.
 */

/** A price is valid when it's a finite number above 0, however small. */
export const isValidPrice = (price: number): boolean => Number.isFinite(price) && price > 0

/**
 * The coins priced at 0 or below. A file with no coin list returns none:
 * checking the snapshot's shape is the loader's job (APP-03), not this one's.
 */
export function findInvalidPrices(snapshot: MarketSnapshot): Coin[] {
  return Array.isArray(snapshot.coins) ? snapshot.coins.filter((coin) => !isValidPrice(coin.price)) : []
}
