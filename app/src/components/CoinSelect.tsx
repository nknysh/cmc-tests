import { useId } from 'react'
import type { Coin } from '../data/types'

/** Value used for US dollars where a currency select also offers USD. */
export const USD = 'usd'

/** A labelled select over coins (by rank), optionally with US dollars first. Values are slugs. */
export function CoinSelect({
  label,
  coins,
  value,
  onChange,
  includeUsd = false,
}: Readonly<{
  label: string
  coins: readonly Coin[]
  value: string
  onChange: (value: string) => void
  includeUsd?: boolean
}>) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {includeUsd && <option value={USD}>US Dollar (USD)</option>}
        {coins.map((coin) => (
          <option key={coin.id} value={coin.slug}>
            {coin.name} ({coin.symbol})
          </option>
        ))}
      </select>
    </div>
  )
}
