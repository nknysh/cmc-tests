const MS_PER_MINUTE = 60_000
/** Margin after CMC's per-minute reset before retrying a rate-limited request. */
const RESET_MARGIN_MS = 1_000

export interface RateLimiterOptions {
  /** Steady request rate to pace calls at. Keep it below the key's per-minute cap. */
  requestsPerMinute: number
  /** Times a rate-limited request is retried after the next minute reset. */
  maxRateLimitRetries?: number
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Paces requests against one CoinMarketCap API key. Calls are spaced evenly
 * (`60s / requestsPerMinute` apart, no bursts) and queued in arrival order, so
 * a process starting right after another can't push the key far over its cap.
 * A response that's still rate limited (e.g. quota used by another process) is
 * retried after CMC's per-minute reset; once retries run out it's returned
 * as-is, so the caller still sees and reports the failure.
 */
export class RateLimiter {
  private readonly intervalMs: number
  private readonly maxRateLimitRetries: number
  private nextSlot: Promise<void> = Promise.resolve()

  constructor({ requestsPerMinute, maxRateLimitRetries = 1 }: RateLimiterOptions) {
    if (!Number.isFinite(requestsPerMinute) || requestsPerMinute <= 0) {
      throw new Error(`RateLimiter requires a positive requestsPerMinute, got ${requestsPerMinute}`)
    }
    this.intervalMs = MS_PER_MINUTE / requestsPerMinute
    this.maxRateLimitRetries = maxRateLimitRetries
  }

  async run<R>(send: () => Promise<R>, isRateLimited: (result: R) => boolean): Promise<R> {
    for (let attempt = 0; ; attempt++) {
      await this.acquireSlot()
      const result = await send()
      if (!isRateLimited(result) || attempt >= this.maxRateLimitRetries) return result

      const waitMs = MS_PER_MINUTE - (Date.now() % MS_PER_MINUTE) + RESET_MARGIN_MS
      console.log(`[RateLimiter] rate limited, retrying after the minute reset in ${waitMs}ms`)
      await sleep(waitMs)
    }
  }

  /** Resolves when this caller's turn comes, reserving the next slot one interval later. */
  private acquireSlot(): Promise<void> {
    const slot = this.nextSlot
    this.nextSlot = slot.then(() => sleep(this.intervalMs))
    return slot
  }
}
