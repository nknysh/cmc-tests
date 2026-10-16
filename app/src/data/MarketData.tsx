import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MarketSnapshot, PriceHistory } from './types'
import { findInvalidPrices } from './validate'

/** Data files published next to the app (see scripts/snapshot-listings.ts). */
export const DATA_URLS = {
  latest: `${import.meta.env.BASE_URL}data/latest.json`,
  history: `${import.meta.env.BASE_URL}data/history.json`,
  /** The last snapshot the snapshot step confirmed valid, and its history (APP-06/AC-7). */
  previous: `${import.meta.env.BASE_URL}data/previous.json`,
  previousHistory: `${import.meta.env.BASE_URL}data/previous-history.json`,
}

const HTTP_NOT_FOUND = 404

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

class HttpError extends Error {
  constructor(readonly status: number, statusText: string) {
    super(`${status} ${statusText}`.trim())
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  // no-cache: revalidate with the server, so a new snapshot shows up without a hard reload.
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new HttpError(response.status, response.statusText)
  return (await response.json()) as T
}

/** Runs `load` once per `key`, exposing loading/error/ready and a retry that reruns it. */
function useLoad<T>(key: string, load: () => Promise<T>): { state: LoadState<T>; retry: () => void } {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (error: unknown) =>
        !cancelled && setState({ status: 'error', message: error instanceof Error ? error.message : String(error) }),
    )
    return () => {
      cancelled = true
    }
    // Keyed by `key`, not `load`: callers pass a new function each render.
  }, [key, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return useMemo(() => ({ state, retry }), [state, retry])
}

/** The snapshot the app shows, and the price history that goes with it. */
export interface MarketData {
  snapshot: MarketSnapshot
  historyUrl: string
}

/**
 * Loads the latest snapshot. If it has a price of 0 or below, the app shows
 * the previous snapshot and its history instead (APP-06/AC-8), and resolves to
 * null when there's no previous snapshot (AC-10). A previous snapshot with an
 * invalid price is still shown; its invalid prices are marked (AC-11).
 */
async function loadMarketData(): Promise<MarketData | null> {
  const latest = await fetchJson<MarketSnapshot>(DATA_URLS.latest)
  const invalid = findInvalidPrices(latest)
  if (invalid.length === 0) return { snapshot: latest, historyUrl: DATA_URLS.history }

  const symbols = invalid.map((coin) => coin.symbol).join(', ')
  console.warn(`[MarketData] latest.json has a price of 0 or below (${symbols}); showing the previous snapshot instead`)
  try {
    const previous = await fetchJson<MarketSnapshot>(DATA_URLS.previous)
    return { snapshot: previous, historyUrl: DATA_URLS.previousHistory }
  } catch (error) {
    if (!(error instanceof HttpError && error.status === HTTP_NOT_FOUND)) throw error
    console.warn('[MarketData] there is no previous snapshot; no market data is available')
    return null
  }
}

interface MarketDataValue {
  /** Ready with null when there's no valid market data to show. */
  state: LoadState<MarketData | null>
  retry: () => void
}

const MarketDataContext = createContext<MarketDataValue | null>(null)

export function MarketDataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const value = useLoad(DATA_URLS.latest, loadMarketData)
  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>
}

export function useMarketData(): MarketDataValue {
  const value = useContext(MarketDataContext)
  if (!value) throw new Error('useMarketData must be used inside MarketDataProvider')
  return value
}

function useLoadedMarketData(): MarketData {
  const { state } = useMarketData()
  if (state.status !== 'ready' || !state.data) throw new Error('needs loaded market data')
  return state.data
}

/** The snapshot, for components that only render once it's loaded. */
export const useSnapshot = (): MarketSnapshot => useLoadedMarketData().snapshot

/** Price history for the shown snapshot, loaded on demand by the coin page's chart. */
export function usePriceHistory() {
  const { historyUrl } = useLoadedMarketData()
  return useLoad(historyUrl, () => fetchJson<PriceHistory>(historyUrl))
}
