import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from '../data/MarketData'
import { CoinSelect, USD } from '../components/CoinSelect'
import { formatAmount } from '../lib/format'

/** The largest Amount the converter accepts. */
const MAX_AMOUNT = '1000000000'
/** What Amount may hold while typing: digits and at most one decimal point. */
const AMOUNT_CHARS = /^\d*\.?\d*$/

const EMPTY_ERROR = 'Enter an amount of 0 or more.'
const MAX_ERROR = 'Enter an amount up to 1,000,000,000.'

/**
 * Compares the digit string with MAX_AMOUNT exactly, so a value just above it
 * (e.g. `1000000000.00000001`) isn't rounded down to the maximum.
 */
function exceedsMax(amount: string): boolean {
  const [whole, fraction = ''] = amount.split('.')
  const digits = whole.replace(/^0+/, '')
  if (digits.length !== MAX_AMOUNT.length) return digits.length > MAX_AMOUNT.length
  if (digits !== MAX_AMOUNT) return digits > MAX_AMOUNT
  return /[1-9]/.test(fraction)
}

type AmountState = { kind: 'valid'; value: number } | { kind: 'empty' | 'incomplete' | 'tooLarge' }

function parseAmount(amount: string): AmountState {
  if (amount === '') return { kind: 'empty' }
  if (amount === '.' || amount.endsWith('.')) return { kind: 'incomplete' }
  if (exceedsMax(amount)) return { kind: 'tooLarge' }
  return { kind: 'valid', value: Number(amount) }
}

export function ConverterPage() {
  const { coins } = useSnapshot()
  const [amount, setAmount] = useState('1')
  // An incomplete Amount only shows its error once focus has left the field.
  const [amountBlurred, setAmountBlurred] = useState(false)
  // Empty until chosen, so From follows the snapshot's top-ranked coin.
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(USD)

  // A currency that isn't in the snapshot falls back to its side's default.
  const available = (slug: string) => slug === USD || coins.some((c) => c.slug === slug)
  const fromSlug = available(from) ? from : (coins[0]?.slug ?? USD)
  const toSlug = available(to) ? to : USD

  const unit = (slug: string) => {
    if (slug === USD) return { symbol: 'USD', usd: 1 }
    const coin = coins.find((c) => c.slug === slug)
    return coin ? { symbol: coin.symbol, usd: coin.price } : undefined
  }
  const fromUnit = unit(fromSlug)
  const toUnit = unit(toSlug)

  const parsed = parseAmount(amount)
  let error: string | undefined
  if (parsed.kind === 'empty' || (parsed.kind === 'incomplete' && amountBlurred)) error = EMPTY_ERROR
  else if (parsed.kind === 'tooLarge') error = MAX_ERROR

  // Cancel an edit (a typed character, a paste or a drop) that would leave Amount with anything
  // else, before it reaches the field, so the caret and the field's undo history stay intact.
  const amountRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const input = amountRef.current
    if (!input) return
    const guard = (e: InputEvent) => {
      if (!e.inputType.startsWith('insert')) return
      const text = e.data ?? e.dataTransfer?.getData('text/plain') ?? ''
      const start = input.selectionStart ?? input.value.length
      const end = input.selectionEnd ?? start
      if (!AMOUNT_CHARS.test(input.value.slice(0, start) + text + input.value.slice(end))) e.preventDefault()
    }
    input.addEventListener('beforeinput', guard)
    return () => input.removeEventListener('beforeinput', guard)
  }, [])

  return (
    <section className="card narrow">
      <h1>Converter</h1>
      <form className="stack" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="convert-amount">Amount</label>
          <input
            id="convert-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            aria-invalid={error !== undefined}
            aria-describedby={error ? 'convert-amount-error' : undefined}
            ref={amountRef}
            onChange={(e) => {
              // Edits that can't be cancelled (e.g. IME composition) are dropped here instead.
              if (!AMOUNT_CHARS.test(e.target.value)) return
              setAmount(e.target.value)
              setAmountBlurred(false)
            }}
            onBlur={() => setAmountBlurred(true)}
            data-testid="convert-amount"
          />
          {error && (
            <p id="convert-amount-error" className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <CoinSelect label="From" testId="convert-from" coins={coins} value={fromSlug} onChange={setFrom} includeUsd />
        <button
          type="button"
          className="swap"
          data-testid="convert-swap"
          onClick={() => {
            setFrom(toSlug)
            setTo(fromSlug)
          }}
        >
          ⇅ Swap
        </button>
        <CoinSelect label="To" testId="convert-to" coins={coins} value={toSlug} onChange={setTo} includeUsd />
      </form>
      <output className="convert-result" data-testid="conversion-result" aria-live="polite">
        {parsed.kind === 'valid' && fromUnit && toUnit
          ? `${formatAmount(parsed.value)} ${fromUnit.symbol} = ${formatAmount((parsed.value * fromUnit.usd) / toUnit.usd)} ${toUnit.symbol}`
          : '—'}
      </output>
    </section>
  )
}
