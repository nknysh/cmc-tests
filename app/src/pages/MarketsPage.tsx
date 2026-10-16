import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSnapshot } from '../data/MarketData'
import type { Coin } from '../data/types'
import { CoinLogo } from '../components/CoinLogo'
import { MarketSummaryBar, TopMovers } from '../components/MarketOverview'
import { WatchStar } from '../components/WatchStar'
import { Price } from '../components/Price'
import { changeClass, formatPercent } from '../lib/format'
import {
  COLUMNS,
  DEFAULT_QUERY,
  PAGE_SIZES,
  defaultDir,
  downloadText,
  filterCoins,
  parseCapRange,
  parseQuery,
  categoryTags,
  sortCoins,
  toCsv,
  toParams,
  type Column,
  type MarketQuery,
  type Movement,
  type PageSize,
  type SortKey,
  type TagOption,
} from '../lib/market'
import { STORAGE_KEYS, useStoredState } from '../lib/storage'
import { useWatchlist } from '../lib/watchlist'

const SEARCH_DEBOUNCE_MS = 250
const CSV_FILENAME = 'coinboard-markets.csv'
const PERCENT_KEYS = new Set<SortKey>(['percentChange1h', 'percentChange24h', 'percentChange7d'])

const MOVEMENTS: { value: Movement; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'gainers', label: 'Gainers' },
  { value: 'losers', label: 'Losers' },
]

/**
 * Market query state, mirrored to the URL. Any change other than paging goes
 * back to page 1. The router applies URL updates as a transition, so reading
 * the query straight from the URL would let a controlled radio or checkbox
 * snap back for a moment after a click. Local state updates at once, and the
 * URL follows; a URL change from outside (back/forward, a link) resyncs it.
 */
function useMarketQuery(): [MarketQuery, (patch: Partial<MarketQuery>) => void] {
  const [params, setParams] = useSearchParams()
  const search = params.toString()
  const [query, setQuery] = useState(() => parseQuery(params))

  useEffect(() => setQuery(parseQuery(new URLSearchParams(search))), [search])

  const update = (patch: Partial<MarketQuery>) => {
    const next = { ...query, ...patch }
    if (!('page' in patch)) next.page = 1
    setQuery(next)
    setParams(toParams(next), { replace: true })
  }
  return [query, update]
}

function SearchBox({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChange(draft), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, value, onChange])

  return (
    <label className="field">
      <span>Search</span>
      <input type="search" placeholder="Name or symbol" value={draft} onChange={(e) => setDraft(e.target.value)} />
    </label>
  )
}

function TagFilter({ tags, selected, onChange }: Readonly<{ tags: TagOption[]; selected: string[]; onChange: (tags: string[]) => void }>) {
  const toggle = (tag: string) =>
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag])
  return (
    <details className="dropdown">
      <summary>Tags{selected.length ? ` (${selected.length})` : ''}</summary>
      <fieldset>
        <legend>Show coins with any of these tags</legend>
        {tags.map((tag) => (
          <label key={tag.slug} className="check">
            <input type="checkbox" checked={selected.includes(tag.slug)} onChange={() => toggle(tag.slug)} />
            <span>
              {tag.label} <span className="muted">({tag.count})</span>
            </span>
          </label>
        ))}
        <button type="button" className="link-button" onClick={() => onChange([])} disabled={!selected.length}>
          Clear tags
        </button>
      </fieldset>
    </details>
  )
}

function ColumnMenu({ hidden, onChange }: Readonly<{ hidden: SortKey[]; onChange: (hidden: SortKey[]) => void }>) {
  return (
    <details className="dropdown">
      <summary>Columns</summary>
      <fieldset>
        <legend>Visible columns</legend>
        {COLUMNS.filter((c) => c.hideable).map((column) => (
          <label key={column.key} className="check">
            <input
              type="checkbox"
              checked={!hidden.includes(column.key)}
              onChange={() =>
                onChange(hidden.includes(column.key) ? hidden.filter((k) => k !== column.key) : [...hidden, column.key])
              }
            />
            <span>{column.label}</span>
          </label>
        ))}
      </fieldset>
    </details>
  )
}

