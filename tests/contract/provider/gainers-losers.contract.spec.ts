import { test, expect } from '@playwright/test'
import { CmcErrorResponseSchema } from '@src/clients/coinmarketcap/schemas'
import { cmcRawGet } from '../helpers/cmcRawRequest'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'

/**
 * Provider contract for GET /v1/cryptocurrency/trending/gainers-losers. The
 * endpoint needs a Startup plan or higher, but CMC_API_KEY is on Basic, so
 * only the error envelope can be checked live; the success shape is covered
 * by the consumer contract's docs-based fixture instead. The plan-gate test
 * fails by design if the key is upgraded, which is the cue to add a live
 * success-shape check here.
 */

const apiKey = process.env.CMC_API_KEY

const GAINERS_LOSERS_PATH = '/v1/cryptocurrency/trending/gainers-losers'
const LIMIT = '2'
const INVALID_API_KEY = 'not-a-real-key'
const ERROR_CODE_INVALID_KEY = 1001
const ERROR_CODE_PLAN_NOT_SUPPORTED = 1006

test.describe('CoinMarketCap contract (provider)', () => {
  test.describe('Trending Gainers & Losers — GET /v1/cryptocurrency/trending/gainers-losers', () => {
    test('a plan-gated response matches the error contract', async ({ request }) => {
      expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()

      const { status, body } = await cmcRawGet(request, GAINERS_LOSERS_PATH, {
        apiKey: apiKey!,
        params: { limit: LIMIT },
      })

      expect(status).toBe(403)
      const parsed = expectMatchesSchema(body, CmcErrorResponseSchema)
      expect(Number(parsed.status.error_code)).toBe(ERROR_CODE_PLAN_NOT_SUPPORTED)
    })

    test('an invalid API key response matches the error contract', async ({ request }) => {
      const { status, body } = await cmcRawGet(request, GAINERS_LOSERS_PATH, {
        apiKey: INVALID_API_KEY,
        params: { limit: LIMIT },
      })

      expect(status).toBe(401)
      const parsed = expectMatchesSchema(body, CmcErrorResponseSchema)
      expect(Number(parsed.status.error_code)).toBe(ERROR_CODE_INVALID_KEY)
    })
  })
})
