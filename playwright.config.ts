import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

// Each suite (btc-price, api, navigation) writes to its own Allure results dir so
// one suite's report never shows another's results. Unset → an 'adhoc' bucket.
const allureSuite = process.env.ALLURE_SUITE || 'adhoc'

export default defineConfig({
  globalSetup: './.agents/btc-price-window/self-heal-btc-price-window.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['allure-playwright', {
      resultsDir: `allure-results/${allureSuite}`,
      detail: true,
      environmentInfo: {
        ALLURE_SUITE: allureSuite,
        BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
        CI: String(!!process.env.CI),
      },
    }],
    // The navigation heal script reads a JSON report; it sets this env var.
    ...(process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ? [['json'] as const] : []),
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'api', testDir: './tests/api', testIgnore: '**/btc-price.spec.ts' },
    { name: 'contract', testDir: './tests/contract' },
    { name: 'btc-price', testDir: './tests/api', testMatch: '**/btc-price.spec.ts' },
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } },
  ],
})
