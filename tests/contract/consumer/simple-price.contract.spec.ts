import { test, expect } from '@playwright/test'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'
import {
  CmcErrorResponseSchema,
  SimplePriceQuoteIncludeAllSchema,
  SimplePriceResponseSchema,
} from '@src/clients/coinmarketcap/schemas'
import { API_KEY_HEADER, CMC_BASE_URL, DUMMY_API_KEY } from '../helpers/constants'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'
import { stubFetch, type FetchStub } from '../helpers/stubFetch'
import minimalFixture from '../fixtures/simple-price.btc.minimal.json'
import includeAllFixture from '../fixtures/simple-price.btc.include-all.json'
import invalidKeyFixture from '../fixtures/error.invalid-key-1001.simple-price.json'

/**
 * Consumer contract for fetchSimplePrice (GET /v2/simple/price): runs the
 * real client offline against contract-valid fixtures, checking the request
 * it sends and how it maps the response. No network, no API key.
 */

const SIMPLE_PRICE_URL = `${CMC_BASE_URL}/v2/simple/price`
const CMC_ID_BTC = '1'
const CURRENCY_ID_USD = '2781'
const PRECISION = 2

test.describe('fetchSimplePrice consumer contract — GET /v2/simple/price', () => {
  let stub: FetchStub | undefined

  test.afterEach(() => {
    stub?.restore()
  })

  test('the minimal fixture matches the contract', () => {
    expectMatchesSchema(minimalFixture, SimplePriceResponseSchema)
  })

  test('the include_all fixture matches the contract with every optional field', () => {
    const parsed = expectMatchesSchema(includeAllFixture, SimplePriceResponseSchema)
    expectMatchesSchema(parsed.data[0].quotes[0], SimplePriceQuoteIncludeAllSchema)
  })

  test('the invalid-key fixture matches the error contract', () => {
    expectMatchesSchema(invalidKeyFixture, CmcErrorResponseSchema)
  })

  test('sends options as snake_case query params with the API key header', async () => {
    stub = stubFetch(200, includeAllFixture)
    const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

    await client.fetchSimplePrice({
      id: CMC_ID_BTC,
      convertId: CURRENCY_ID_USD,
      includeAll: true,
      precision: PRECISION,
      skipInvalid: true,
    })

    expect(stub.requests).toHaveLength(1)
    const [request] = stub.requests
    const url = new URL(request.url)
    expect(`${url.origin}${url.pathname}`).toBe(SIMPLE_PRICE_URL)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      id: CMC_ID_BTC,
      convert_id: CURRENCY_ID_USD,
      include_all: 'true',
      precision: String(PRECISION),
      skip_invalid: 'true',
    })
    expect(request.headers.get(API_KEY_HEADER)).toBe(DUMMY_API_KEY)
  })

  test('maps a response without optional fields to entries with bare quotes', async () => {
    stub = stubFetch(200, minimalFixture)
    const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

    const entries = await client.fetchSimplePrice({ id: CMC_ID_BTC })

    const [item] = minimalFixture.data
    expect(entries).toEqual([
      {
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        slug: item.slug,
        quotes: [{ currency: item.quotes[0].symbol, price: item.quotes[0].price }],
      },
    ])
  })

  test('maps every optional quote field to its camelCase domain field', async () => {
    stub = stubFetch(200, includeAllFixture)
    const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

    const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, includeAll: true })

    const [quote] = includeAllFixture.data[0].quotes
    expect(entry.quotes).toEqual([
      {
        currency: quote.symbol,
        price: quote.price,
        marketCap: quote.market_cap,
        volume24h: quote.volume_24h,
        percentChange24h: quote.percent_change_24h,
        lastUpdated: quote.last_updated,
      },
    ])
  })

  test('surfaces the status and a string error code from an error envelope', async () => {
    stub = stubFetch(401, invalidKeyFixture)
    const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

    await expect(client.fetchSimplePrice({ id: CMC_ID_BTC })).rejects.toThrow(
      /401.*error_code 1001: This API Key is invalid/,
    )
  })
})
