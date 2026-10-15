import type { Coin } from '../data/types'
import { formatCompactUsd, formatPercent, formatPrice } from './format'

export type SortKey =
  | 'rank'
  | 'name'
  | 'price'
  | 'percentChange1h'
  | 'percentChange24h'
  | 'percentChange7d'
  | 'marketCap'
  | 'volume24h'
export type SortDir = 'asc' | 'desc'
export type Movement = 'all' | 'gainers' | 'losers'

export interface Column {
  key: SortKey
  label: string
  /** Rank and name can't be hidden: a row needs them to make sense. */
  hideable: boolean
  numeric: boolean
  format: (coin: Coin) => string
}

export const COLUMNS: readonly Column[] = [
  { key: 'rank', label: '#', hideable: false, numeric: true, format: (c) => String(c.rank) },
  { key: 'name', label: 'Name', hideable: false, numeric: false, format: (c) => c.name },
  { key: 'price', label: 'Price', hideable: true, numeric: true, format: (c) => formatPrice(c.price) },
  {
    key: 'percentChange1h',
    label: '1h %',
    hideable: true,
    numeric: true,
    format: (c) => formatPercent(c.percentChange1h),
  },
  {
    key: 'percentChange24h',
    label: '24h %',
    hideable: true,
    numeric: true,
    format: (c) => formatPercent(c.percentChange24h),
  },
  {
    key: 'percentChange7d',
    label: '7d %',
    hideable: true,
    numeric: true,
    format: (c) => formatPercent(c.percentChange7d),
  },
  {
    key: 'marketCap',
    label: 'Market cap',
    hideable: true,
    numeric: true,
    format: (c) => formatCompactUsd(c.marketCap),
  },
  {
    key: 'volume24h',
    label: 'Volume (24h)',
    hideable: true,
    numeric: true,
    format: (c) => formatCompactUsd(c.volume24h),
  },
]

/** The first click on a column sorts by this direction: rank and name A→Z, numbers biggest first. */
export const defaultDir = (key: SortKey): SortDir => (key === 'rank' || key === 'name' ? 'asc' : 'desc')

export function sortCoins(coins: readonly Coin[], key: SortKey, dir: SortDir): Coin[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...coins].sort((a, b) => {
    const order = key === 'name' ? a.name.localeCompare(b.name, 'en') : a[key] - b[key]
    return order === 0 ? a.rank - b.rank : order * sign
  })
}

export const PAGE_SIZES = [10, 25, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]

/** Filters, sort and paging for the markets table. Kept in the URL so a link restores the view. */
export interface MarketQuery {
  search: string
  sort: SortKey
  dir: SortDir
  page: number
  size: PageSize
  movement: Movement
  tags: string[]
  /** Market-cap bounds in billions of USD, as typed: validated by parseCapRange. */
  capMin: string
  capMax: string
  watchlistOnly: boolean
}

export const DEFAULT_QUERY: MarketQuery = {
  search: '',
  sort: 'rank',
  dir: 'asc',
  page: 1,
  size: 25,
  movement: 'all',
  tags: [],
  capMin: '',
  capMax: '',
  watchlistOnly: false,
}

const SORT_KEYS = new Set<string>(COLUMNS.map((c) => c.key))

export function parseQuery(params: URLSearchParams): MarketQuery {
  const sort = params.get('sort') ?? ''
  const size = Number(params.get('size'))
  const page = Number(params.get('page'))
  const movement = params.get('move')
  return {
    search: params.get('q') ?? '',
    sort: SORT_KEYS.has(sort) ? (sort as SortKey) : DEFAULT_QUERY.sort,
    dir: params.get('dir') === 'desc' ? 'desc' : 'asc',
    page: Number.isInteger(page) && page > 0 ? page : DEFAULT_QUERY.page,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULT_QUERY.size,
    movement: movement === 'gainers' || movement === 'losers' ? movement : 'all',
    tags: params.get('tags')?.split(',').filter(Boolean) ?? [],
    capMin: params.get('capMin') ?? '',
    capMax: params.get('capMax') ?? '',
    watchlistOnly: params.get('watch') === '1',
  }
}

/** Only non-default values go in the URL, so the plain markets link stays `#/`. */
export function toParams(query: MarketQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.search) params.set('q', query.search)
  if (query.sort !== DEFAULT_QUERY.sort) params.set('sort', query.sort)
  if (query.dir !== DEFAULT_QUERY.dir) params.set('dir', query.dir)
  if (query.page !== DEFAULT_QUERY.page) params.set('page', String(query.page))
  if (query.size !== DEFAULT_QUERY.size) params.set('size', String(query.size))
  if (query.movement !== 'all') params.set('move', query.movement)
  if (query.tags.length) params.set('tags', query.tags.join(','))
  if (query.capMin) params.set('capMin', query.capMin)
  if (query.capMax) params.set('capMax', query.capMax)
  if (query.watchlistOnly) params.set('watch', '1')
  return params
}

const BILLION = 1e9

