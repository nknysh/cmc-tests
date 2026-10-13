import { test, expect } from '@playwright/test'
import { Severity, severity } from '@tests/helpers/severity'
import { CmcErrorResponseSchema, QuotesLatestV3ResponseSchema } from '@src/clients/coinmarketcap/schemas'
import { cmcRawGet } from '../helpers/cmcRawRequest'
import { ERROR_CODE_INVALID_KEY, INVALID_API_KEY } from '../helpers/constants'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'
import { requireEnv } from '../helpers/requireEnv'

/**
 * Provider contract for GET /v3/cryptocurrency/quotes/latest: the live raw
 * response must still match the shape QuotesLatestV3Endpoint parses. A failure
 * here means CoinMarketCap changed the API, not that the client broke.
 */

const QUOTES_LATEST_V3_PATH = '/v3/cryptocurrency/quotes/latest'
/** BTC (a coin, `platform: null`) and USDC (a token, with a platform). */
const ID_BTC = 1
const ID_USDC = 3408
const REQUESTED_IDS = [ID_BTC, ID_USDC]

test.describe('Quotes Latest v3 provider contract — GET /v3/cryptocurrency/quotes/latest', { annotation: severity(Severity.BLOCKER) }, () => {
  test('a successful response matches the client contract', async ({ request }) => {
    const apiKey = requireEnv('CMC_API_KEY')

    const { status, body } = await cmcRawGet(request, QUOTES_LATEST_V3_PATH, {
      apiKey,
      params: { id: REQUESTED_IDS.join(',') },
    })

    expect(status).toBe(200)
    const parsed = expectMatchesSchema(body, QuotesLatestV3ResponseSchema)
    // The schema covers every item's shape; the client also needs one item per requested id.
    expect(parsed.data.map((item) => item.id).sort((a, b) => a - b)).toEqual(REQUESTED_IDS)
  })

  test('an invalid API key response matches the error contract', async ({ request }) => {
    const { status, body } = await cmcRawGet(request, QUOTES_LATEST_V3_PATH, {
      apiKey: INVALID_API_KEY,
      params: { id: String(ID_BTC) },
    })

    expect(status).toBe(401)
    const parsed = expectMatchesSchema(body, CmcErrorResponseSchema)
    expect(Number(parsed.status.error_code)).toBe(ERROR_CODE_INVALID_KEY)
  })
})
