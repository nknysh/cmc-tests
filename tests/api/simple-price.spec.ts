import { test, expect } from '@playwright/test'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'

/**
 * Test cases for GET /v2/simple/price. Each test is mapped to its source
 * test case in data/test-cases.db (see src/db/testCases/) via the
 * `test-case-id` annotation, which matches that database's `test_cases.id`.
 * Tests below are ordered by that id.
 *
 * Not every seeded test case is automated here:
 * - TC-08 (ambiguous symbol collision) needs a real colliding symbol example.
 * - TC-19 (missing API key) can't be expressed through this client, since its
 *   constructor requires a truthy apiKey and always sends whatever it's given.
 * - TC-21 (keyless /public-api path) isn't supported by this client yet.
 * - TC-22/23 (credit_count assertions) aren't testable here because
 *   fetchSimplePrice's domain type doesn't expose response.status.
 * - TC-24 (rate limit) deliberately trips a real quota limit; left for a
 *   separate opt-in decision rather than running on every CI pass.
 */

const apiKey = process.env.CMC_API_KEY

const CMC_ID_BTC = '1'
const CMC_ID_ETH = '1027'
const CMC_ID_NONEXISTENT = '999999999'
const SLUG_BITCOIN = 'bitcoin'
const SYMBOL_BTC = 'BTC'
const CURRENCY_USD = 'USD'
const CURRENCY_EUR = 'EUR'
const CURRENCY_ID_USD = '2781'

