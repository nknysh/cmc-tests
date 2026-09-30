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

export type GainersLosersTimePeriod = '1h' | '24h' | '7d' | '30d'
export type GainersLosersSort = 'percent_change_24h'
export type SortDirection = 'asc' | 'desc'

export interface GainersLosersOptions {
  /** 1-based offset into the ranked list. API default: 1. */
  start?: number
  /** Number of results, 1–1000. API default: 100. */
  limit?: number
  /** Window for gains/losses. API default: 24h. */
  timePeriod?: GainersLosersTimePeriod
  /** Comma-separated fiat/crypto symbols to convert into. Cannot be combined with convertId. */
  convert?: string
  /** Comma-separated CoinMarketCap currency IDs to convert into. Cannot be combined with convert. */
  convertId?: string
  sort?: GainersLosersSort
  /** desc = biggest gainers first, asc = biggest losers first. */
  sortDir?: SortDirection
}

export interface GainersLosersQuote {
  /** The quote's key in the response: a symbol for `convert`, a currency id for `convertId`. */
  currency: string
  price: number
  percentChange1h: number
  percentChange24h: number
  percentChange7d: number
  percentChange30d: number
}

export interface GainersLosersEntry {
  id: number
  name: string
  symbol: string
  slug: string
  quotes: GainersLosersQuote[]
}

export interface GainersLosersResult {
  entries: GainersLosersEntry[]
  /** Call credits the API charged for this request (status.credit_count). */
  creditCount: number
}

export interface GainersLosersResponse {
  data: Array<{
    id: number
    name: string
    symbol: string
    slug: string
    quote: Record<
      string,
      {
        price: number
        percent_change_1h: number
        percent_change_24h: number
        percent_change_7d: number
        percent_change_30d: number
      }
    >
  }>
  status: CmcApiStatus
}
