import { NavLink, Route, Routes } from 'react-router-dom'
import { useMarketData } from './data/MarketData'
import { FreshnessBadge } from './components/FreshnessBadge'
import { LoadError, LoadingSkeleton } from './components/StatusView'
import { ThemeToggle } from './components/ThemeToggle'
import { MarketsPage } from './pages/MarketsPage'
import { CoinPage } from './pages/CoinPage'
import { ConverterPage } from './pages/ConverterPage'
import { ComparePage } from './pages/ComparePage'
import { PortfolioPage } from './pages/PortfolioPage'
import { NotFoundPage } from './pages/NotFoundPage'

const NAV = [
  { to: '/', label: 'Markets' },
  { to: '/converter', label: 'Converter' },
  { to: '/compare', label: 'Compare' },
  { to: '/portfolio', label: 'Portfolio' },
]

export function App() {
  const { state, retry } = useMarketData()

  return (
    <>
      <header className="site-header">
        <NavLink to="/" className="brand">
          CoinBoard
        </NavLink>
        <nav aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="header-tools">
          {state.status === 'ready' && <FreshnessBadge updatedAt={state.data.updatedAt} />}
          <ThemeToggle />
        </div>
      </header>
      <main>
        {state.status === 'loading' && <LoadingSkeleton />}
        {state.status === 'error' && <LoadError message={state.message} onRetry={retry} />}
        {state.status === 'ready' && (
          <Routes>
            <Route path="/" element={<MarketsPage />} />
            <Route path="/coin/:slug" element={<CoinPage />} />
            <Route path="/converter" element={<ConverterPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        )}
      </main>
      <footer className="site-footer">
        Data from <a href="https://coinmarketcap.com/api/">CoinMarketCap</a>, refreshed daily. Not financial advice.
      </footer>
    </>
  )
}
