import { test, expect } from '@playwright/test'
import { Severity, severity } from '@tests/helpers/severity'
import type { QuotesLatestEntry } from '@src/clients/coinmarketcap'
import { createCmcClient } from '@tests/helpers/cmc'
import { useTestCaseIds } from '@tests/helpers/testCaseId'

/**
 * Test cases for GET /v3/cryptocurrency/quotes/latest. Each test is mapped to
 * its source test case in data/test-cases.db via the `test-case-id`
 * annotation (see useTestCaseIds). Tests below are ordered by that id.
 *
 * The endpoint is available on the Basic (free) plan: re-verified live on
 * 2026-10-13. TC-22 asserts Basic's one-convert limit and will fail if the key
 * is upgraded.
 *
 * TC-79 (invalid API key) is automated as the live provider contract's
 * invalid-key test, not here.
 *
 * Not every seeded test case is automated:
 * - TC-78 (missing API key) can't be expressed through this client, since its
 *   constructor requires a truthy apiKey and always sends whatever it's given.
 * - TC-80 (keyless /public-api path) isn't supported by this client: it always
 *   sends the key and resolves the path against the host root.
 * - TC-83 (a rejected request costs no credits) isn't testable here, because a
 *   non-OK response throws and creditCount is only returned on success.
 */

const CMC_ID_BTC = 1
const CMC_ID_ETH = 1027
const CMC_ID_NONEXISTENT = 999_999_999
const SLUG_BITCOIN = 'bitcoin'
const SLUG_ETHEREUM = 'ethereum'
const SLUG_NONEXISTENT = 'not-a-real-coin-xyz'
const SYMBOL_BTC = 'BTC'
const SYMBOL_NONEXISTENT = 'ZZZZZQQ'
const CURRENCY_USD = 'USD'
const CURRENCY_ID_USD = 2781
const CURRENCY_EUR = 'EUR'
const CURRENCY_ID_EUR = 2790
const CURRENCY_UNKNOWN = 'NOTACURRENCY'
const AUX_CMC_RANK = 'cmc_rank'
const AUX_UNKNOWN = 'not_a_field'

/** Upper bound on ids per call. */
const MAX_IDS_PER_CALL = 400
/** Results billed as one credit; one more rounds up to two. */
const RESULTS_PER_CREDIT = 250

/** Supplemental fields returned when `aux` is omitted. */
const DEFAULT_AUX_FIELDS = [
  'numMarketPairs',
  'cmcRank',
  'dateAdded',
  'tags',
  'platform',
  'maxSupply',
  'circulatingSupply',
  'totalSupply',
  'isActive',
  'isFiat',
] as const satisfies readonly (keyof QuotesLatestEntry)[]
/** Default aux fields that `aux=cmc_rank` must leave out. */
const FIELDS_EXCLUDED_BY_AUX_CMC_RANK = [
  'numMarketPairs',
  'dateAdded',
  'tags',
  'platform',
  'isActive',
] as const satisfies readonly (keyof QuotesLatestEntry)[]

/**
 * Every rejection below is HTTP 400 with `error_code` 400 (re-verified live on
 * 2026-10-15), so the code alone can't tell them apart. Each test also matches
 * a short key phrase from `error_message` rather than the whole sentence,
 * which survives CMC rewording or requoting the rest of it.
 */
const HTTP_BAD_REQUEST = 400
const ERROR_CODE_BAD_REQUEST = 400

const PHRASE_NO_IDENTIFIER = 'must contain at least one of'
const PHRASE_EXCLUSIVE_IDENTIFIERS = 'conflict between exclusive peers'
const PHRASE_UNKNOWN_ID = 'No data found'
const PHRASE_TOO_MANY_IDS = `restricted to ${MAX_IDS_PER_CALL}`
const PHRASE_CONVERT_AND_CONVERT_ID = 'must not exist simultaneously'
const PHRASE_BASIC_PLAN_CONVERT_LIMIT = 'limited to 1 convert'
const PHRASE_UNKNOWN_AUX = 'should only include'

const escapeRegExp = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

/** Matches the client's error for a CMC bad-request rejection whose message contains `keyPhrase`. */
const badRequest = (keyPhrase: string): RegExp =>
  new RegExp(String.raw`\b${HTTP_BAD_REQUEST}\b.*error_code ${ERROR_CODE_BAD_REQUEST}: .*${escapeRegExp(keyPhrase)}`)

/** Comma-separated ids 1..count. Not every id in the range resolves. */
const idRange = (count: number): string => Array.from({ length: count }, (_, i) => i + 1).join(',')

