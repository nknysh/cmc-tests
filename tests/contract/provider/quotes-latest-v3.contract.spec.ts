import { test, expect } from '@playwright/test'
import { Severity, severity } from '@tests/helpers/severity'
import { useTestCaseIds } from '@tests/helpers/testCaseId'
import { CmcErrorResponseSchema, QuotesLatestV3ResponseSchema } from '@src/clients/coinmarketcap/schemas'
import { cmcRawGet } from '../helpers/cmcRawRequest'
import { CMC_ID_BTC, ERROR_CODE_INVALID_KEY, INVALID_API_KEY, QUOTES_LATEST_V3_IDS } from '../helpers/constants'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'
import { requireEnv } from '../helpers/requireEnv'

/**
 * Provider contract for GET /v3/cryptocurrency/quotes/latest: the live raw
 * response must still match the shape QuotesLatestV3Endpoint parses. A failure
 * here means CoinMarketCap changed the API, not that the client broke. The
 * invalid-key test is also quotes-latest TC-79.
 */

const QUOTES_LATEST_V3_PATH = '/v3/cryptocurrency/quotes/latest'

test.describe('Quotes Latest v3 provider contract — GET /v3/cryptocurrency/quotes/latest', { annotation: severity(Severity.BLOCKER) }, () => {
  useTestCaseIds({ required: false })

  test('a successful response matches the client contract', async ({ request }) => {
    const apiKey = requireEnv('CMC_API_KEY')

    const { status, body } = await cmcRawGet(request, QUOTES_LATEST_V3_PATH, {
      apiKey,
      params: { id: QUOTES_LATEST_V3_IDS.join(',') },
    })

    expect(status).toBe(200)
    const parsed = expectMatchesSchema(body, QuotesLatestV3ResponseSchema)
    // The schema covers every item's shape; the client also needs one item per requested id.
    expect(parsed.data.map((item) => item.id).sort((a, b) => a - b)).toEqual(QUOTES_LATEST_V3_IDS)
  })

  test(
    'an invalid API key response matches the error contract',
    { annotation: { type: 'test-case-id', description: '79' } },
    async ({ request }) => {
      const { status, body } = await cmcRawGet(request, QUOTES_LATEST_V3_PATH, {
        apiKey: INVALID_API_KEY,
        params: { id: String(CMC_ID_BTC) },
      })

      expect(status).toBe(401)
      const parsed = expectMatchesSchema(body, CmcErrorResponseSchema)
      expect(Number(parsed.status.error_code)).toBe(ERROR_CODE_INVALID_KEY)
    },
  )
})
