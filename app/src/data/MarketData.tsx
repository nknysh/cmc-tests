import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MarketSnapshot, PriceHistory } from './types'
import { snapshotProblem } from './snapshotShape'
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

/**
 * How long one load may take before it fails (APP-03/AC-2): every file it
 * fetches, headers and body, including the fallback to the previous snapshot.
 */
const FETCH_TIMEOUT_MS = 30_000

const TIMEOUT_MESSAGE = 'The server took too long to respond'

/**
 * Whether the load's signal was aborted by its timeout (see useLoad). Any
 * other abort means the caller no longer needs the data: nothing to report.
 */
const timedOut = (signal: AbortSignal): boolean =>
  signal.reason instanceof DOMException && signal.reason.name === 'TimeoutError'

/** A file that loaded but is corrupt: not valid JSON, or not a valid snapshot (APP-03/AC-7). */
class InvalidDataError extends Error {}

/** Reason phrases for responses that carry none, such as GitHub Pages' HTTP/2 ones (APP-03/AC-2). */
const STATUS_TEXTS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

class HttpError extends Error {
  constructor(readonly status: number, statusText: string) {
    super(`${status} ${statusText || STATUS_TEXTS[status] || 'Error'}`)
  }
}

/**
 * Fetches and parses a data file. Failures carry a reason fit to show the
 * user (APP-03/AC-2); the technical detail goes to the console instead.
 * `what` names the file's contents in that reason, e.g. "market data".
 * `signal` is the load's, so it times out with the load (see useLoad).
 */
async function fetchJson<T>(url: string, what: string, signal: AbortSignal): Promise<T> {
  let response: Response
  try {
    // no-cache: revalidate with the server, so a new snapshot shows up without a hard reload.
    response = await fetch(url, { cache: 'no-cache', signal })
  } catch (error) {
    if (signal.aborted && !timedOut(signal)) throw error
    console.warn(`[MarketData] couldn't fetch ${url}:`, error)
    throw new Error(timedOut(signal) ? TIMEOUT_MESSAGE : 'Network error', { cause: error })
  }
  if (!response.ok) throw new HttpError(response.status, response.statusText)
  try {
    return (await response.json()) as T
  } catch (error) {
    if (signal.aborted && !timedOut(signal)) throw error
    // The timeout also covers reading the body.
    if (timedOut(signal)) {
      console.warn(`[MarketData] ${url} took too long to download:`, error)
      throw new Error(TIMEOUT_MESSAGE, { cause: error })
    }
    console.warn(`[MarketData] ${url} isn't valid JSON:`, error)
    throw new InvalidDataError(`The ${what} file is invalid`, { cause: error })
  }
}

/** Fetches a snapshot file, rejecting one that isn't a market snapshot (APP-03/AC-7). */
async function fetchSnapshot(url: string, signal: AbortSignal): Promise<MarketSnapshot> {
  const data = await fetchJson<unknown>(url, 'market data', signal)
  const problem = snapshotProblem(data)
  if (problem) {
    console.warn(`[MarketData] ${url} isn't a market snapshot: ${problem}`)
    throw new InvalidDataError('The market data file is invalid')
  }
  return data as MarketSnapshot
}

/**
 * Runs `load` once per `key`, exposing loading/error/ready and a retry that
 * reruns it. `load` gets a signal that aborts after FETCH_TIMEOUT_MS, or when
 * the caller unmounts or the key changes, so a stale request doesn't keep running.
 * One controller and a timer, not AbortSignal.any/timeout, which older browsers lack.
 */
function useLoad<T>(key: string, load: (signal: AbortSignal) => Promise<T>): { state: LoadState<T>; retry: () => void } {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(new DOMException('The load took too long', 'TimeoutError')),
      FETCH_TIMEOUT_MS,
    )
    load(controller.signal).then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (error: unknown) =>
        !cancelled && setState({ status: 'error', message: error instanceof Error ? error.message : String(error) }),
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
      controller.abort()
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

/** Loads latest.json, or says why the app can't show it: a price of 0 or below, or corrupt data. */
async function loadLatest(signal: AbortSignal): Promise<MarketSnapshot | string> {
  try {
    const latest = await fetchSnapshot(DATA_URLS.latest, signal)
    const invalid = findInvalidPrices(latest)
    if (invalid.length === 0) return latest
    return `has a price of 0 or below (${invalid.map((coin) => coin.symbol).join(', ')})`
  } catch (error) {
    if (error instanceof InvalidDataError) return 'is corrupt'
    throw error
  }
}

/**
 * Loads the latest snapshot. If it has a price of 0 or below (APP-06/AC-8) or
 * is corrupt (APP-03/AC-7), the app shows the previous snapshot and its history
 * instead, and resolves to null when there's no previous snapshot (APP-06/AC-10).
 * A previous snapshot with an invalid price is still shown; its invalid prices
 * are marked (APP-06/AC-11). A corrupt previous snapshot is a load failure.
 */
async function loadMarketData(signal: AbortSignal): Promise<MarketData | null> {
  const latest = await loadLatest(signal)
  if (typeof latest !== 'string') return { snapshot: latest, historyUrl: DATA_URLS.history }

  // The reason quotes coin symbols from the file: strip line breaks so they can't forge log lines.
  const reason = latest.replaceAll(/[\r\n\t]/g, ' ')
  console.warn(`[MarketData] latest.json ${reason}; showing the previous snapshot instead`)
  try {
    const previous = await fetchSnapshot(DATA_URLS.previous, signal)
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
  return useLoad(historyUrl, (signal) => fetchJson<PriceHistory>(historyUrl, 'price history', signal))
}
