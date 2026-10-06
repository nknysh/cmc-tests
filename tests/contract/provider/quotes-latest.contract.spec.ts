import { test, expect } from '@playwright/test'
import { CmcErrorResponseSchema, QuoteResponseSchema } from '@src/clients/coinmarketcap/schemas'
import { cmcRawGet } from '../helpers/cmcRawRequest'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'

/**
 * Provider contract for GET /v2/cryptocurrency/quotes/latest: the live raw
 * response must still match the shape QuotesLatestEndpoint parses. A failure
 * here means CoinMarketCap changed the API, not that the client broke.
 */

const apiKey = process.env.CMC_API_KEY

const QUOTES_LATEST_PATH = '/v2/cryptocurrency/quotes/latest'
const SYMBOL_BTC = 'BTC'
const CURRENCY_USD = 'USD'
const INVALID_API_KEY = 'not-a-real-key'
const ERROR_CODE_INVALID_KEY = 1001

test.describe('CoinMarketCap contract (provider)', () => {
  test.describe('Quotes Latest — GET /v2/cryptocurrency/quotes/latest', () => {
    test('a successful response matches the client contract', async ({ request }) => {
      expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()

      const { status, body } = await cmcRawGet(request, QUOTES_LATEST_PATH, {
        apiKey: apiKey!,
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
})
