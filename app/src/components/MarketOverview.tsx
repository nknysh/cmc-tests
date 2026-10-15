import { Link } from 'react-router-dom'
import type { Coin } from '../data/types'
import { changeClass, formatCompactUsd, formatPercent } from '../lib/format'
import { summarize, topMovers } from '../lib/market'
import { CoinLogo } from './CoinLogo'

export function MarketSummaryBar({ coins }: Readonly<{ coins: readonly Coin[] }>) {
  const summary = summarize(coins)
  const stats = [
    { id: 'market-cap', label: 'Total market cap', value: formatCompactUsd(summary.totalMarketCap) },
    { id: 'volume', label: `24h volume (top ${coins.length})`, value: formatCompactUsd(summary.volume24h) },
    { id: 'btc-dominance', label: 'BTC dominance', value: `${summary.btcDominance.toFixed(1)}%` },
    { id: 'breadth', label: 'Gainers / losers (24h)', value: `${summary.gainers} / ${summary.losers}` },
  ]
  return (
    <section aria-label="Market summary">
      <dl className="summary">
        {stats.map((stat) => (
          <div key={stat.id} className="card">
            <dt>{stat.label}</dt>
            <dd data-testid={`stat-${stat.id}`}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function MoverList({ title, coins }: Readonly<{ title: string; coins: Coin[] }>) {
  return (
    <section className="card movers" aria-labelledby={`${title}-heading`.replaceAll(' ', '-')}>
      <h2 id={`${title}-heading`.replaceAll(' ', '-')}>{title}</h2>
      {coins.length === 0 ? (
        <p className="muted">None right now.</p>
      ) : (
        <ol>
          {coins.map((coin) => (
            <li key={coin.id}>
              <Link to={`/coin/${coin.slug}`}>
                <CoinLogo id={coin.id} size={20} />
                <span>{coin.name}</span>
              </Link>
              <span className={changeClass(coin.percentChange24h)}>{formatPercent(coin.percentChange24h)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function TopMovers({ coins }: Readonly<{ coins: readonly Coin[] }>) {
  const { gainers, losers } = topMovers(coins)
  return (
    <div className="movers-grid">
      <MoverList title="Top gainers 24h" coins={gainers} />
      <MoverList title="Top losers 24h" coins={losers} />
    </div>
  )
}
