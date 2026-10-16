import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

// Each suite (btc-price, api, navigation) writes to its own Allure results dir so
// one suite's report never shows another's results. Unset → an 'adhoc' bucket.
const allureSuite = process.env.ALLURE_SUITE || 'adhoc'

const liveCmcProject = { workers: 1, timeout: 90_000 }

// CoinBoard UI tests (tests/coinboard) target the app in app/. Any run that includes
// the coinboard project starts the app's Vite dev server; set COINBOARD_URL to test
// an app that's already running or deployed instead. Runs limited to other projects
// (every CI job and heal script passes --project) don't start it, since they don't
// install the app's dependencies.
const COINBOARD_DEV_URL = 'http://localhost:5173/cmc-tests/app/'
const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`)
// The slash keeps the specs' relative `#/compare` addresses on the app root.
const coinboardUrl = withTrailingSlash(process.env.COINBOARD_URL || COINBOARD_DEV_URL)

/** The run's --project filters (`--project=x` or `--project x`); none means every project. */
function selectedProjects(argv: readonly string[]): string[] {
  const PREFIX = '--project='
  return argv.flatMap((arg, i) => {
    if (arg.startsWith(PREFIX)) return [arg.slice(PREFIX.length)]
    if (arg === '--project' && i + 1 < argv.length) return [argv[i + 1]]
    return []
  })
}
const projectFilters = selectedProjects(process.argv)
// Playwright matches filters case-insensitively, and a filter can be a glob
// (`--project="*"`), so any wildcard counts as including coinboard.
const runsCoinboard =
  projectFilters.length === 0 || projectFilters.some((name) => name.toLowerCase() === 'coinboard' || name.includes('*'))
const startCoinboard = runsCoinboard && !process.env.COINBOARD_URL

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
    // Live CMC projects run on one worker so all their calls share one rate
    // limiter (tests/helpers/cmc.ts). The longer timeout covers a wait for
    // CMC's per-minute reset after a 429.
    { name: 'api', testDir: './tests/api', testIgnore: '**/btc-price.spec.ts', ...liveCmcProject },
    { name: 'contract', testDir: './tests/contract', ...liveCmcProject },
    { name: 'btc-price', testDir: './tests/api', testMatch: '**/btc-price.spec.ts', ...liveCmcProject },
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } },
    { name: 'coinboard', testDir: './tests/coinboard', use: { ...devices['Desktop Chrome'], baseURL: coinboardUrl } },
  ],
  ...(startCoinboard && {
    webServer: {
      command: 'npm run dev --prefix app -- --port 5173 --strictPort',
      url: COINBOARD_DEV_URL,
      reuseExistingServer: !process.env.CI,
    },
  }),
})
