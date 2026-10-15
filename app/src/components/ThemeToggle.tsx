import { useState } from 'react'
import { readStored, STORAGE_KEYS } from '../lib/storage'

type Theme = 'light' | 'dark'

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

/** The saved theme, else the OS preference. */
const currentTheme = (): Theme => readStored<Theme | null>(STORAGE_KEYS.theme, null) ?? systemTheme()

/** Applies the theme before the first render, so the page never flashes the wrong one. */
export function initTheme(): void {
  document.documentElement.dataset.theme = currentTheme()
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  const toggle = () => {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(next))
    } catch {
      // Not persisted this visit; the toggle still applies.
    }
    setTheme(next)
  }

  return (
    <button type="button" className="icon-button" onClick={toggle} aria-label={`Switch to ${next} theme`}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
