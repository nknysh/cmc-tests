import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSnapshot } from '../data/MarketData'
import type { Coin } from '../data/types'
import { CoinSelect } from '../components/CoinSelect'
import { Price } from '../components/Price'
import { changeClass, formatCompactUsd, formatNumber, formatPercent } from '../lib/format'

const DEFAULT_A = 'bitcoin'
const DEFAULT_B = 'ethereum'

const METRICS: { label: string; render: (coin: Coin) => ReactNode; change?: (coin: Coin) => number }[] = [
  { label: 'Rank', render: (c) => `#${c.rank}` },
  { label: 'Price', render: (c) => <Price value={c.price} /> },
  { label: 'Market cap', render: (c) => formatCompactUsd(c.marketCap) },
  { label: 'Volume (24h)', render: (c) => formatCompactUsd(c.volume24h) },
  { label: '1h change', render: (c) => formatPercent(c.percentChange1h), change: (c) => c.percentChange1h },
  { label: '24h change', render: (c) => formatPercent(c.percentChange24h), change: (c) => c.percentChange24h },
  { label: '7d change', render: (c) => formatPercent(c.percentChange7d), change: (c) => c.percentChange7d },
  { label: '30d change', render: (c) => formatPercent(c.percentChange30d), change: (c) => c.percentChange30d },
  { label: 'Circulating supply', render: (c) => formatNumber(c.circulatingSupply) },
  { label: 'Max supply', render: (c) => (c.maxSupply === null ? '∞' : formatNumber(c.maxSupply)) },
]

/** Two coins side by side. The pair is kept in the URL (`?a=…&b=…`). */
export function ComparePage() {
  const { coins } = useSnapshot()
  const [params, setParams] = useSearchParams()
  const a = params.get('a') ?? DEFAULT_A
  const b = params.get('b') ?? DEFAULT_B
  const coinA = coins.find((c) => c.slug === a)
  const coinB = coins.find((c) => c.slug === b)
  const set = (key: 'a' | 'b', value: string) => setParams({ a, b, [key]: value }, { replace: true })
  let problem: string | null = null
  if (!coinA || !coinB) problem = "One of these coins isn't in the current data. Pick another."
  else if (a === b) problem = 'Pick two different coins to compare.'

  return (
    <section>
      <h1>Compare coins</h1>
      <div className="toolbar">
        <CoinSelect label="First coin" coins={coins} value={a} onChange={(v) => set('a', v)} />
        <CoinSelect label="Second coin" coins={coins} value={b} onChange={(v) => set('b', v)} />
      </div>
      {problem || !coinA || !coinB ? (
        <p className="field-error" role="alert">
          {problem}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="compare-table" aria-label="Coin comparison">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">{coinA.name}</th>
                <th scope="col">{coinB.name}</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => (
                <tr key={metric.label}>
                  <th scope="row">{metric.label}</th>
                  {[coinA, coinB].map((coin) => (
                    <td key={coin.id} className={metric.change ? `num ${changeClass(metric.change(coin))}` : 'num'}>
                      {metric.render(coin)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
