import { useEffect, useState } from 'react'
import { formatAge } from '../lib/format'

/** The snapshot job runs daily; older than a day plus slack for a late run, it has probably stopped. */
export const STALE_AFTER_MS = 26 * 60 * 60 * 1000
const TICK_MS = 30_000

export function FreshnessBadge({ updatedAt }: Readonly<{ updatedAt: string }>) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  const age = Math.max(0, now - Date.parse(updatedAt))
  const stale = age > STALE_AFTER_MS

  return (
    <p className={`freshness ${stale ? 'stale' : ''}`} data-testid="freshness" data-state={stale ? 'stale' : 'fresh'}>
      <time dateTime={updatedAt} title={new Date(updatedAt).toUTCString()}>
        {stale ? `Data is ${formatAge(age).replace(' ago', '')} old and may be stale` : `Updated ${formatAge(age)}`}
      </time>
    </p>
  )
}
