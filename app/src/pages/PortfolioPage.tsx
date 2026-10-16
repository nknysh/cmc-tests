import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSnapshot } from '../data/MarketData'
import type { Coin } from '../data/types'
import { CoinSelect } from '../components/CoinSelect'
import { Price } from '../components/Price'
import { changeClass, formatAmount, formatPercent, formatPrice } from '../lib/format'
import { STORAGE_KEYS, useStoredState } from '../lib/storage'

interface Holding {
  coinId: number
  amount: number
}

const AMOUNT_ERROR = 'Enter an amount greater than 0.'

const parseAmount = (raw: string): number | null => {
  const value = Number(raw)
  return raw.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null
}

/** A native modal dialog, open while `open` is true. Escape or Cancel calls onClose. */
function Modal({
  open,
  title,
  testId,
  onClose,
  children,
}: Readonly<{ open: boolean; title: string; testId: string; onClose: () => void; children: ReactNode }>) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog?.open) dialog?.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose} className="card" data-testid={testId}>
      {/* Contents only while open, so a closed dialog's fields never match a locator. */}
      {open && (
        <>
          <h2 id={titleId}>{title}</h2>
          {children}
        </>
      )}
    </dialog>
  )
}

function AddHoldingForm({ coins, onAdd }: Readonly<{ coins: readonly Coin[]; onAdd: (coinId: number, amount: number) => void }>) {
  const [slug, setSlug] = useState(coins[0]?.slug ?? '')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = parseAmount(amount)
    const coin = coins.find((c) => c.slug === slug)
    if (value === null || !coin) {
      setError(AMOUNT_ERROR)
      return
    }
    onAdd(coin.id, value)
    setAmount('')
    setError(null)
  }

  return (
    <form className="toolbar card" onSubmit={submit} aria-label="Add holding" noValidate>
      <CoinSelect label="Coin" testId="holding-coin" coins={coins} value={slug} onChange={setSlug} />
      <div className="field">
        <label htmlFor="holding-amount">Amount</label>
        <input
          id="holding-amount"
          type="number"
          min="0"
          step="any"
          value={amount}
          aria-invalid={error !== null}
          aria-describedby={error ? 'holding-amount-error' : undefined}
          onChange={(e) => setAmount(e.target.value)}
          data-testid="holding-amount"
        />
        {error && (
          <p id="holding-amount-error" className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button type="submit" data-testid="add-holding">
        Add holding
      </button>
    </form>
  )
}

function EditDialog({ holding, coin, onSave, onClose }: Readonly<{ holding: Holding | null; coin?: Coin; onSave: (amount: number) => void; onClose: () => void }>) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAmount(holding ? String(holding.amount) : '')
    setError(null)
  }, [holding])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = parseAmount(amount)
    if (value === null) {
      setError(AMOUNT_ERROR)
      return
    }
    onSave(value)
  }

  return (
    <Modal open={holding !== null} title={`Edit ${coin?.name ?? 'holding'}`} testId="edit-dialog" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="edit-amount">Amount</label>
          <input
            id="edit-amount"
            type="number"
            min="0"
            step="any"
            value={amount}
            aria-invalid={error !== null}
            aria-describedby={error ? 'edit-amount-error' : undefined}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="edit-amount"
          />
          {error && (
            <p id="edit-amount-error" className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={onClose} data-testid="edit-cancel">
            Cancel
          </button>
          <button type="submit" data-testid="edit-save">
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function PortfolioPage() {
  const { coins } = useSnapshot()
  const [holdings, setHoldings] = useStoredState<Holding[]>(STORAGE_KEYS.portfolio, [])
  const [editing, setEditing] = useState<Holding | null>(null)
  const [removing, setRemoving] = useState<Holding | null>(null)
  const coinFor = (id: number) => coins.find((c) => c.id === id)

  const add = (coinId: number, amount: number) =>
    setHoldings((prev) =>
      prev.some((h) => h.coinId === coinId)
        ? prev.map((h) => (h.coinId === coinId ? { ...h, amount: h.amount + amount } : h))
        : [...prev, { coinId, amount }],
    )
  const save = (amount: number) => {
    if (editing) setHoldings((prev) => prev.map((h) => (h.coinId === editing.coinId ? { ...h, amount } : h)))
    setEditing(null)
  }
  const remove = () => {
    if (removing) setHoldings((prev) => prev.filter((h) => h.coinId !== removing.coinId))
    setRemoving(null)
  }

  const rows = holdings.map((holding) => {
    const coin = coinFor(holding.coinId)
    const value = coin ? holding.amount * coin.price : 0
    const valueDayAgo = coin ? value / (1 + coin.percentChange24h / 100) : 0
    return { holding, coin, value, change: value - valueDayAgo, valueDayAgo }
  })
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  const totalChange = rows.reduce((sum, r) => sum + r.change, 0)
  const totalDayAgo = rows.reduce((sum, r) => sum + r.valueDayAgo, 0)
  const totalChangePercent = totalDayAgo ? (totalChange / totalDayAgo) * 100 : 0

  return (
    <section>
      <h1>Portfolio</h1>
      <AddHoldingForm coins={coins} onAdd={add} />

      {rows.length === 0 ? (
        <p className="empty card">No holdings yet. Add one above.</p>
      ) : (
        <>
          <dl className="summary">
            <div className="card">
              <dt>Total value</dt>
              <dd data-testid="portfolio-total">{formatPrice(total)}</dd>
            </div>
            <div className="card">
              <dt>24h change</dt>
              <dd data-testid="portfolio-change" className={changeClass(totalChange)}>
                {totalChange >= 0 ? '+' : '-'}
                {formatPrice(Math.abs(totalChange))} ({formatPercent(totalChangePercent)})
              </dd>
            </div>
          </dl>
          <div className="table-wrap">
            <table aria-label="Holdings">
              <thead>
                <tr>
                  <th scope="col">Coin</th>
                  <th scope="col" className="num">Amount</th>
                  <th scope="col" className="num">Price</th>
                  <th scope="col" className="num">Value</th>
                  <th scope="col" className="num">24h</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ holding, coin, value }, i) => (
                  <tr key={holding.coinId} data-testid={`holding-row-${i + 1}`}>
                    <td>
                      {coin ? (
                        <Link to={`/coin/${coin.slug}`} data-testid={`holding-link-${i + 1}`}>
                          {coin.name}
                        </Link>
                      ) : (
                        'Not in current data'
                      )}
                    </td>
                    <td className="num">
                      {formatAmount(holding.amount)} {coin?.symbol}
                    </td>
                    <td className="num">{coin ? <Price value={coin.price} /> : '—'}</td>
                    <td className="num">{formatPrice(value)}</td>
                    <td className={`num ${coin ? changeClass(coin.percentChange24h) : ''}`}>
                      {coin ? formatPercent(coin.percentChange24h) : '—'}
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        onClick={() => setEditing(holding)}
                        aria-label={`Edit ${coin?.name ?? 'holding'}`}
                        data-testid={`holding-edit-${i + 1}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoving(holding)}
                        aria-label={`Remove ${coin?.name ?? 'holding'}`}
                        data-testid={`holding-remove-${i + 1}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EditDialog holding={editing} coin={editing ? coinFor(editing.coinId) : undefined} onSave={save} onClose={() => setEditing(null)} />
      <Modal
        open={removing !== null}
        title={`Remove ${(removing && coinFor(removing.coinId)?.name) ?? 'holding'}?`}
        testId="remove-dialog"
        onClose={() => setRemoving(null)}
      >
        <p>This removes it from your portfolio on this device.</p>
        <div className="dialog-actions">
          <button type="button" onClick={() => setRemoving(null)} data-testid="remove-cancel">
            Cancel
          </button>
          <button type="button" className="danger" onClick={remove} data-testid="remove-confirm">
            Remove
          </button>
        </div>
      </Modal>
    </section>
  )
}
