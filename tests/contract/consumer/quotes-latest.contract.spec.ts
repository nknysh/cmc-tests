import { test, expect } from '@playwright/test'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'
import { CmcErrorResponseSchema, QuoteResponseSchema } from '@src/clients/coinmarketcap/schemas'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'
import { stubFetch, type FetchStub } from '../helpers/stubFetch'
import quotesLatestFixture from '../fixtures/quotes-latest.btc.json'
import invalidKeyFixture from '../fixtures/error.invalid-key-1001.json'

/**
 * Consumer contract for fetchPrice (GET /v2/cryptocurrency/quotes/latest):
 * runs the real client offline against contract-valid fixtures, checking the
 * request it sends and how it maps the response. No network, no API key.
 */

const DUMMY_API_KEY = 'contract-test-key'
const API_KEY_HEADER = 'X-CMC_PRO_API_KEY'
const QUOTES_LATEST_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
const SYMBOL_BTC = 'BTC'
const CURRENCY_USD = 'USD'

test.describe('CoinMarketCap contract (consumer)', () => {
  test.describe('fetchPrice — GET /v2/cryptocurrency/quotes/latest', () => {
    let stub: FetchStub | undefined

    test.afterEach(() => {
      stub?.restore()
    })

    test('the success fixture matches the contract', () => {
      expectMatchesSchema(quotesLatestFixture, QuoteResponseSchema)
    })

    test('the invalid-key fixture matches the error contract', () => {
      expectMatchesSchema(invalidKeyFixture, CmcErrorResponseSchema)
    })

    test('sends the symbol, convert=USD and the API key header', async () => {
      stub = stubFetch(200, quotesLatestFixture)
      const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

      await client.fetchPrice(SYMBOL_BTC)

      expect(stub.requests).toHaveLength(1)
      const [request] = stub.requests
      const url = new URL(request.url)
      expect(`${url.origin}${url.pathname}`).toBe(QUOTES_LATEST_URL)
      expect(Object.fromEntries(url.searchParams)).toEqual({ symbol: SYMBOL_BTC, convert: CURRENCY_USD })
      expect(request.headers.get(API_KEY_HEADER)).toBe(DUMMY_API_KEY)
    })

    test('maps the response to a Price', async () => {
      stub = stubFetch(200, quotesLatestFixture)
      const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

      const price = await client.fetchPrice(SYMBOL_BTC)

      const { quote } = quotesLatestFixture.data.BTC[0]
      expect(price).toEqual({
        price: quote.USD.price,
        currency: CURRENCY_USD,
        lastUpdated: quote.USD.last_updated,
      })
    })

    test('surfaces the status and error code from an error envelope', async () => {
      stub = stubFetch(401, invalidKeyFixture)
      const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

      await expect(client.fetchPrice(SYMBOL_BTC)).rejects.toThrow(/401.*error_code 1001: This API Key is invalid/)
    })
  })
})
