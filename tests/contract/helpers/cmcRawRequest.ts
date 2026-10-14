import type { APIRequestContext } from '@playwright/test'
import { cmcRateLimiter } from '@tests/helpers/cmc'
import { API_KEY_HEADER, CMC_BASE_URL } from './constants'

const HTTP_TOO_MANY_REQUESTS = 429

export interface CmcRawResponse {
  status: number
  body: unknown
}

/**
 * GETs a CoinMarketCap endpoint directly, bypassing CoinMarketCapClient, and
 * returns the raw status and parsed JSON body. Provider contract tests use it
 * to see exactly what CMC sends, before the client maps it to a domain type.
 * Calls share the live specs' rate limiter, so they count against one budget.
 */
export async function cmcRawGet(
  request: APIRequestContext,
  path: string,
  { apiKey, params }: { apiKey: string; params?: Record<string, string> },
): Promise<CmcRawResponse> {
  const response = await cmcRateLimiter.run(
    () =>
      request.get(new URL(path, CMC_BASE_URL).toString(), {
        headers: { [API_KEY_HEADER]: apiKey, Accept: 'application/json' },
        params,
      }),
    (res) => res.status() === HTTP_TOO_MANY_REQUESTS,
  )
  return { status: response.status(), body: await response.json() }
}