test.describe('CoinMarketCap API', () => {
  test.describe('Simple Price — GET /v2/simple/price', () => {
    test.describe('Identifier resolution (id / slug / symbol)', () => {
      test(
        'resolves a known asset by id',
        { annotation: { type: 'test-case-id', description: '1' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD })

          expect(entry.id).toBe(Number(CMC_ID_BTC))
          expect(entry.name).toBe('Bitcoin')
          expect(entry.symbol).toBe(SYMBOL_BTC)
          expect(entry.slug).toBe(SLUG_BITCOIN)
          expect(entry.quotes).toHaveLength(1)
        },
      )

      test(
        'resolves a known asset by slug',
        { annotation: { type: 'test-case-id', description: '2' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ slug: SLUG_BITCOIN, convert: CURRENCY_USD })

          expect(entry.id).toBe(Number(CMC_ID_BTC))
        },
      )

      test(
        'resolves a known asset by symbol',
        { annotation: { type: 'test-case-id', description: '3' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ symbol: SYMBOL_BTC, convert: CURRENCY_USD })

          expect(entry.id).toBe(Number(CMC_ID_BTC))
        },
      )

      test(
        'resolves multiple comma-separated ids in one call',
        { annotation: { type: 'test-case-id', description: '4' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const result = await client.fetchSimplePrice({
            id: `${CMC_ID_BTC},${CMC_ID_ETH}`,
            convert: CURRENCY_USD,
          })

          expect(result).toHaveLength(2)
          expect(result.map((entry) => entry.id).sort((a, b) => a - b)).toEqual(
            [Number(CMC_ID_BTC), Number(CMC_ID_ETH)].sort((a, b) => a - b),
          )
        },
      )

      test(
        'rejects a request with no identifier param',
        { annotation: { type: 'test-case-id', description: '5' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          await expect(client.fetchSimplePrice({ convert: CURRENCY_USD })).rejects.toThrow(
            /requires one of id, slug, or symbol/,
          )
        },
      )

      test(
        'an unresolvable id returns an empty result rather than failing',
        { annotation: { type: 'test-case-id', description: '6' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const result = await client.fetchSimplePrice({ id: CMC_ID_NONEXISTENT, convert: CURRENCY_USD })

          expect(result).toEqual([])
        },
      )

      test(
        'skip_invalid drops unresolvable ids instead of failing the whole call',
        { annotation: { type: 'test-case-id', description: '7' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const result = await client.fetchSimplePrice({
            id: `${CMC_ID_BTC},${CMC_ID_NONEXISTENT}`,
            convert: CURRENCY_USD,
            skipInvalid: true,
          })

          expect(result).toHaveLength(1)
          expect(result[0].id).toBe(Number(CMC_ID_BTC))
        },
      )
    })

    test.describe('convert / convert_id', () => {
      test(
        'single convert currency returns one quote entry',
        { annotation: { type: 'test-case-id', description: '9' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD })

          expect(entry.quotes).toHaveLength(1)
          expect(entry.quotes[0].currency).toBe(CURRENCY_USD)
          expect(entry.quotes[0].price).toBeGreaterThan(0)
        },
      )

      test(
        'multiple convert currencies return one entry per currency',
        { annotation: { type: 'test-case-id', description: '10' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({
            id: CMC_ID_BTC,
            convert: `${CURRENCY_USD},${CURRENCY_EUR}`,
          })

          expect(entry.quotes).toHaveLength(2)
          expect(entry.quotes.map((quote) => quote.currency).sort()).toEqual(
            [CURRENCY_USD, CURRENCY_EUR].sort(),
          )
        },
      )

      test(
        'convertId resolves a quote in the requested currency',
        { annotation: { type: 'test-case-id', description: '11' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convertId: CURRENCY_ID_USD })

          // Asserted independently, not compared against a separate `convert=USD`
          // call — two live, CDN-cached prices aren't guaranteed to match exactly
          // across two requests, so an equality check here would be flaky.
          expect(entry.quotes).toHaveLength(1)
          expect(entry.quotes[0].currency).toBe(CURRENCY_USD)
          expect(entry.quotes[0].price).toBeGreaterThan(0)
        },
      )

      test(
        'rejects convert and convertId supplied together',
        { annotation: { type: 'test-case-id', description: '12' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          await expect(
            client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD, convertId: CURRENCY_ID_USD }),
          ).rejects.toThrow(/cannot accept both convert and convertId/)
        },
      )
    })

    test.describe('include_* flags', () => {
      test(
        'no include flags: response omits all optional fields',
        { annotation: { type: 'test-case-id', description: '13' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD })

          expect(entry.quotes[0].marketCap).toBeUndefined()
          expect(entry.quotes[0].volume24h).toBeUndefined()
          expect(entry.quotes[0].percentChange24h).toBeUndefined()
          expect(entry.quotes[0].lastUpdated).toBeUndefined()
        },
      )

      test(
        'includeAll adds every optional field',
        { annotation: { type: 'test-case-id', description: '14' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD, includeAll: true })

          expect(entry.quotes[0].marketCap).toBeDefined()
          expect(entry.quotes[0].volume24h).toBeDefined()
          expect(entry.quotes[0].percentChange24h).toBeDefined()
          expect(entry.quotes[0].lastUpdated).toBeDefined()
        },
      )

      test(
        'an individual include flag adds only its own field',
        { annotation: { type: 'test-case-id', description: '15' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({
            id: CMC_ID_BTC,
            convert: CURRENCY_USD,
            includeMarketCap: true,
          })

          expect(entry.quotes[0].marketCap).toBeDefined()
          expect(entry.quotes[0].volume24h).toBeUndefined()
          expect(entry.quotes[0].percentChange24h).toBeUndefined()
          expect(entry.quotes[0].lastUpdated).toBeUndefined()
        },
      )

      test(
        'includeAll overrides an explicit includeMarketCap=false',
        { annotation: { type: 'test-case-id', description: '16' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({
            id: CMC_ID_BTC,
            convert: CURRENCY_USD,
            includeAll: true,
            includeMarketCap: false,
          })

          expect(entry.quotes[0].marketCap).toBeDefined()
        },
      )
    })

    test.describe('precision', () => {
      test(
        'precision rounds returned numeric values',
        { annotation: { type: 'test-case-id', description: '17' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD, precision: 2 })

          const decimalPlaces = (entry.quotes[0].price.toString().split('.')[1] ?? '').length
          expect(decimalPlaces).toBeLessThanOrEqual(2)
        },
      )

      test(
        'precision=0 rounds price to a whole number',
        { annotation: { type: 'test-case-id', description: '18' } },
        async () => {
          expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
          const client = new CoinMarketCapClient({ apiKey: apiKey! })

          const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD, precision: 0 })

          expect(Number.isInteger(entry.quotes[0].price)).toBe(true)
        },
      )
    })

    test.describe('Authentication & plan', () => {
      test(
        'an invalid API key is rejected',
        { annotation: { type: 'test-case-id', description: '20' } },
        async () => {
          const client = new CoinMarketCapClient({ apiKey: 'not-a-real-key' })

          await expect(client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD })).rejects.toThrow(/401/)
        },
      )
    })
  })
})
