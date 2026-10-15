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

export function LoadError({ message, onRetry, what = 'market data' }: Readonly<{ message: string; onRetry: () => void; what?: string }>) {
  return (
    <div className="error-panel" role="alert">
      <h2>Couldn't load {what}</h2>
      <p className="muted">{message}</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}
