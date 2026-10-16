import type { Coin } from '../data/types'

export function WatchStar({
  coin,
  starred,
  onToggle,
  testId,
}: Readonly<{ coin: Coin; starred: boolean; onToggle: (id: number) => void; testId: string }>) {
  return (
    <button
      type="button"
      className={`star ${starred ? 'starred' : ''}`}
      aria-pressed={starred}
      aria-label={starred ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`}
      onClick={() => onToggle(coin.id)}
      data-testid={testId}
    >
      {starred ? '★' : '☆'}
    </button>
  )
}
