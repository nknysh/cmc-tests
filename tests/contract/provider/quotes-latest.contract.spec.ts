import { test, expect } from '@playwright/test'
import { CmcErrorResponseSchema, QuoteResponseSchema } from '@src/clients/coinmarketcap/schemas'
import { cmcRawGet } from '../helpers/cmcRawRequest'
import { ERROR_CODE_INVALID_KEY, INVALID_API_KEY } from '../helpers/constants'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'
import { requireEnv } from '../helpers/requireEnv'

/**
 * Provider contract for GET /v2/cryptocurrency/quotes/latest: the live raw
 * response must still match the shape QuotesLatestEndpoint parses. A failure
 * here means CoinMarketCap changed the API, not that the client broke.
 */

const QUOTES_LATEST_PATH = '/v2/cryptocurrency/quotes/latest'
const SYMBOL_BTC = 'BTC'
const CURRENCY_USD = 'USD'

test.describe('Quotes Latest provider contract — GET /v2/cryptocurrency/quotes/latest', () => {
  test('a successful response matches the client contract', async ({ request }) => {
    const apiKey = requireEnv('CMC_API_KEY')

    const { status, body } = await cmcRawGet(request, QUOTES_LATEST_PATH, {
      apiKey,
      params: { symbol: SYMBOL_BTC, convert: CURRENCY_USD },
    })

    expect(status).toBe(200)
    const parsed = expectMatchesSchema(body, QuoteResponseSchema)
    // The schema covers every key's shape; the client also needs the requested symbol to be one of them.
    expect(parsed.data[SYMBOL_BTC]).toBeDefined()
  })

  test('an invalid API key response matches the error contract', async ({ request }) => {
    const { status, body } = await cmcRawGet(request, QUOTES_LATEST_PATH, {
      apiKey: INVALID_API_KEY,
      params: { symbol: SYMBOL_BTC, convert: CURRENCY_USD },
    })

    expect(status).toBe(401)
    const parsed = expectMatchesSchema(body, CmcErrorResponseSchema)
    expect(Number(parsed.status.error_code)).toBe(ERROR_CODE_INVALID_KEY)
  })
})
