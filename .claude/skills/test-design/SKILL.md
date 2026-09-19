---
name: test-design
description: >
  Best practices for designing test suites and individual tests — what to
  cover, how to structure assertions, and how to keep tests reliable and
  maintainable. Use when planning what tests to write, reviewing test
  coverage, or deciding how to structure a new spec (API or E2E) before
  writing it.
metadata:
  origin: cmc-tests
---

# Test Design Practices

Guidance for deciding *what* to test and *how* to structure it, independent
of the mechanics of a specific client or page object. Pair this with the
`api-testing` and `e2e-testing` skills, which cover implementation patterns
for this repo.

## One Behavior Per Test

Each `test()` should verify a single observable behavior and fail for
exactly one reason. Prefer several small, named tests over one test with
many unrelated assertions — a failure should tell you what broke without
needing to read the assertion that failed.

```typescript
// Good — each test fails for one reason
test('BTC price is within expected range', async () => { ... })
test('BTC price response includes a currency', async () => { ... })

// Avoid — a failure here doesn't say which behavior broke
test('BTC price works', async () => {
  expect(btc.price).toBeGreaterThan(MIN)
  expect(btc.currency).toBe('USD')
  expect(btc.lastUpdated).toBeTruthy()
})
```

## Test the Contract, Not the Implementation

Assert on the domain type a client or page object returns, not on
incidental details of how it got there (internal field names, request
order, raw response shape). Tests that assert on implementation details
break every time the implementation is refactored, even when behavior is
unchanged.

## Independent and Order-Agnostic

Tests must not depend on execution order or on state left behind by another
test. Each test should set up what it needs and clean up after itself (or
rely only on fixtures that guarantee isolation). This matters especially
here since `fullyParallel: true` means tests run concurrently and in
unpredictable order.

## Explicit Thresholds, Not Magic Numbers

Expected values and thresholds belong in named constants at the top of the
file (or in a shared fixture), never inlined into an assertion. A reviewer
should be able to see what's being checked and why without cross-referencing
the assertion against external knowledge.

```typescript
const BTC_PRICE_MIN = 80_242
const BTC_PRICE_MAX = 82_242

expect(btc.price).toBeGreaterThan(BTC_PRICE_MIN)
expect(btc.price).toBeLessThan(BTC_PRICE_MAX)
```

When a threshold is expected to drift over time (e.g. a live market price),
prefer a self-adjusting bound over a value that silently goes stale — see
the BTC price window in `.agents/btc-price-window/` for the pattern used in
this repo.

## Fail Clearly, Not Deep

Validate preconditions (required env vars, fixtures, auth) at the top of
the test with a descriptive assertion message, so a missing precondition
fails immediately and obviously instead of producing a confusing error deep
inside a client call or page interaction.

```typescript
expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()
```

## Design for Diagnosability

A failing test should tell you what happened without requiring a
re-run in debug mode:
- Log requests/responses (redacting secrets) so failures include what was
  actually sent and received.
- Prefer assertions that produce a useful diff (`toEqual`, `toBe`) over
  boolean checks (`toBeTruthy()`) when comparing structured values.
- For E2E, rely on Playwright's built-in trace/screenshot/video-on-failure
  rather than ad-hoc `console.log` debugging.

## Cover the Right Levels

- **API tests** (`tests/api/`) — fast, no browser, verify a client's
  contract against a real (or realistic) backend. Best for data
  correctness, error handling, and edge cases in request/response shape.
- **E2E tests** (`tests/e2e/`) — slower, verify what a user actually
  experiences through the UI. Reserve these for flows that meaningfully
  exercise the browser (navigation, rendering, interaction) rather than
  re-testing logic already covered by an API test.

Don't duplicate the same assertion at both levels — if an API test already
proves the data is correct, an E2E test covering the same flow should focus
on whether the UI renders and reacts to it correctly, not re-verify the
underlying value.

## Deterministic Over Flaky

A test that passes or fails based on timing, network jitter, or unrelated
external state is worse than no test — it erodes trust in the suite.
- Avoid fixed `sleep`/`wait` calls; wait for the specific condition
  (element state, response) instead.
- When testing against a live third-party API, tolerate expected variance
  (e.g. a price range) rather than asserting an exact value that will
  never match twice.
- Isolate flaky external dependencies behind a client so retries, timeouts,
  and error handling live in one place instead of being duplicated per test.

## Name Tests as Specifications

A test name should read as a specification of behavior, not a description
of steps. `"BTC price is above threshold"` tells you what's guaranteed;
`"test fetchBtcPrice"` doesn't. Favor the former — it's what shows up in
CI failure output and the HTML report.
