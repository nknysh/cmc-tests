import { useCallback } from 'react'
import { STORAGE_KEYS, useStoredState } from './storage'

/** Starred coin ids, persisted in localStorage. */
export function useWatchlist() {
  const [ids, setIds] = useStoredState<number[]>(STORAGE_KEYS.watchlist, [])
  const toggle = useCallback(
    (id: number) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setIds],
  )
  return { ids, toggle, has: (id: number) => ids.includes(id) }
}
