import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MarketSnapshot, PriceHistory } from './types'

/** Data files published next to the app (see scripts/snapshot-listings.ts). */
export const DATA_URLS = {
  latest: `${import.meta.env.BASE_URL}data/latest.json`,
  history: `${import.meta.env.BASE_URL}data/history.json`,
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

async function fetchJson<T>(url: string): Promise<T> {
  // no-cache: revalidate with the server, so a new snapshot shows up without a hard reload.
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
  return (await response.json()) as T
}

/** Loads a JSON file, exposing loading/error/ready and a retry that refetches. */
function useJson<T>(url: string): { state: LoadState<T>; retry: () => void } {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchJson<T>(url).then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (error: unknown) =>
        !cancelled && setState({ status: 'error', message: error instanceof Error ? error.message : String(error) }),
    )
    return () => {
      cancelled = true
    }
  }, [url, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return useMemo(() => ({ state, retry }), [state, retry])
}

interface MarketDataValue {
  state: LoadState<MarketSnapshot>
  retry: () => void
}

const MarketDataContext = createContext<MarketDataValue | null>(null)

export function MarketDataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const value = useJson<MarketSnapshot>(DATA_URLS.latest)
  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>
}

export function useMarketData(): MarketDataValue {
  const value = useContext(MarketDataContext)
  if (!value) throw new Error('useMarketData must be used inside MarketDataProvider')
  return value
}

/** The snapshot, for components that only render once it's loaded. */
export function useSnapshot(): MarketSnapshot {
  const { state } = useMarketData()
  if (state.status !== 'ready') throw new Error('useSnapshot needs loaded market data')
  return state.data
}

/** Price history, loaded on demand by the coin page's chart. */
export const usePriceHistory = () => useJson<PriceHistory>(DATA_URLS.history)
