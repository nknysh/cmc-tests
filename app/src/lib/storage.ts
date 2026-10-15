import { useCallback, useState } from 'react'

/** Keys for everything the app keeps in localStorage, so tests can seed or clear them. */
export const STORAGE_KEYS = {
  theme: 'coinboard.theme',
  watchlist: 'coinboard.watchlist',
  hiddenColumns: 'coinboard.hiddenColumns',
  portfolio: 'coinboard.portfolio',
} as const

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the app still works for this visit.
  }
}

/** useState that persists to localStorage. A read or write failure falls back to in-memory state. */
export function useStoredState<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, fallback))
  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
        writeStored(key, resolved)
        return resolved
      })
    },
    [key],
  )
  return [value, update]
}
