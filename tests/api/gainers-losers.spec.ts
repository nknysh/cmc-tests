import { test, expect } from '@playwright/test'
import * as allure from 'allure-js-commons'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'

/**
 * Test cases for GET /v1/cryptocurrency/trending/gainers-losers. Each test is
 * mapped to its source test case in data/test-cases.db (see src/db/testCases/)
 * via the `test-case-id` annotation, which matches that database's
 * `test_cases.id`. Tests below are ordered by that id. The same id is used as
 * each test's Allure id, testCaseId and historyId, so Allure history survives
 * renames of a test or its suite.
 *
 * The endpoint needs a Startup plan or higher, but CMC_API_KEY is on Basic, so
 * only cases that don't need a successful response are kept. TC-24 asserts
 * the plan rejection itself and will fail if the key is upgraded.
 *
 * Not every seeded test case is automated here:
 * - TC-22 (missing API key) can't be expressed through this client, since its
 *   constructor requires a truthy apiKey and always sends whatever it's given.
 */

const apiKey = process.env.CMC_API_KEY

const CURRENCY_USD = 'USD'
const CURRENCY_ID_USD = '2781'

test.describe('CoinMarketCap API', () => {
  test.describe('Trending Gainers & Losers — GET /v1/cryptocurrency/trending/gainers-losers', () => {
    test.beforeEach(async ({}, testInfo) => {
      const testCaseId = testInfo.annotations.find((a) => a.type === 'test-case-id')?.description
      expect(testCaseId, 'every test needs a test-case-id annotation').toBeTruthy()
      await allure.allureId(testCaseId!)
      await allure.testCaseId(`test-case-${testCaseId}`)
      await allure.historyId(`test-case-${testCaseId}`)
    })

    test(
      'rejects convert and convertId supplied together',
      { annotation: { type: 'test-case-id', description: '44' } },
      async () => {
        expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
        const client = new CoinMarketCapClient({ apiKey: apiKey! })

        await expect(
          client.fetchGainersLosers({ convert: CURRENCY_USD, convertId: CURRENCY_ID_USD }),
        ).rejects.toThrow(/cannot accept both convert and convertId/)
      },
    )

    test(
      'an invalid API key is rejected',
      { annotation: { type: 'test-case-id', description: '47' } },
      async () => {
        const client = new CoinMarketCapClient({ apiKey: 'not-a-real-key' })

        await expect(client.fetchGainersLosers()).rejects.toThrow(/401.*error_code 1001/)
      },
    )

    test(
      'a key on a plan below Startup is rejected with a plan error',
      { annotation: { type: 'test-case-id', description: '48' } },
      async () => {
        expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
        const client = new CoinMarketCapClient({ apiKey: apiKey! })

        await expect(client.fetchGainersLosers({ limit: 2 })).rejects.toThrow(/403.*error_code 1006/)
      },
    )
  })
})
