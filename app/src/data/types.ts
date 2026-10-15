/**
 * Shape of the static JSON the app reads from `data/`. It's written by
 * `scripts/snapshot-listings.ts` from GET /v3/cryptocurrency/listings/latest,
 * mapped to these camelCase domain types, never the raw CMC response. The
 * snapshot script imports these types too, so writer and reader can't drift.
 */

export interface Coin {
  id: number
  name: string
  symbol: string
  slug: string
  rank: number
  /** Tag slugs, e.g. `layer-1`, `stablecoin`. */
  tags: string[]
  dateAdded: string
  circulatingSupply: number
  totalSupply: number
  /** Null when the coin has no max supply. */
  maxSupply: number | null
  /** USD values. */
  price: number
  marketCap: number
  volume24h: number
  /** This coin's share of the whole crypto market cap, in percent. */
  marketCapDominance: number
  percentChange1h: number
  percentChange24h: number
  percentChange7d: number
  percentChange30d: number
}

/** `latest.json`: one listings/latest call. */
export interface MarketSnapshot {
  /** ISO time the snapshot was taken (the response's `status.timestamp`). */
  updatedAt: string
  coins: Coin[]
}

/** One snapshot's USD prices, keyed by coin id. */
export interface HistoryPoint {
  t: string
  prices: Record<string, number>
}

/** `history.json`: a rolling window of past snapshots' prices, oldest first. */
export interface PriceHistory {
  points: HistoryPoint[]
}