function CapRangeFilter({ query, update }: Readonly<{ query: MarketQuery; update: (patch: Partial<MarketQuery>) => void }>) {
  const range = parseCapRange(query.capMin, query.capMax)
  return (
    <fieldset className="cap-range">
      <legend>Market cap (billions USD)</legend>
      <label className="field">
        <span>Min</span>
        <input
          inputMode="decimal"
          value={query.capMin}
          aria-invalid={!range.ok}
          aria-describedby={range.ok ? undefined : 'cap-range-error'}
          onChange={(e) => update({ capMin: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Max</span>
        <input
          inputMode="decimal"
          value={query.capMax}
          aria-invalid={!range.ok}
          aria-describedby={range.ok ? undefined : 'cap-range-error'}
          onChange={(e) => update({ capMax: e.target.value })}
        />
      </label>
      {!range.ok && (
        <p id="cap-range-error" className="field-error" role="alert">
          {range.error}
        </p>
      )}
    </fieldset>
  )
}

function SortHeader({ column, query, onSort }: Readonly<{ column: Column; query: MarketQuery; onSort: (key: SortKey) => void }>) {
  const active = query.sort === column.key
  const ascending = query.dir === 'asc'
  let ariaSort: 'ascending' | 'descending' | 'none' = 'none'
  if (active) ariaSort = ascending ? 'ascending' : 'descending'
  let arrow = ''
  if (active) arrow = ascending ? ' ▲' : ' ▼'
  return (
    <th scope="col" aria-sort={ariaSort} className={column.numeric ? 'num' : undefined}>
      <button type="button" className="sort-button" onClick={() => onSort(column.key)}>
        {column.label}
        <span aria-hidden="true">{arrow}</span>
      </button>
    </th>
  )
}

function cellClass(column: Column, coin: Coin): string | undefined {
  if (PERCENT_KEYS.has(column.key)) return `num ${changeClass(coin[column.key as 'percentChange1h'])}`
  return column.numeric ? 'num' : undefined
}

export function MarketsPage() {
  const { coins } = useSnapshot()
  const [query, update] = useMarketQuery()
  const watchlist = useWatchlist()
  const [hiddenColumns, setHiddenColumns] = useStoredState<SortKey[]>(STORAGE_KEYS.hiddenColumns, [])
  const tags = useMemo(() => categoryTags(coins), [coins])

  const rows = useMemo(
    () => sortCoins(filterCoins(coins, query, watchlist.ids), query.sort, query.dir),
    [coins, query, watchlist.ids],
  )
  const pageCount = Math.max(1, Math.ceil(rows.length / query.size))
  const page = Math.min(query.page, pageCount)
  const pageRows = rows.slice((page - 1) * query.size, page * query.size)
  const columns = COLUMNS.filter((c) => !hiddenColumns.includes(c.key))
  const filtered =
    query.search !== DEFAULT_QUERY.search ||
    query.movement !== DEFAULT_QUERY.movement ||
    query.tags.length > 0 ||
    query.capMin !== DEFAULT_QUERY.capMin ||
    query.capMax !== DEFAULT_QUERY.capMax ||
    query.watchlistOnly

  const onSort = (key: SortKey) =>
    update(query.sort === key ? { dir: query.dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: defaultDir(key) })
  const resetFilters = () =>
    update({ search: '', movement: 'all', tags: [], capMin: '', capMax: '', watchlistOnly: false })

  return (
    <>
      <h1>Cryptocurrency prices by market cap</h1>
      <MarketSummaryBar coins={coins} />
      <TopMovers coins={coins} />

      <section aria-label="Filters" className="toolbar">
        <SearchBox value={query.search} onChange={(search) => update({ search })} />
        <div role="radiogroup" aria-label="24h movement" className="segmented">
          {MOVEMENTS.map((m) => (
            <label key={m.value}>
              <input
                type="radio"
                name="movement"
                value={m.value}
                checked={query.movement === m.value}
                onChange={() => update({ movement: m.value })}
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
        <TagFilter tags={tags} selected={query.tags} onChange={(next) => update({ tags: next })} />
        <ColumnMenu hidden={hiddenColumns} onChange={setHiddenColumns} />
        <label className="check">
          <input
            type="checkbox"
            checked={query.watchlistOnly}
            onChange={(e) => update({ watchlistOnly: e.target.checked })}
          />
          <span>Watchlist only</span>
        </label>
        <CapRangeFilter query={query} update={update} />
        <div className="toolbar-actions">
          <button type="button" onClick={resetFilters} disabled={!filtered}>
            Reset filters
          </button>
          <button type="button" onClick={() => downloadText(CSV_FILENAME, toCsv(rows))} disabled={!rows.length}>
            Export CSV
          </button>
        </div>
      </section>

      <output className="muted result-count" data-testid="result-count">
        {rows.length} {rows.length === 1 ? 'coin' : 'coins'}
      </output>

      {rows.length === 0 ? (
        <div className="empty card">
          <p>{query.watchlistOnly && watchlist.ids.length === 0 ? 'Your watchlist is empty.' : 'No coins match your filters.'}</p>
          <button type="button" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrap coin-table-wrap">
            <table className="coin-table" aria-label="Cryptocurrencies">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="visually-hidden">Watchlist</span>
                  </th>
                  {columns.map((column) => (
                    <SortHeader key={column.key} column={column} query={query} onSort={onSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((coin) => (
                  <tr key={coin.id}>
                    <td>
                      <WatchStar coin={coin} starred={watchlist.has(coin.id)} onToggle={watchlist.toggle} />
                    </td>
                    {columns.map((column) =>
                      column.key === 'name' ? (
                        <td key={column.key}>
                          <Link to={`/coin/${coin.slug}`} className="coin-name">
                            <CoinLogo id={coin.id} />
                            {coin.name} <span className="muted">{coin.symbol}</span>
                          </Link>
                        </td>
                      ) : (
                        <td key={column.key} className={cellClass(column, coin)}>
                          {column.key === 'price' ? <Price value={coin.price} /> : column.format(coin)}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="coin-cards" aria-label="Cryptocurrencies">
            {pageRows.map((coin) => (
              <li key={coin.id} className="card">
                <Link to={`/coin/${coin.slug}`} className="coin-name">
                  <CoinLogo id={coin.id} />
                  <span>
                    #{coin.rank} {coin.name} <span className="muted">{coin.symbol}</span>
                  </span>
                </Link>
                <span>
                  <Price value={coin.price} />
                </span>
                <span className={changeClass(coin.percentChange24h)}>{formatPercent(coin.percentChange24h)}</span>
                <WatchStar coin={coin} starred={watchlist.has(coin.id)} onToggle={watchlist.toggle} />
              </li>
            ))}
          </ul>

          <nav className="pagination" aria-label="Pagination">
            <button type="button" onClick={() => update({ page: page - 1 })} disabled={page <= 1}>
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button type="button" onClick={() => update({ page: page + 1 })} disabled={page >= pageCount}>
              Next
            </button>
            <label className="field inline">
              <span>Rows per page</span>
              <select value={query.size} onChange={(e) => update({ size: Number(e.target.value) as PageSize })}>
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </nav>
        </>
      )}
    </>
  )
}
