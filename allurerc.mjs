import process from 'node:process'
import { defineConfig } from 'allure'

// One report and one history file per suite (btc-price, contract, api, navigation), matching
// the per-suite results dir set in playwright.config.ts.
const suite = process.env.ALLURE_SUITE || 'adhoc'

// Quality gate per suite. `allure run` (every CI test step) evaluates it into the report and
// exits non-zero on a violation; `npm run allure:gate` checks local results. minTestsCount
// guards against specs silently dropping out of a suite, so bump it when adding tests.
// Allure excludes retries itself.
const qualityGateRules = {
  'btc-price': { maxFailures: 0, minTestsCount: 1 },
  api: { maxFailures: 0, minTestsCount: 21 },
  contract: { maxFailures: 0, minTestsCount: 25 },
  navigation: { maxFailures: 0, minTestsCount: 11 },
}
const rules = qualityGateRules[suite]

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
  ...(rules && { qualityGate: { rules: [rules] } }),
})
