import { test, expect } from '@playwright/test'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'
import { CmcErrorResponseSchema, GainersLosersResponseSchema } from '@src/clients/coinmarketcap/schemas'
import { API_KEY_HEADER, CMC_BASE_URL, DUMMY_API_KEY } from '../helpers/constants'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'
import { stubFetch, type FetchStub } from '../helpers/stubFetch'
import successFixture from '../fixtures/gainers-losers.success.json'
import planGatedFixture from '../fixtures/error.plan-gated-1006.json'

/**
 * Consumer contract for fetchGainersLosers (GET
 * /v1/cryptocurrency/trending/gainers-losers): runs the real client offline
 * against contract-valid fixtures, checking the request it sends and how it
 * maps the response. The success fixture is hand-built from CoinMarketCap's
 * docs, since CMC_API_KEY's Basic plan can't record a live one.
 */

const GAINERS_LOSERS_URL = `${CMC_BASE_URL}/v1/cryptocurrency/trending/gainers-losers`
const START = 1
const LIMIT = 2
const CURRENCY_USD = 'USD'

test.describe('CoinMarketCap contract (consumer)', () => {
  test.describe('fetchGainersLosers — GET /v1/cryptocurrency/trending/gainers-losers', () => {
    let stub: FetchStub | undefined

    test.afterEach(() => {
      stub?.restore()
    })

    test('the success fixture matches the contract', () => {
      expectMatchesSchema(successFixture, GainersLosersResponseSchema)
    })

    test('the plan-gated fixture matches the error contract', () => {
      expectMatchesSchema(planGatedFixture, CmcErrorResponseSchema)
    })

    test('sends options as snake_case query params with the API key header', async () => {
      stub = stubFetch(200, successFixture)
      const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

      await client.fetchGainersLosers({
        start: START,
        limit: LIMIT,
        timePeriod: '7d',
        convert: CURRENCY_USD,
        sort: 'percent_change_24h',
        sortDir: 'asc',
      })

      expect(stub.requests).toHaveLength(1)
      const [request] = stub.requests
      const url = new URL(request.url)
      expect(`${url.origin}${url.pathname}`).toBe(GAINERS_LOSERS_URL)
      expect(Object.fromEntries(url.searchParams)).toEqual({
        start: String(START),
        limit: String(LIMIT),
        time_period: '7d',
        convert: CURRENCY_USD,
        sort: 'percent_change_24h',
        sort_dir: 'asc',
      })
      expect(request.headers.get(API_KEY_HEADER)).toBe(DUMMY_API_KEY)
    })

    test('maps each quote record to a quotes entry keyed by currency', async () => {
      stub = stubFetch(200, successFixture)
      const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

      const { entries } = await client.fetchGainersLosers()

      expect(entries).toEqual(
        successFixture.data.map((item) => ({
          id: item.id,
          name: item.name,
          symbol: item.symbol,
          slug: item.slug,
          quotes: [
            {
              currency: CURRENCY_USD,
              price: item.quote.USD.price,
              percentChange1h: item.quote.USD.percent_change_1h,
              percentChange24h: item.quote.USD.percent_change_24h,
              percentChange7d: item.quote.USD.percent_change_7d,
              percentChange30d: item.quote.USD.percent_change_30d,
            },
          ],
        })),
      )
    })

    test('exposes status.credit_count as creditCount', async () => {
      stub = stubFetch(200, successFixture)
      const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

      const { creditCount } = await client.fetchGainersLosers()

      expect(creditCount).toBe(successFixture.status.credit_count)
    })

    test('surfaces the status and error code from a plan-gated envelope', async () => {
      stub = stubFetch(403, planGatedFixture)
      const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

      await expect(client.fetchGainersLosers()).rejects.toThrow(/403.*error_code 1006/)
    })
  })
})
