import { test, expect } from '@playwright/test'
import {
  CmcErrorResponseSchema,
  SimplePriceQuoteIncludeAllSchema,
  SimplePriceResponseSchema,
} from '@src/clients/coinmarketcap/schemas'
import { cmcRawGet } from '../helpers/cmcRawRequest'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'

/**
 * Provider contract for GET /v2/simple/price: the live raw response must
 * still match the shape SimplePriceEndpoint parses, both without include flags
 * and with every optional field switched on. A failure here means
 * CoinMarketCap changed the API, not that the client broke.
 */

const apiKey = process.env.CMC_API_KEY

const SIMPLE_PRICE_PATH = '/v2/simple/price'
const CMC_ID_BTC = '1'
const CURRENCY_USD = 'USD'
const INVALID_API_KEY = 'not-a-real-key'
const ERROR_CODE_INVALID_KEY = 1001

test.describe('CoinMarketCap contract (provider)', () => {
  test.describe('Simple Price — GET /v2/simple/price', () => {
    test('a response without include flags matches the client contract', async ({ request }) => {
      expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()

      const { status, body } = await cmcRawGet(request, SIMPLE_PRICE_PATH, {
        apiKey: apiKey!,
        params: { id: CMC_ID_BTC, convert: CURRENCY_USD },
      })

      expect(status).toBe(200)
      const parsed = expectMatchesSchema(body, SimplePriceResponseSchema)
      expect(parsed.data).toHaveLength(1)
    })

    test('an include_all response carries every optional quote field', async ({ request }) => {
      expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()

      const { status, body } = await cmcRawGet(request, SIMPLE_PRICE_PATH, {
        apiKey: apiKey!,
        params: { id: CMC_ID_BTC, convert: CURRENCY_USD, include_all: 'true' },
      })

      expect(status).toBe(200)
      const parsed = expectMatchesSchema(body, SimplePriceResponseSchema)
      expectMatchesSchema(parsed.data[0]?.quotes[0], SimplePriceQuoteIncludeAllSchema)
    })

    test('an invalid API key response matches the error contract', async ({ request }) => {
      const { status, body } = await cmcRawGet(request, SIMPLE_PRICE_PATH, {
        apiKey: INVALID_API_KEY,
        params: { id: CMC_ID_BTC, convert: CURRENCY_USD },
      })

      expect(status).toBe(401)
      const parsed = expectMatchesSchema(body, CmcErrorResponseSchema)
      expect(Number(parsed.status.error_code)).toBe(ERROR_CODE_INVALID_KEY)
    })
  })
})
