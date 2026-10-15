import { useState, type MouseEvent } from 'react'
import type { HistoryPoint } from '../data/types'
import { formatPrice, formatTimestamp } from '../lib/format'

const WIDTH = 600
const HEIGHT = 200
const PADDING = 8

interface Sample {
  t: string
  price: number
}

/** One coin's prices from the snapshot history, oldest first. */
export function samplesFor(points: readonly HistoryPoint[], coinId: number, sinceMs: number): Sample[] {
  return points
    .filter((p) => Date.parse(p.t) >= sinceMs && p.prices[String(coinId)] !== undefined)
    .map((p) => ({ t: p.t, price: p.prices[String(coinId)] }))
}

/** SVG line chart. Hovering shows the nearest sample's price and time. */
export function PriceChart({ samples, label }: Readonly<{ samples: Sample[]; label: string }>) {
  const [hover, setHover] = useState<number | null>(null)

  if (samples.length < 2) {
    return <p className="muted">Not enough price history yet.</p>
  }

  const prices = samples.map((s) => s.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  const x = (i: number) => PADDING + (i / (samples.length - 1)) * (WIDTH - 2 * PADDING)
  const y = (price: number) => HEIGHT - PADDING - ((price - min) / span) * (HEIGHT - 2 * PADDING)
  const line = samples.map((s, i) => `${x(i).toFixed(1)},${y(s.price).toFixed(1)}`).join(' ')
  const trend = samples.at(-1)!.price >= samples[0].price ? 'up' : 'down'

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - box.left) / box.width
    setHover(Math.round(Math.min(1, Math.max(0, ratio)) * (samples.length - 1)))
  }

  const active = hover === null ? null : samples[hover]

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${label}: from ${formatPrice(samples[0].price)} to ${formatPrice(samples.at(-1)!.price)}, low ${formatPrice(min)}, high ${formatPrice(max)}`}
        data-testid="price-chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <polyline className={`chart-line ${trend}`} points={line} fill="none" />
        {hover !== null && (
          <>
            <line className="chart-guide" x1={x(hover)} x2={x(hover)} y1={0} y2={HEIGHT} />
            <circle className={`chart-dot ${trend}`} cx={x(hover)} cy={y(samples[hover].price)} r={4} />
          </>
        )}
      </svg>
      <figcaption className="chart-tooltip" data-testid="chart-tooltip" aria-live="polite">
        {active ? `${formatPrice(active.price)} · ${formatTimestamp(active.t)} UTC` : 'Hover the chart for prices'}
      </figcaption>
    </figure>
  )
}
