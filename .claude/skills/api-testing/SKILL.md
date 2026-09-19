---
name: api-testing
description: >
  Patterns for writing typed API clients and Playwright API tests against
  third-party REST APIs, based on this repo's CoinMarketCap client. Use when
  adding a new API client under src/clients, or writing an API spec under
  tests/api.
metadata:
  origin: cmc-tests
---

# API Client & Test Patterns

Conventions for building a typed API client and testing it, derived from
[src/clients/coinmarketcap](../../src/clients/coinmarketcap) and
[tests/api/btc-price.spec.ts](../../tests/api/btc-price.spec.ts).

## Client Folder Layout

Each third-party API gets its own folder under `src/clients/<api-name>/`:

```
src/clients/coinmarketcap/
├── CoinMarketCapClient.ts   # the class
├── types.ts                 # options + request/response shapes
└── index.ts                 # barrel export
```

`index.ts` re-exports the class and its public types only:

```typescript
export { CoinMarketCapClient } from './CoinMarketCapClient'
export type { BtcPrice, BtcQuoteResponse, CoinMarketCapClientOptions } from './types'
```

## Client Class Shape

- One class per API, constructed with an options object (never positional
  args), so new optional fields don't break callers.
- Validate required config (e.g. `apiKey`) in the constructor and throw
  immediately rather than failing later inside a method.
- Store config as `private readonly` fields.
- One public async method per logical operation (e.g. `fetchBtcPrice`),
  returning a small domain type — not the raw API response shape.

```typescript
export interface ClientOptions {
  apiKey: string
  baseUrl?: string
}

export class SomeApiClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL }: ClientOptions) {
    if (!apiKey) throw new Error('SomeApiClient requires an apiKey')
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async fetchThing(): Promise<Thing> {
    /* ... */
  }
}
```

## Types File

Split into three kinds of type:

1. **Domain type** returned to callers — camelCase, only the fields callers
   need (e.g. `BtcPrice { price, currency, lastUpdated }`).
2. **Client options** — the constructor's input shape.
3. **Raw response type** — mirrors the third-party API's actual JSON
   (snake_case fields preserved), used only internally to type `response.json()`.

Never leak the raw response type out of the client module.

## Request/Response Logging

Log every request before sending and the raw response after receiving,
using `console.log` with a `[ClassName]` prefix so logs are greppable.
**Always redact secrets** (API keys, tokens) before logging headers:

```typescript
const headers = { 'X-CMC_PRO_API_KEY': this.apiKey, Accept: 'application/json' }

console.log('[CoinMarketCapClient] request', {
  method: 'GET',
  url: url.toString(),
  headers: { ...headers, 'X-CMC_PRO_API_KEY': '[redacted]' },
})

const response = await fetch(url, { headers })
const responseText = await response.text()

console.log('[CoinMarketCapClient] response', {
  url: url.toString(),
  status: response.status,
  statusText: response.statusText,
  headers: Object.fromEntries(response.headers.entries()),
  body: responseText,
})
```

Read the body as text first, log it, then `JSON.parse` it — this way the
raw body is always captured even if parsing or shape-checking later fails.

## Error Handling

Throw a plain `Error` with the status and status text on a non-OK response,
after logging — don't swallow failures or return `null`:

```typescript
if (!response.ok) {
  throw new Error(`API request failed: ${response.status} ${response.statusText}`)
}
```

## Config via Environment Variables

- API keys live in `.env` (gitignored) with a matching `.env.example`
  (committed) documenting the variable name.
- `playwright.config.ts` loads env vars once via `import 'dotenv/config'` at
  the top, so `process.env.X` is populated for every test.
- Tests read the key from `process.env` and assert it's present before
  constructing the client, so a missing key fails with a clear message
  instead of an opaque API error:

```typescript
const apiKey = process.env.CMC_API_KEY
expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
```

## API Spec Structure

API tests live under `tests/api/`, separate from browser E2E specs under
`tests/e2e/` (both covered by `testDir: './tests'` in
[playwright.config.ts](../../playwright.config.ts)). An API spec:

- Imports the client directly — no browser `page` fixture needed, so
  Playwright won't launch a browser for these tests.