let fullIdRangeCall: Promise<readonly QuotesLatestEntry[]> | undefined

/**
 * Entries for ids 1..MAX_IDS_PER_CALL. That call costs 2 credits, so it's made
 * once per worker, with its own client on CMC_API_KEY, and shared by TC-65,
 * TC-81 and TC-82. The result is readonly because every caller sees the same
 * array. A failed test restarts its worker, so a retry makes a fresh call
 * rather than reusing a failure.
 */
function fullIdRangeEntries(): Promise<readonly QuotesLatestEntry[]> {
  fullIdRangeCall ??= createCmcClient()
    .fetchQuotesLatest({ id: idRange(MAX_IDS_PER_CALL) })
    .then(({ entries }) => entries)
  return fullIdRangeCall
}

/** `count` ids known to resolve, taken from the shared call over the full id range. */
async function resolvableIds(count: number): Promise<string> {
  const entries = await fullIdRangeEntries()
  expect(entries.length, `ids 1..${MAX_IDS_PER_CALL} must yield at least ${count} assets`).toBeGreaterThanOrEqual(
    count,
  )
  return entries
    .slice(0, count)
    .map((entry) => entry.id)
    .join(',')
}

let btcByIdCall: Promise<readonly QuotesLatestEntry[]> | undefined

/**
 * Entries for `{ id: BTC }`, fetched once per worker and shared by TC-52,
 * TC-67, TC-74 and TC-77, which assert on different parts of the same
 * response. Readonly and retried the same way as fullIdRangeEntries().
 */
function btcByIdEntries(): Promise<readonly QuotesLatestEntry[]> {
  btcByIdCall ??= createCmcClient()
    .fetchQuotesLatest({ id: String(CMC_ID_BTC) })
    .then(({ entries }) => entries)
  return btcByIdCall
}

/** The single entry a one-id lookup returns, failing readably if there isn't exactly one. */
function onlyEntry(entries: readonly QuotesLatestEntry[]): QuotesLatestEntry {
  expect(entries, 'a single-id lookup must return exactly one asset').toHaveLength(1)
  return entries[0]
}

const quoteCurrencies = (entry: QuotesLatestEntry) =>
  entry.quotes.map((quote) => ({ currency: quote.currency, currencyId: quote.currencyId }))

