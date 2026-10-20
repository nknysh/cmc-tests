import { test, expect } from '@playwright/test'
import { Severity, severity } from '@tests/helpers/severity'
import { useTestCaseIds } from '@tests/helpers/testCaseId'
import { CmcErrorResponseSchema } from '@src/clients/coinmarketcap/schemas'
import { cmcRawGet } from '../helpers/cmcRawRequest'
import { ERROR_CODE_INVALID_KEY, INVALID_API_KEY } from '../helpers/constants'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'
import { requireEnv } from '../helpers/requireEnv'

/**
 * Provider contract for GET /v1/cryptocurrency/trending/gainers-losers. The
 * endpoint needs a Startup plan or higher, but CMC_API_KEY is on Basic, so
 * only the error envelope can be checked live; the success shape is covered
 * by the consumer contract's docs-based fixture instead. The plan-gate test
 * fails by design if the key is upgraded, which is the cue to add a live
 * success-shape check here.
 *
 * This endpoint has no live tests in tests/api: on Basic only these two error
 * envelopes are reachable, so they double as gainers-losers TC-47 (invalid
 * key) and TC-48 (plan gate). TC-44 is a consumer contract test. TC-46
 * (missing API key) isn't automated yet.
 */

const GAINERS_LOSERS_PATH = '/v1/cryptocurrency/trending/gainers-losers'
const LIMIT = '2'
const ERROR_CODE_PLAN_NOT_SUPPORTED = 1006

test.describe('Trending Gainers & Losers provider contract — GET /v1/cryptocurrency/trending/gainers-losers', severity(Severity.BLOCKER), () => {
  useTestCaseIds({ required: false })

  test(
    'a plan-gated response matches the error contract',
    { annotation: { type: 'test-case-id', description: '48' } },
    async ({ request }) => {
      const apiKey = requireEnv('CMC_API_KEY')

      const { status, body } = await cmcRawGet(request, GAINERS_LOSERS_PATH, {
        apiKey,
        params: { limit: LIMIT },
      })

      expect(status).toBe(403)
      const parsed = expectMatchesSchema(body, CmcErrorResponseSchema)
      expect(Number(parsed.status.error_code)).toBe(ERROR_CODE_PLAN_NOT_SUPPORTED)
    },
  )

  test(
    'an invalid API key response matches the error contract',
    { annotation: { type: 'test-case-id', description: '47' } },
    async ({ request }) => {
      const { status, body } = await cmcRawGet(request, GAINERS_LOSERS_PATH, {
        apiKey: INVALID_API_KEY,
        params: { limit: LIMIT },
      })

      expect(status).toBe(401)
      const parsed = expectMatchesSchema(body, CmcErrorResponseSchema)
      expect(Number(parsed.status.error_code)).toBe(ERROR_CODE_INVALID_KEY)
    },
  )
})
