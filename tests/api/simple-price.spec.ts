import { test, expect } from '@playwright/test'
import { Severity, severity } from '@tests/helpers/severity'
import type { SimplePriceEntry } from '@src/clients/coinmarketcap'
import { createCmcClient } from '@tests/helpers/cmc'
import { useTestCaseIds } from '@tests/helpers/testCaseId'

/**
 * Test cases for GET /v2/simple/price. Each test is mapped to its source
 * test case in data/test-cases.db via the `test-case-id` annotation (see
 * useTestCaseIds). Tests below are ordered by that id.
 *
 * Some seeded test cases are automated at another level:
 * - TC-05 (no identifier) and TC-12 (convert with convertId) are rejected by
 *   the client before any request, so they're offline consumer contract tests.
 * - TC-20 (invalid API key) is the live provider contract's invalid-key test.
 *
 * Not every seeded test case is automated:
 * - TC-08 (ambiguous symbol collision) needs a real colliding symbol example.
 * - TC-19 (missing API key) can't be expressed through this client, since its
 *   constructor requires a truthy apiKey and always sends whatever it's given.
 * - TC-21 (keyless /public-api path) isn't supported by this client yet.
 * - TC-22/23 (credit_count assertions) aren't testable here because
 *   fetchSimplePrice's domain type doesn't expose response.status.
 * - TC-24 (rate limit) deliberately trips a real quota limit; left for a
 *   separate opt-in decision rather than running on every CI pass.
 */

const CMC_ID_BTC = '1'
const CMC_ID_ETH = '1027'
const CMC_ID_NONEXISTENT = '999999999'
const SLUG_BITCOIN = 'bitcoin'
const SYMBOL_BTC = 'BTC'
const CURRENCY_USD = 'USD'
const CURRENCY_EUR = 'EUR'
const CURRENCY_ID_USD = '2781'

/** `precision` values checked, each mapped to its own test case. */
const PRECISION_CASES = [
  { testCaseId: '17', precision: 2 },
  { testCaseId: '18', precision: 0 },
] as const

let btcUsdCall: Promise<readonly SimplePriceEntry[]> | undefined

/**
 * Entries for `{ id: BTC, convert: USD }`, fetched once per worker and shared
 * by TC-01, TC-09 and TC-13, which assert on different parts of the same
 * response. The result is readonly because every caller sees the same array.
 * A failed test restarts its worker, so a retry makes a fresh call rather
 * than reusing a failure.
 */
function btcUsdEntries(): Promise<readonly SimplePriceEntry[]> {
  btcUsdCall ??= createCmcClient().fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD })
  return btcUsdCall
}

/** Digits after the decimal point in a number's default string form. */
const decimalPlaces = (value: number): number => (value.toString().split('.')[1] ?? '').length

