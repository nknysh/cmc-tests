export interface Price {
  price: number
  currency: string
  lastUpdated: string
}

export interface CoinMarketCapClientOptions {
  apiKey: string
  baseUrl?: string
}

export interface CmcApiStatus {
  timestamp: string
  error_code: number
  error_message: string | null
  elapsed: number
  credit_count: number
}

export interface QuoteResponse {
  data: Record<
    string,
    Array<{
      quote: {
        USD: {
          price: number
          last_updated: string
        }
      }
    }>
  >
  status: CmcApiStatus
}

export interface SimplePriceOptions {
  /** Comma-separated CoinMarketCap IDs. At least one of id, slug, or symbol is required. */
  id?: string
  /** Comma-separated cryptocurrency slugs (e.g. "bitcoin,ethereum"). */
  slug?: string
  /** Comma-separated cryptocurrency symbols (e.g. "BTC,ETH"). */
  symbol?: string
  /** Comma-separated fiat/crypto symbols to convert into. Cannot be combined with convertId. */
  convert?: string
  /** Comma-separated CoinMarketCap currency IDs to convert into. Cannot be combined with convert. */
  convertId?: string
  includeMarketCap?: boolean
  include24hVolume?: boolean
  include24hChange?: boolean
  includeLastUpdated?: boolean
  /** Shortcut for all four include* flags together; wins over an individual flag set to false. */
  includeAll?: boolean
  /** Decimal places to round price/market-cap/volume values to. */
  precision?: number
  /** When multiple identifiers are requested, drop unresolvable ones instead of failing the whole call. */
  skipInvalid?: boolean
}

export interface SimplePriceQuote {
  currency: string
  price: number
  marketCap?: number
  volume24h?: number
  percentChange24h?: number
  lastUpdated?: string
}

export interface SimplePriceEntry {
  id: number
  name: string
  symbol: string
  slug: string
  quotes: SimplePriceQuote[]
}

export interface SimplePriceResponse {
  data: Array<{
    id: number
    name: string
    symbol: string
    slug: string
    quotes: Array<{
      symbol: string
      price: number
      market_cap?: number
      volume_24h?: number
      percent_change_24h?: number
      last_updated?: string
    }>
  }>
  status: CmcApiStatus
}