- Declares any threshold/expected-value constants at the top of the file,
  named and explicit, not inlined into the assertion.
- Groups each spec's tests in a `test.describe()` with a meaningful name.
- Uses one `test()` per behavior, asserting on the client's domain type:

```typescript
import { test, expect } from '@playwright/test'
import { CoinMarketCapClient } from '../../src/clients/coinmarketcap'
import { readBtcPriceWindow } from '../../.agents/btc-price-window/btcPriceWindow'

const apiKey = process.env.CMC_API_KEY
const { min: BTC_PRICE_MIN, max: BTC_PRICE_MAX } = readBtcPriceWindow()

test.describe('CoinMarketCap BTC Price', () => {
  test('BTC price is within expected range', async () => {
    expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()

    const client = new CoinMarketCapClient({ apiKey: apiKey! })
    const btc = await client.fetchBtcPrice()

    expect(btc.price).toBeGreaterThan(BTC_PRICE_MIN)
    expect(btc.price).toBeLessThan(BTC_PRICE_MAX)
  })
})
```

Run just the API suite with `npm run test:api`.

## Parameterized Testing

When the same behavior must hold across several inputs (multiple symbols,
multiple error codes, multiple currencies), don't copy-paste a `test()`
block per value. Playwright has no built-in `test.each`, so parameterize
with a plain `for...of` loop over a named, typed table, calling `test()`
once per row:

```typescript
const SYMBOLS: readonly string[] = ['BTC', 'ETH', 'SOL']

for (const symbol of SYMBOLS) {
  test(`fetches a positive price for ${symbol}`, async () => {
    const client = new CoinMarketCapClient({ apiKey: apiKey! })
    const quote = await client.fetchPrice(symbol)

    expect(quote.price).toBeGreaterThan(0)
  })
}
```

For a table of related fixture + expectation, use an array of objects
instead of parallel arrays, and destructure it into the test name so a
failure identifies which row broke without opening the report:

```typescript
const CASES: readonly { symbol: string; expectedCurrency: string }[] = [
  { symbol: 'BTC', expectedCurrency: 'USD' },
  { symbol: 'ETH', expectedCurrency: 'USD' },
]

for (const { symbol, expectedCurrency } of CASES) {
  test(`${symbol} quote is denominated in ${expectedCurrency}`, async () => {
    const client = new CoinMarketCapClient({ apiKey: apiKey! })
    const quote = await client.fetchPrice(symbol)

    expect(quote.currency).toBe(expectedCurrency)
  })
}
```

The loop runs at file-load time, so each row becomes its own named test in
the Playwright report — not a single test that loops internally and hides
which case failed. Combine with `test-design`'s equivalence-class and
boundary-value guidance to choose the rows: one per partition, plus the
edge values, rather than every input you can think of.

Keep the table small and declared as a `const` near the top of the file,
same as any other threshold constant — if the table grows large enough to
need its own file, it likely belongs next to the client as fixture data
rather than inline in the spec.

## Self-Healing Value Windows

For assertions against a live, drifting value (e.g. a market price), don't
hardcode a static threshold — it goes stale and forces manual updates. Instead:

- Persist the expected `{ min, max }` range as JSON, read/written by a small
  helper module (see `.agents/btc-price-window/btcPriceWindow.ts`).
- Add a Playwright `globalSetup` agent under `.agents/<name>/` (wired via
  `globalSetup` in [playwright.config.ts](../../playwright.config.ts)) that
  fetches the live value before tests run and, if it falls outside the
  persisted window, recenters the window around it — keeping `max - min`
  constant — and rewrites the JSON.
- After rewriting, the agent commits just that JSON file (`git add` +
  `git commit`, no push) so the healed window is captured automatically. It
  uses the caller's own git identity locally; in CI (`process.env.CI`) it
  scopes a `github-actions[bot]` identity to that one commit via `git -c`
  instead of mutating global/local git config.
- The spec reads the window via the helper instead of hardcoding bounds, so
  it stays green as the underlying value drifts while still catching
  genuinely anomalous readings (outside the fixed-width window).

See `.agents/btc-price-window/self-heal-btc-price-window.ts` for the reference
implementation.
