import { useState } from 'react'
import { useSnapshot } from '../data/MarketData'
import { CoinSelect, USD } from '../components/CoinSelect'
import { formatAmount } from '../lib/format'

export function ConverterPage() {
  const { coins } = useSnapshot()
  const [amount, setAmount] = useState('1')
  const [from, setFrom] = useState('bitcoin')
  const [to, setTo] = useState(USD)

  const unit = (slug: string) => {
    if (slug === USD) return { symbol: 'USD', usd: 1 }
    const coin = coins.find((c) => c.slug === slug)
    return coin ? { symbol: coin.symbol, usd: coin.price } : undefined
  }
  const fromUnit = unit(from)
  const toUnit = unit(to)
  const value = amount.trim() === '' ? Number.NaN : Number(amount)
  const valid = Number.isFinite(value) && value >= 0

  return (
    <section className="card narrow">
      <h1>Converter</h1>
      <form className="stack" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="convert-amount">Amount</label>
          <input
            id="convert-amount"
            type="number"
            min="0"
            step="any"
            value={amount}
            aria-invalid={!valid}
            aria-describedby={valid ? undefined : 'convert-amount-error'}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="convert-amount"
          />
          {!valid && (
            <p id="convert-amount-error" className="field-error" role="alert">
              Enter an amount of 0 or more.
            </p>
          )}
        </div>
        <CoinSelect label="From" testId="convert-from" coins={coins} value={from} onChange={setFrom} includeUsd />
        <button
          type="button"
          className="swap"
          data-testid="convert-swap"
          onClick={() => {
            setFrom(to)
            setTo(from)
          }}
        >
          ⇅ Swap
        </button>
        <CoinSelect label="To" testId="convert-to" coins={coins} value={to} onChange={setTo} includeUsd />
      </form>
      <output className="convert-result" data-testid="conversion-result" aria-live="polite">
        {valid && fromUnit && toUnit
          ? `${formatAmount(value)} ${fromUnit.symbol} = ${formatAmount((value * fromUnit.usd) / toUnit.usd)} ${toUnit.symbol}`
          : '—'}
      </output>
    </section>
  )
}
