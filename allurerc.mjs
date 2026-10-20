import process from 'node:process'
import { defineConfig } from 'allure'

// One report and one history file per suite (btc-price, contract, api, coinboard, coinboard-smoke, perf), matching
// the per-suite results dir set in playwright.config.ts (and, for perf, in tests/perf/cmc-latency.k6.ts).
const suite = process.env.ALLURE_SUITE || 'adhoc'

// Quality gate per suite. `allure run` (every CI test step) evaluates it into the report and
// exits non-zero on a violation; `npm run allure:gate` checks local results. minTestsCount
// guards against specs silently dropping out of a suite, so bump it when adding tests.
// Allure excludes retries itself.
const minTestsCount = {
  'btc-price': 1,
  api: 43,
  contract: 36,
  // CoinBoard UI tests (tests/coinboard), one per test case in app/user-stories.
  coinboard: 100,
  // Blocker + critical CoinBoard UI tests, run on app changes by coinboard-smoke-tests.yml.
  'coinboard-smoke': 22,
  // One result per k6 threshold.
  perf: 7,
}

// Failures are tiered by the tests' Allure severity label (see tests/helpers/severity.ts):
// any blocker/critical failure fails the gate, while up to MAX_NON_SEVERE_FAILURES failures at
// normal/minor/trivial are tolerated. A test without a severity label counts as normal, as in Allure.
const SEVERE_LEVELS = new Set(['blocker', 'critical'])
const MAX_NON_SEVERE_FAILURES = 2
const isSevere = (tr) => tr.labels.some(({ name, value }) => name === 'severity' && SEVERE_LEVELS.has(value))

const testsCount = minTestsCount[suite]
const rules = testsCount && [
  // Distinct ids, because Allure keys each rule's state by id.
  { id: 'severe', maxFailures: 0, filter: isSevere },
  { id: 'non-severe', maxFailures: MAX_NON_SEVERE_FAILURES, filter: (tr) => !isSevere(tr) },
  { id: 'all', minTestsCount: testsCount },
]

export default defineConfig({
  name: `CMC Tests — ${suite}`,
  // Read by `allure run` and `allure quality-gate`, so neither picks up another suite's results.
  resultsDir: `./allure-results/${suite}`,
  output: `./allure-report/${suite}`,
  historyPath: `./allure-history/${suite}.jsonl`,
  appendHistory: true,
  plugins: {
    // Single self-contained HTML so index.html also works when opened via file://,
    // where the multi-file report's fetch() calls are blocked by CORS.
    awesome: { options: { singleFile: true } },
  },
  ...(rules && { qualityGate: { rules } }),
})
