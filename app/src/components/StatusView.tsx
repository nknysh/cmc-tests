const SKELETON_ROWS = 8

export function LoadingSkeleton() {
  return (
    <output className="skeleton" aria-busy="true" aria-label="Loading market data">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <span key={i} className="skeleton-row" />
      ))}
    </output>
  )
}

/** Market data loaded, but none of it is valid to show (APP-06/AC-10). */
export function NoMarketData() {
  return (
    <div className="error-panel">
      <h2>No market data available</h2>
      <p className="muted">There's no valid market data to show right now. Check back after the next daily update.</p>
    </div>
  )
}

/** A section that failed to draw (APP-03/AC-9). Retry reloads the market data and draws it again. */
export function PageError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="error-panel" role="alert">
      <h2>Something went wrong</h2>
      <p className="muted">This page couldn't be shown.</p>
      <button type="button" onClick={onRetry} data-testid="retry-button">
        Retry
      </button>
    </div>
  )
}

export function LoadError({ message, onRetry, what = 'market data' }: Readonly<{ message: string; onRetry: () => void; what?: string }>) {
  return (
    <div className="error-panel" role="alert">
      <h2>Couldn't load {what}</h2>
      <p className="muted">{message}</p>
      <button type="button" onClick={onRetry} data-testid="retry-button">
        Retry
      </button>
    </div>
  )
}
