import { useId } from 'react'
import type { Coin } from '../data/types'

/** Value used for US dollars where a currency select also offers USD. */
export const USD = 'usd'

/**
 * A labelled select over coins (by rank), optionally with US dollars first. Values are slugs.
 * The select gets `testId`, its options `<testId>-option-<n>` in list order.
 */
export function CoinSelect({
  label,
  testId,
  coins,
  value,
  onChange,
  includeUsd = false,
}: Readonly<{
  label: string
  testId: string
  coins: readonly Coin[]
  value: string
  onChange: (value: string) => void
  includeUsd?: boolean
}>) {
  const id = useId()
  const offset = includeUsd ? 1 : 0
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
        {includeUsd && (
          <option value={USD} data-testid={`${testId}-option-1`}>
            US Dollar (USD)
          </option>
        )}
        {coins.map((coin, i) => (
          <option key={coin.id} value={coin.slug} data-testid={`${testId}-option-${i + 1 + offset}`}>
            {coin.name} ({coin.symbol})
          </option>
        ))}
      </select>
    </div>
  )
}
