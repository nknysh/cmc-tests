import process from 'node:process'
import { defineConfig } from 'allure'

// One report and one history file per suite (btc-price, api, navigation), matching
// the per-suite results dir set in playwright.config.ts.
const suite = process.env.ALLURE_SUITE || 'adhoc'

export default defineConfig({
  name: `CMC Tests — ${suite}`,
  output: `./allure-report/${suite}`,
  historyPath: `./allure-history/${suite}.jsonl`,
  appendHistory: true,
  plugins: {
    // Single self-contained HTML so index.html also works when opened via file://,
    // where the multi-file report's fetch() calls are blocked by CORS.
    awesome: { options: { singleFile: true } },
  },
})