test.describe('CoinMarketCap API', () => {
  test.describe('Simple Price — GET /v2/simple/price', () => {
    useTestCaseIds()

    test(
      'resolves a known asset by id',
      { annotation: [{ type: 'test-case-id', description: '1' }, severity(Severity.CRITICAL)] },
      async () => {
        const [entry] = await btcUsdEntries()

        expect(entry.id).toBe(Number(CMC_ID_BTC))
        expect(entry.name).toBe('Bitcoin')
        expect(entry.symbol).toBe(SYMBOL_BTC)
        expect(entry.slug).toBe(SLUG_BITCOIN)
        expect(entry.quotes).toHaveLength(1)
      },
    )

    test(
      'resolves a known asset by slug',
      { annotation: [{ type: 'test-case-id', description: '2' }, severity(Severity.CRITICAL)] },
      async () => {
        const client = createCmcClient()

        const [entry] = await client.fetchSimplePrice({ slug: SLUG_BITCOIN, convert: CURRENCY_USD })

        expect(entry.id).toBe(Number(CMC_ID_BTC))
      },
    )

    test(
      'resolves a known asset by symbol',
      { annotation: [{ type: 'test-case-id', description: '3' }, severity(Severity.CRITICAL)] },
      async () => {
        const client = createCmcClient()

        const [entry] = await client.fetchSimplePrice({ symbol: SYMBOL_BTC, convert: CURRENCY_USD })

        expect(entry.id).toBe(Number(CMC_ID_BTC))
      },
    )

    test(
      'resolves multiple comma-separated ids in one call',
      { annotation: [{ type: 'test-case-id', description: '4' }, severity(Severity.CRITICAL)] },
      async () => {
        const client = createCmcClient()

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
      'an unresolvable id returns an empty result rather than failing',
      { annotation: [{ type: 'test-case-id', description: '6' }, severity(Severity.NORMAL)] },
      async () => {
        const client = createCmcClient()

        const result = await client.fetchSimplePrice({ id: CMC_ID_NONEXISTENT, convert: CURRENCY_USD })

        expect(result).toEqual([])
      },
    )

    test(
      'skip_invalid drops unresolvable ids instead of failing the whole call',
      { annotation: [{ type: 'test-case-id', description: '7' }, severity(Severity.NORMAL)] },
      async () => {
        const client = createCmcClient()

        const result = await client.fetchSimplePrice({
          id: `${CMC_ID_BTC},${CMC_ID_NONEXISTENT}`,
          convert: CURRENCY_USD,
          skipInvalid: true,
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(Number(CMC_ID_BTC))
      },
    )

    test(
      'single convert currency returns one quote entry',
      { annotation: [{ type: 'test-case-id', description: '9' }, severity(Severity.CRITICAL)] },
      async () => {
        const [entry] = await btcUsdEntries()

        expect(entry.quotes).toHaveLength(1)
        expect(entry.quotes[0].currency).toBe(CURRENCY_USD)
        expect(entry.quotes[0].price).toBeGreaterThan(0)
      },
    )

    test(
      'multiple convert currencies return one entry per currency',
      { annotation: [{ type: 'test-case-id', description: '10' }, severity(Severity.NORMAL)] },
      async () => {
        const client = createCmcClient()

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
      { annotation: [{ type: 'test-case-id', description: '11' }, severity(Severity.NORMAL)] },
      async () => {
        const client = createCmcClient()

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
      'no include flags: response omits all optional fields',
      { annotation: [{ type: 'test-case-id', description: '13' }, severity(Severity.NORMAL)] },
      async () => {
        const [entry] = await btcUsdEntries()

        expect(entry.quotes[0].marketCap).toBeUndefined()
        expect(entry.quotes[0].volume24h).toBeUndefined()
        expect(entry.quotes[0].percentChange24h).toBeUndefined()
        expect(entry.quotes[0].lastUpdated).toBeUndefined()
      },
    )

    test(
      'includeAll adds every optional field',
      { annotation: [{ type: 'test-case-id', description: '14' }, severity(Severity.NORMAL)] },
      async () => {
        const client = createCmcClient()

        const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD, includeAll: true })

        expect(entry.quotes[0].marketCap).toBeDefined()
        expect(entry.quotes[0].volume24h).toBeDefined()
        expect(entry.quotes[0].percentChange24h).toBeDefined()
        expect(entry.quotes[0].lastUpdated).toBeDefined()
      },
    )

    test(
      'an individual include flag adds only its own field',
      { annotation: [{ type: 'test-case-id', description: '15' }, severity(Severity.NORMAL)] },
      async () => {
        const client = createCmcClient()

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
      { annotation: [{ type: 'test-case-id', description: '16' }, severity(Severity.NORMAL)] },
      async () => {
        const client = createCmcClient()

        const [entry] = await client.fetchSimplePrice({
          id: CMC_ID_BTC,
          convert: CURRENCY_USD,
          includeAll: true,
          includeMarketCap: false,
        })

        expect(entry.quotes[0].marketCap).toBeDefined()
      },
    )

    for (const { testCaseId, precision } of PRECISION_CASES) {
      test(
        `precision=${precision} rounds price to at most ${precision} decimal places`,
        { annotation: [{ type: 'test-case-id', description: testCaseId }, severity(Severity.MINOR)] },
        async () => {
          const client = createCmcClient()

          const [entry] = await client.fetchSimplePrice({ id: CMC_ID_BTC, convert: CURRENCY_USD, precision })

          expect(decimalPlaces(entry.quotes[0].price)).toBeLessThanOrEqual(precision)
        },
      )
    }
  })
})