test.describe('CoinMarketCap API', () => {
  test.describe('Quotes Latest — GET /v3/cryptocurrency/quotes/latest', () => {
    useTestCaseIds()

    test(
      'resolves a known asset by id',
      severity(Severity.CRITICAL, { type: 'test-case-id', description: '52' }),
      async () => {
        const entries = await btcByIdEntries()

        expect(entries.map(({ id, name, symbol, slug }) => ({ id, name, symbol, slug }))).toEqual([
          { id: CMC_ID_BTC, name: 'Bitcoin', symbol: SYMBOL_BTC, slug: SLUG_BITCOIN },
        ])
      },
    )

    test(
      'resolves a known asset by slug',
      severity(Severity.CRITICAL, { type: 'test-case-id', description: '53' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ slug: SLUG_BITCOIN })

        expect(entries.map((entry) => entry.id)).toEqual([CMC_ID_BTC])
      },
    )

    test(
      'symbol returns every asset sharing that ticker',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '54' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ symbol: SYMBOL_BTC })

        // Membership, not an exact count: tokens reusing a ticker come and go.
        expect(entries.length).toBeGreaterThan(1)
        expect(new Set(entries.map((entry) => entry.symbol))).toEqual(new Set([SYMBOL_BTC]))
        expect(entries.map((entry) => entry.id)).toContain(CMC_ID_BTC)
      },
    )

    test(
      'symbol lookup is case-insensitive',
      severity(Severity.MINOR, { type: 'test-case-id', description: '55' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ symbol: SYMBOL_BTC.toLowerCase() })

        expect(new Set(entries.map((entry) => entry.symbol))).toEqual(new Set([SYMBOL_BTC]))
        expect(entries.map((entry) => entry.id)).toContain(CMC_ID_BTC)
      },
    )

    test(
      'resolves multiple comma-separated ids in one call',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '56' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ id: `${CMC_ID_BTC},${CMC_ID_ETH}` })

        expect(entries.map((entry) => entry.id).sort((a, b) => a - b)).toEqual([CMC_ID_BTC, CMC_ID_ETH])
      },
    )

    test(
      'resolves multiple comma-separated slugs in one call',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '57' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ slug: `${SLUG_BITCOIN},${SLUG_ETHEREUM}` })

        expect(entries.map((entry) => entry.id).sort((a, b) => a - b)).toEqual([CMC_ID_BTC, CMC_ID_ETH])
      },
    )

    test(
      'rejects a request with no identifier param',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '58' }),
      async () => {
        const client = createCmcClient()

        await expect(client.fetchQuotesLatest()).rejects.toThrow(badRequest(PHRASE_NO_IDENTIFIER))
      },
    )

    test(
      'rejects id and symbol supplied together',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '59' }),
      async () => {
        const client = createCmcClient()

        await expect(client.fetchQuotesLatest({ id: String(CMC_ID_ETH), symbol: SYMBOL_BTC })).rejects.toThrow(
          badRequest(PHRASE_EXCLUSIVE_IDENTIFIERS),
        )
      },
    )

    test(
      'an unknown id on its own is rejected',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '60' }),
      async () => {
        const client = createCmcClient()

        await expect(client.fetchQuotesLatest({ id: String(CMC_ID_NONEXISTENT) })).rejects.toThrow(badRequest(PHRASE_UNKNOWN_ID))
      },
    )

    test(
      'an unknown slug is rejected',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '61' }),
      async () => {
        const client = createCmcClient()

        await expect(client.fetchQuotesLatest({ slug: SLUG_NONEXISTENT })).rejects.toThrow(badRequest(SLUG_NONEXISTENT))
      },
    )

    test(
      'an unknown symbol returns an empty result, not an error',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '62' }),
      async () => {
        const client = createCmcClient()

        const result = await client.fetchQuotesLatest({ symbol: SYMBOL_NONEXISTENT })

        expect(result).toEqual({ entries: [], creditCount: 0 })
      },
    )

    test(
      'unresolvable ids in a list are dropped by default',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '63' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ id: `${CMC_ID_BTC},${CMC_ID_NONEXISTENT}` })

        expect(entries.map((entry) => entry.id)).toEqual([CMC_ID_BTC])
      },
    )

    test(
      'skipInvalid=false rejects a list with an unresolvable id',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '64' }),
      async () => {
        const client = createCmcClient()

        await expect(
          client.fetchQuotesLatest({ id: `${CMC_ID_BTC},${CMC_ID_NONEXISTENT}`, skipInvalid: false }),
        ).rejects.toThrow(badRequest(String(CMC_ID_NONEXISTENT)))
      },
    )

    test(
      `a list of ${MAX_IDS_PER_CALL} ids is accepted`,
      severity(Severity.NORMAL, { type: 'test-case-id', description: '65' }),
      async () => {
        const entries = await fullIdRangeEntries()

        expect(entries.length).toBeGreaterThan(0)
        expect(entries.length).toBeLessThanOrEqual(MAX_IDS_PER_CALL)
      },
    )

    test(
      `a list of ${MAX_IDS_PER_CALL + 1} ids is rejected`,
      severity(Severity.NORMAL, { type: 'test-case-id', description: '66' }),
      async () => {
        const client = createCmcClient()

        await expect(client.fetchQuotesLatest({ id: idRange(MAX_IDS_PER_CALL + 1) })).rejects.toThrow(
          badRequest(PHRASE_TOO_MANY_IDS),
        )
      },
    )

    test(
      'no convert returns a single USD quote',
      severity(Severity.CRITICAL, { type: 'test-case-id', description: '67' }),
      async () => {
        const entries = await btcByIdEntries()
        const entry = onlyEntry(entries)

        expect(quoteCurrencies(entry)).toEqual([{ currency: CURRENCY_USD, currencyId: CURRENCY_ID_USD }])
        expect(entry.quotes[0].price).toBeGreaterThan(0)
      },
    )

    test(
      'convert to a fiat currency returns a quote in that currency',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '68' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ id: String(CMC_ID_BTC), convert: CURRENCY_EUR })
        const entry = onlyEntry(entries)

        expect(quoteCurrencies(entry)).toEqual([{ currency: CURRENCY_EUR, currencyId: CURRENCY_ID_EUR }])
        expect(entry.quotes[0].price).toBeGreaterThan(0)
      },
    )

    test(
      'convert to a cryptocurrency returns a quote in that crypto',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '69' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ id: String(CMC_ID_ETH), convert: SYMBOL_BTC })
        const entry = onlyEntry(entries)

        expect(quoteCurrencies(entry)).toEqual([{ currency: SYMBOL_BTC, currencyId: CMC_ID_BTC }])
        expect(entry.quotes[0].price).toBeGreaterThan(0)
      },
    )

    test(
      'convertId resolves a quote in the requested currency',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '70' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ id: String(CMC_ID_BTC), convertId: String(CURRENCY_ID_EUR) })
        const entry = onlyEntry(entries)

        expect(quoteCurrencies(entry)).toEqual([{ currency: CURRENCY_EUR, currencyId: CURRENCY_ID_EUR }])
        expect(entry.quotes[0].price).toBeGreaterThan(0)
      },
    )

    test(
      'convert and convertId together are rejected',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '71' }),
      async () => {
        const client = createCmcClient()

        await expect(
          client.fetchQuotesLatest({
            id: String(CMC_ID_BTC),
            convert: CURRENCY_USD,
            convertId: String(CURRENCY_ID_USD),
          }),
        ).rejects.toThrow(badRequest(PHRASE_CONVERT_AND_CONVERT_ID))
      },
    )

    test(
      'an unknown convert currency is rejected',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '72' }),
      async () => {
        const client = createCmcClient()

        await expect(client.fetchQuotesLatest({ id: String(CMC_ID_BTC), convert: CURRENCY_UNKNOWN })).rejects.toThrow(
          badRequest(CURRENCY_UNKNOWN),
        )
      },
    )

    test(
      'Basic plan rejects more than one convert currency',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '73' }),
      async () => {
        const client = createCmcClient()

        await expect(
          client.fetchQuotesLatest({ id: String(CMC_ID_BTC), convert: `${CURRENCY_USD},${CURRENCY_EUR}` }),
        ).rejects.toThrow(badRequest(PHRASE_BASIC_PLAN_CONVERT_LIMIT))
      },
    )

    test(
      'no aux returns the default supplemental fields',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '74' }),
      async () => {
        const entries = await btcByIdEntries()
        const entry = onlyEntry(entries)

        const missing = DEFAULT_AUX_FIELDS.filter((field) => entry[field] === undefined)
        expect(missing).toEqual([])
      },
    )

    test(
      'aux limits supplemental fields to those requested',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '75' }),
      async () => {
        const client = createCmcClient()

        const { entries } = await client.fetchQuotesLatest({ id: String(CMC_ID_BTC), aux: AUX_CMC_RANK })
        const entry = onlyEntry(entries)

        expect(entry.cmcRank).toBeDefined()
        const unexpected = FIELDS_EXCLUDED_BY_AUX_CMC_RANK.filter((field) => entry[field] !== undefined)
        expect(unexpected).toEqual([])
      },
    )

    test(
      'an unknown aux value is rejected',
      severity(Severity.NORMAL, { type: 'test-case-id', description: '76' }),
      async () => {
        const client = createCmcClient()

        await expect(client.fetchQuotesLatest({ id: String(CMC_ID_BTC), aux: AUX_UNKNOWN })).rejects.toThrow(
          badRequest(PHRASE_UNKNOWN_AUX),
        )
      },
    )

    test(
      'a quote carries price, market and percent-change metrics',
      severity(Severity.CRITICAL, { type: 'test-case-id', description: '77' }),
      async () => {
        const entries = await btcByIdEntries()
        const entry = onlyEntry(entries)
        const [quote] = entry.quotes

        expect(quote.price).toBeGreaterThan(0)
        expect(quote).toEqual(
          expect.objectContaining({
            marketCap: expect.any(Number),
            volume24h: expect.any(Number),
            percentChange1h: expect.any(Number),
            percentChange24h: expect.any(Number),
            percentChange7d: expect.any(Number),
          }),
        )
        expect(new Date(quote.lastUpdated).toISOString()).toBe(quote.lastUpdated)
      },
    )

    test(
      `creditCount is 1 for up to ${RESULTS_PER_CREDIT} results`,
      severity(Severity.MINOR, { type: 'test-case-id', description: '81' }),
      async () => {
        const client = createCmcClient()
        const ids = await resolvableIds(RESULTS_PER_CREDIT)

        const result = await client.fetchQuotesLatest({ id: ids })

        expect(result.entries).toHaveLength(RESULTS_PER_CREDIT)
        expect(result.creditCount).toBe(1)
      },
    )

    test(
      `creditCount rounds up past ${RESULTS_PER_CREDIT} results`,
      severity(Severity.MINOR, { type: 'test-case-id', description: '82' }),
      async () => {
        const client = createCmcClient()
        const ids = await resolvableIds(RESULTS_PER_CREDIT + 1)

        const result = await client.fetchQuotesLatest({ id: ids })

        expect(result.entries).toHaveLength(RESULTS_PER_CREDIT + 1)
        expect(result.creditCount).toBe(2)
      },
    )
  })
})
