import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePriceHistory, useSnapshot } from '../data/MarketData'
import type { Coin } from '../data/types'
import { CoinLogo } from '../components/CoinLogo'
import { PriceChart, samplesFor } from '../components/PriceChart'
import { LoadError } from '../components/StatusView'
import { WatchStar } from '../components/WatchStar'
import { changeClass, formatCompactUsd, formatNumber, formatPercent, formatPrice } from '../lib/format'
import { useWatchlist } from '../lib/watchlist'

const HOUR_MS = 60 * 60 * 1000
const RANGES = [
  { id: '24h', label: '24h', ms: 24 * HOUR_MS },
  { id: '7d', label: '7d', ms: 7 * 24 * HOUR_MS },
] as const
type RangeId = (typeof RANGES)[number]['id']

/** Tags shown before "Show all". */
const TAG_PREVIEW = 8

function SupplyBar({ coin }: Readonly<{ coin: Coin }>) {
  if (coin.maxSupply === null) {
    return <p className="muted">No max supply</p>
  }
  const percent = Math.min(100, (coin.circulatingSupply / coin.maxSupply) * 100)
  return (
    <div>
      <div
        className="progress"
        role="progressbar"
        aria-label="Circulating supply of max supply"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="muted">{percent.toFixed(1)}% of max supply in circulation</p>
    </div>
  )
}

function Chart({ coin, snapshotTime }: Readonly<{ coin: Coin; snapshotTime: string }>) {
  const [range, setRange] = useState<RangeId>('24h')
  const { state, retry } = usePriceHistory()
  const selected = RANGES.find((r) => r.id === range)!

  return (
    <section className="card" aria-labelledby="chart-heading">
      <div className="section-head">
        <h2 id="chart-heading">Price chart</h2>
        <div role="group" aria-label="Chart range" className="segmented">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {state.status === 'loading' && <p className="muted">Loading price history…</p>}
      {state.status === 'error' && <LoadError message={state.message} onRetry={retry} what="price history" />}
      {state.status === 'ready' && (
        <PriceChart
          label={`${coin.name} price, last ${selected.label}`}
          samples={samplesFor(state.data.points, coin.id, Date.parse(snapshotTime) - selected.ms)}
        />
      )}
    </section>
  )
}

export function CoinPage() {
  const { slug } = useParams()
  const snapshot = useSnapshot()
  const watchlist = useWatchlist()
  const [showAllTags, setShowAllTags] = useState(false)
  const coin = snapshot.coins.find((c) => c.slug === slug)

  if (!coin) {
    return (
      <section className="empty card">
        <h1>Coin not found</h1>
        <p>No coin with the slug “{slug}” is in the current top {snapshot.coins.length}.</p>
        <Link to="/">Back to all coins</Link>
      </section>
    )
  }

  const changes = [
    { label: '1h', value: coin.percentChange1h },
    { label: '24h', value: coin.percentChange24h },
    { label: '7d', value: coin.percentChange7d },
    { label: '30d', value: coin.percentChange30d },
  ]
  const stats = [
    { label: 'Market cap', value: formatCompactUsd(coin.marketCap) },
    { label: 'Volume (24h)', value: formatCompactUsd(coin.volume24h) },
    { label: 'Market dominance', value: `${coin.marketCapDominance.toFixed(2)}%` },
    { label: 'Circulating supply', value: `${formatNumber(coin.circulatingSupply)} ${coin.symbol}` },
    { label: 'Total supply', value: `${formatNumber(coin.totalSupply)} ${coin.symbol}` },
    { label: 'Max supply', value: coin.maxSupply === null ? '∞' : `${formatNumber(coin.maxSupply)} ${coin.symbol}` },
  ]
  const tags = showAllTags ? coin.tags : coin.tags.slice(0, TAG_PREVIEW)

  return (
    <article className="coin-page">
      <Link to="/" className="back-link">
        ← All coins
      </Link>
      <header className="coin-header">
        <CoinLogo id={coin.id} size={40} />
        <h1>
          {coin.name} <span className="muted">{coin.symbol}</span>
        </h1>
        <span className="badge">Rank #{coin.rank}</span>
        <WatchStar coin={coin} starred={watchlist.has(coin.id)} onToggle={watchlist.toggle} />
      </header>

      <p className="coin-price" data-testid="coin-price">
        {formatPrice(coin.price)}
      </p>
      <ul className="changes" aria-label="Price change">
        {changes.map((change) => (
          <li key={change.label}>
            <span className="muted">{change.label}</span>{' '}
            <span className={changeClass(change.value)}>{formatPercent(change.value)}</span>
          </li>
        ))}
      </ul>

      <Chart coin={coin} snapshotTime={snapshot.updatedAt} />

      <section className="card" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Statistics</h2>
        <dl className="stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
        <SupplyBar coin={coin} />
      </section>

      {coin.tags.length > 0 && (
        <section className="card" aria-labelledby="tags-heading">
          <h2 id="tags-heading">Tags</h2>
          <ul className="tags">
            {tags.map((tag) => (
              <li key={tag} className="badge">
                {tag}
              </li>
            ))}
          </ul>
          {coin.tags.length > TAG_PREVIEW && (
            <button type="button" className="link-button" onClick={() => setShowAllTags((v) => !v)}>
              {showAllTags ? 'Show fewer' : `Show all ${coin.tags.length} tags`}
            </button>
          )}
        </section>
      )}
    </article>
  )
}
