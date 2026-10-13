import type { z } from 'zod'
import type {
  CmcApiStatusSchema,
  GainersLosersResponseSchema,
  QuoteResponseSchema,
  QuotesLatestV3ResponseSchema,
  SimplePriceResponseSchema,
} from './schemas'

export interface Price {
  price: number
  currency: string
  lastUpdated: string
}

export interface CoinMarketCapClientOptions {
  apiKey: string
  baseUrl?: string
}

export type CmcApiStatus = z.infer<typeof CmcApiStatusSchema>

export type QuoteResponse = z.infer<typeof QuoteResponseSchema>

export interface QuotesLatestOptions {
  /** Comma-separated CoinMarketCap IDs (up to 400). Exactly one of id, slug, or symbol is required. */
  id?: string
  /** Comma-separated cryptocurrency slugs (e.g. "bitcoin,ethereum"). */
  slug?: string
  /** Comma-separated cryptocurrency symbols. Returns every coin sharing a symbol. */
  symbol?: string
  /** Comma-separated fiat/crypto symbols to convert into (Basic plan: one). Cannot be combined with convertId. */
  convert?: string
  /** Comma-separated CoinMarketCap currency IDs to convert into. Cannot be combined with convert. */
  convertId?: string
  /** Comma-separated supplemental fields to return (e.g. "cmc_rank,tags"). API default: a fixed set. */
  aux?: string
  /** When false, an unresolvable id in a list fails the whole call. API default behaves as true. */
  skipInvalid?: boolean
}

export interface QuotesLatestQuote {
  /** The conversion currency's symbol (e.g. "USD"). */
  currency: string
  /** The conversion currency's CoinMarketCap id (e.g. 2781 for USD). */
  currencyId: number
  /** null for inactive coins that share a requested symbol. */
  price: number | null
  marketCap: number | null
  volume24h: number
  percentChange1h: number
  percentChange24h: number
  percentChange7d: number
  lastUpdated: string
}

/** Optional fields are aux fields: undefined when the `aux` param didn't request them. */
export interface QuotesLatestEntry {
  id: number
  name: string
  symbol: string
  slug: string
  numMarketPairs?: number
  cmcRank?: number | null
  dateAdded?: string
  /** Tag slugs. */
  tags?: string[]
  /** The chain a token is issued on; null for a coin with its own chain. */
  platform?: { id: number; tokenAddress: string } | null
  maxSupply?: number | null
  circulatingSupply?: number | null
  totalSupply?: number | null
  isActive?: boolean
  isFiat?: boolean
  quotes: QuotesLatestQuote[]
}

export interface QuotesLatestResult {
  entries: QuotesLatestEntry[]
  /** Call credits the API charged for this request (status.credit_count). */
  creditCount: number
}

export type QuotesLatestV3Response = z.infer<typeof QuotesLatestV3ResponseSchema>

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

export type SimplePriceResponse = z.infer<typeof SimplePriceResponseSchema>

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

export type GainersLosersResponse = z.infer<typeof GainersLosersResponseSchema>
