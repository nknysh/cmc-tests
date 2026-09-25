import { defineConfig } from 'allure'

export default defineConfig({
  name: 'CMC Tests',
  output: './allure-report',
  historyPath: './allure-history.jsonl',
  appendHistory: true,
  plugins: {
    // Single self-contained HTML so index.html also works when opened via file://,
    // where the multi-file report's fetch() calls are blocked by CORS.
    awesome: { options: { singleFile: true } },
  },
})
