import { expect } from '@playwright/test'
import { CoinMarketCapClient, RateLimiter } from '@src/clients/coinmarketcap'

/**
 * Below the Basic key's 30 req/min cap, leaving headroom for the globalSetup
 * BTC heal and any calls a previous process made in the same minute. Raise it
 * via CMC_REQUESTS_PER_MINUTE on a higher plan.
 */
const DEFAULT_REQUESTS_PER_MINUTE = 25

/**
 * One limiter per test process. The live projects run on a single worker
 * (playwright.config.ts), so every live CMC call in a run shares this pacing.
 */
export const cmcRateLimiter = new RateLimiter({
  requestsPerMinute: Number(process.env.CMC_REQUESTS_PER_MINUTE ?? DEFAULT_REQUESTS_PER_MINUTE),
})

/** A client for live specs, rate limited by cmcRateLimiter. Defaults to CMC_API_KEY, which must be set. */
export function createCmcClient(apiKey = process.env.CMC_API_KEY): CoinMarketCapClient {
  expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
  return new CoinMarketCapClient({ apiKey: apiKey!, rateLimiter: cmcRateLimiter })
}