export type CapRange = { ok: true; min?: number; max?: number } | { ok: false; error: string }

/** Validates the market-cap inputs. An invalid range is reported and not applied. */
export function parseCapRange(capMin: string, capMax: string): CapRange {
  const parse = (raw: string) => (raw.trim() === '' ? undefined : Number(raw))
  const min = parse(capMin)
  const max = parse(capMax)
  for (const value of [min, max]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      return { ok: false, error: 'Enter a market cap of 0 or more, in billions.' }
    }
  }
  if (min !== undefined && max !== undefined && min > max) {
    return { ok: false, error: 'Min market cap must not exceed max.' }
  }
  return { ok: true, min: min === undefined ? undefined : min * BILLION, max: max === undefined ? undefined : max * BILLION }
}

export function filterCoins(coins: readonly Coin[], query: MarketQuery, watchlist: readonly number[]): Coin[] {
  const needle = query.search.trim().toLowerCase()
  const range = parseCapRange(query.capMin, query.capMax)
  return coins.filter((coin) => {
    if (needle && !coin.name.toLowerCase().includes(needle) && !coin.symbol.toLowerCase().includes(needle)) return false
    if (query.movement === 'gainers' && !(coin.percentChange24h > 0)) return false
    if (query.movement === 'losers' && !(coin.percentChange24h < 0)) return false
    if (query.tags.length && !query.tags.some((tag) => coin.tags.includes(tag))) return false
    if (query.watchlistOnly && !watchlist.includes(coin.id)) return false
    if (range.ok && range.min !== undefined && coin.marketCap < range.min) return false
    if (range.ok && range.max !== undefined && coin.marketCap > range.max) return false
    return true
  })
}

/**
 * Categories offered in the tag filter, by CMC tag slug. CMC's most frequent
 * tags are exchange listings and investor portfolios, which make poor filters,
 * so the list is curated.
 */
export const CATEGORY_TAGS: readonly { slug: string; label: string }[] = [
  { slug: 'layer-1', label: 'Layer 1' },
  { slug: 'layer-2', label: 'Layer 2' },
  { slug: 'smart-contracts', label: 'Smart contracts' },
  { slug: 'defi', label: 'DeFi' },
  { slug: 'stablecoin', label: 'Stablecoins' },
  { slug: 'payments', label: 'Payments' },
  { slug: 'mineable', label: 'Mineable' },
  { slug: 'memes', label: 'Memes' },
  { slug: 'ai-big-data', label: 'AI & big data' },
  { slug: 'real-world-assets-protocols', label: 'Real-world assets' },
  { slug: 'gaming', label: 'Gaming' },
]

export interface TagOption {
  slug: string
  label: string
  count: number
}

/** The categories at least one listed coin has, with how many coins have each. */
export function categoryTags(coins: readonly Coin[]): TagOption[] {
  return CATEGORY_TAGS.map((tag) => ({ ...tag, count: coins.filter((c) => c.tags.includes(tag.slug)).length })).filter(
    (tag) => tag.count > 0,
  )
}

export interface MarketSummary {
  /** Whole-market cap, derived from the top coin's cap and its dominance. */
  totalMarketCap: number
  /** Sum over the listed coins only. */
  volume24h: number
  btcDominance: number
  gainers: number
  losers: number
}

const CMC_ID_BTC = 1

export function summarize(coins: readonly Coin[]): MarketSummary {
  const anchor = coins.find((c) => c.marketCapDominance > 0)
  const btc = coins.find((c) => c.id === CMC_ID_BTC)
  return {
    totalMarketCap: anchor ? anchor.marketCap / (anchor.marketCapDominance / 100) : 0,
    volume24h: coins.reduce((sum, c) => sum + c.volume24h, 0),
    btcDominance: btc?.marketCapDominance ?? 0,
    gainers: coins.filter((c) => c.percentChange24h > 0).length,
    losers: coins.filter((c) => c.percentChange24h < 0).length,
  }
}

export function topMovers(coins: readonly Coin[], count = 5): { gainers: Coin[]; losers: Coin[] } {
  const byChange = sortCoins(coins, 'percentChange24h', 'desc')
  return {
    gainers: byChange.filter((c) => c.percentChange24h > 0).slice(0, count),
    losers: byChange.filter((c) => c.percentChange24h < 0).reverse().slice(0, count),
  }
}

const csvCell = (value: string | number): string => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** Every column (hidden or not) for the given rows, plus the symbol after the name. */
export function toCsv(coins: readonly Coin[]): string {
  const header = ['Rank', 'Name', 'Symbol', 'Price (USD)', '1h %', '24h %', '7d %', 'Market cap (USD)', 'Volume 24h (USD)']
  const rows = coins.map((c) => [
    c.rank,
    c.name,
    c.symbol,
    c.price,
    c.percentChange1h,
    c.percentChange24h,
    c.percentChange7d,
    c.marketCap,
    c.volume24h,
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}

export function downloadText(filename: string, text: string, type = 'text/csv'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
