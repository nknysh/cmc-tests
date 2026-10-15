import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { MarketDataProvider } from './data/MarketData'
import { initTheme } from './components/ThemeToggle'
import './styles.css'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Hash routing: GitHub Pages has no fallback to index.html for unknown paths. */}
    <HashRouter>
      <MarketDataProvider>
        <App />
      </MarketDataProvider>
    </HashRouter>
  </StrictMode>,
)
