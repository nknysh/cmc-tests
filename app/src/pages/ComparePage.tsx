import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSnapshot } from '../data/MarketData'
import type { Coin } from '../data/types'
import { CoinSelect } from '../components/CoinSelect'
import { Price } from '../components/Price'
import { changeClass, formatCompactUsd, formatNumber, formatPercent } from '../lib/format'

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

/**
 * Two coins side by side. The pair is kept in the URL (`?a=…&b=…`). A slug that's
 * absent, empty or not in the snapshot falls back to that choice's default: the
 * top-ranked coin for the first, the second-ranked for the second (CMP-01/AC-7).
 */
export function ComparePage() {
  const { coins } = useSnapshot()
  const [params, setParams] = useSearchParams()
  const bySlug = (slug: string | null) => coins.find((c) => c.slug === slug)
  const coinA: Coin | undefined = bySlug(params.get('a')) ?? coins[0]
  const coinB: Coin | undefined = bySlug(params.get('b')) ?? coins[1] ?? coins[0]
  if (!coinA || !coinB) return null

  // Writes the coins shown, so a fallen-back slug leaves the address (CMP-03/AC-5).
  const set = (key: 'a' | 'b', value: string) =>
    setParams({ a: coinA.slug, b: coinB.slug, [key]: value }, { replace: true })

  return (
    <section>
      <h1>Compare coins</h1>
      <div className="toolbar">
        <CoinSelect label="First coin" testId="compare-first-coin" coins={coins} value={coinA.slug} onChange={(v) => set('a', v)} />
        <CoinSelect label="Second coin" testId="compare-second-coin" coins={coins} value={coinB.slug} onChange={(v) => set('b', v)} />
      </div>
      {coinA.id === coinB.id ? (
        <p className="field-error" role="alert">
          Pick two different coins to compare.
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
