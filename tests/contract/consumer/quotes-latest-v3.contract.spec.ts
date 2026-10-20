import { test, expect } from '@playwright/test'
import { Severity, severity } from '@tests/helpers/severity'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'
import { CmcErrorResponseSchema, QuotesLatestV3ResponseSchema } from '@src/clients/coinmarketcap/schemas'
import {
  API_KEY_HEADER,
  CMC_BASE_URL,
  CMC_ID_BTC,
  CMC_ID_USDC,
  DUMMY_API_KEY,
  QUOTES_LATEST_V3_IDS,
} from '../helpers/constants'
import { expectMatchesSchema } from '../helpers/expectMatchesSchema'
import { stubFetch, type FetchStub } from '../helpers/stubFetch'
import successFixture from '../fixtures/quotes-latest-v3.btc-usdc.json'
import invalidKeyFixture from '../fixtures/error.invalid-key-1001.quotes-latest-v3.json'

/**
 * Consumer contract for fetchQuotesLatest (GET /v3/cryptocurrency/quotes/latest):
 * runs the real client offline against contract-valid fixtures, checking the
 * request it sends and how it maps the response. No network, no API key.
 */

const QUOTES_LATEST_V3_URL = `${CMC_BASE_URL}/v3/cryptocurrency/quotes/latest`
const IDS_BTC_USDC = QUOTES_LATEST_V3_IDS.join(',')
const CURRENCY_ID_USD = '2781'
const AUX_FIELDS = 'cmc_rank,platform'

test.describe('fetchQuotesLatest consumer contract — GET /v3/cryptocurrency/quotes/latest', severity(Severity.CRITICAL), () => {
  let stub: FetchStub | undefined

  test.afterEach(() => {
    stub?.restore()
  })

  test('the success fixture matches the contract', () => {
    expectMatchesSchema(successFixture, QuotesLatestV3ResponseSchema)
  })

  test('the invalid-key fixture matches the error contract', () => {
    expectMatchesSchema(invalidKeyFixture, CmcErrorResponseSchema)
  })

  test('sends options as snake_case query params with the API key header', async () => {
    stub = stubFetch(200, successFixture)
    const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

    await client.fetchQuotesLatest({
      id: IDS_BTC_USDC,
      convertId: CURRENCY_ID_USD,
      aux: AUX_FIELDS,
      skipInvalid: false,
    })

    expect(stub.requests).toHaveLength(1)
    const [request] = stub.requests
    const url = new URL(request.url)
    expect(`${url.origin}${url.pathname}`).toBe(QUOTES_LATEST_V3_URL)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      id: IDS_BTC_USDC,
      convert_id: CURRENCY_ID_USD,
      aux: AUX_FIELDS,
      skip_invalid: 'false',
    })
    expect(request.headers.get(API_KEY_HEADER)).toBe(DUMMY_API_KEY)
  })

  test('maps each data item to an entry with camelCase fields and one quote per currency', async () => {
    stub = stubFetch(200, successFixture)
    const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

    const { entries } = await client.fetchQuotesLatest({ id: IDS_BTC_USDC })

    const [btc, usdc] = successFixture.data
    const toQuotes = (item: (typeof successFixture.data)[number]) =>
      item.quote.map((quote) => ({
        currency: quote.symbol,
        currencyId: quote.id,
        price: quote.price,
        marketCap: quote.market_cap,
        volume24h: quote.volume_24h,
        percentChange1h: quote.percent_change_1h,
        percentChange24h: quote.percent_change_24h,
        percentChange7d: quote.percent_change_7d,
        lastUpdated: quote.last_updated,
      }))
    // Literal values for the fields the client converts rather than copies:
    // tag objects → slugs, platform → { id, tokenAddress }, 0/1 flags → booleans.
    expect(entries).toEqual([
      {
        id: CMC_ID_BTC,
        name: 'Bitcoin',
        symbol: 'BTC',
        slug: 'bitcoin',
        numMarketPairs: btc.num_market_pairs,
        cmcRank: 1,
        dateAdded: '2010-07-13T00:00:00.000Z',
        tags: ['mineable', 'pow'],
        platform: null,
        maxSupply: 21000000,
        circulatingSupply: btc.circulating_supply,
        totalSupply: btc.total_supply,
        isActive: true,
        isFiat: false,
        quotes: toQuotes(btc),
      },
      {
        id: CMC_ID_USDC,
        name: 'USDC',
        symbol: 'USDC',
        slug: 'usd-coin',
        numMarketPairs: usdc.num_market_pairs,
        cmcRank: usdc.cmc_rank,
        dateAdded: '2018-10-08T00:00:00.000Z',
        tags: ['medium-of-exchange', 'stablecoin'],
        platform: { id: 24091, tokenAddress: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4' },
        maxSupply: null,
        circulatingSupply: usdc.circulating_supply,
        totalSupply: usdc.total_supply,
        isActive: true,
        isFiat: false,
        quotes: toQuotes(usdc),
      },
    ])
  })

  test('exposes status.credit_count as creditCount', async () => {
    stub = stubFetch(200, successFixture)
    const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

    const { creditCount } = await client.fetchQuotesLatest({ id: IDS_BTC_USDC })

    expect(creditCount).toBe(successFixture.status.credit_count)
  })

  test('surfaces the status and error code from an error envelope', async () => {
    stub = stubFetch(401, invalidKeyFixture)
    const client = new CoinMarketCapClient({ apiKey: DUMMY_API_KEY })

    await expect(client.fetchQuotesLatest({ id: IDS_BTC_USDC })).rejects.toThrow(/401.*error_code 1001: This API Key is invalid/)
  })
})
