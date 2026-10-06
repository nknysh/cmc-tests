import type { APIRequestContext } from '@playwright/test'

const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com'
const API_KEY_HEADER = 'X-CMC_PRO_API_KEY'

export interface CmcRawResponse {
  status: number
  body: unknown
}

/**
 * GETs a CoinMarketCap endpoint directly, bypassing CoinMarketCapClient, and
 * returns the raw status and parsed JSON body. Provider contract tests use it
 * to see exactly what CMC sends, before the client maps it to a domain type.
 */
export async function cmcRawGet(
  request: APIRequestContext,
  path: string,
  { apiKey, params }: { apiKey: string; params?: Record<string, string> },
): Promise<CmcRawResponse> {
  const response = await request.get(new URL(path, CMC_BASE_URL).toString(), {
    headers: { [API_KEY_HEADER]: apiKey, Accept: 'application/json' },
    params,
  })
  return { status: response.status(), body: await response.json() }
}
