import http from 'k6/http'
import { check, fail } from 'k6'
import { Counter } from 'k6/metrics'
import type { Options, Scenario } from 'k6/options'
import { API_KEY_HEADER, CMC_BASE_URL } from '../contract/helpers/constants.ts'

/**
 * Low-rate latency baseline for the CMC endpoints the Basic plan allows
 * (gainers-losers is plan-gated, so it's left out). The Basic key is capped at
 * 30 req/min, so this measures latency and error rate, not load: 20 req/min in
 * total for 3 minutes, i.e. 60 credits per run.
 */

const SIMPLE_PRICE_PATH = '/v2/simple/price'
const QUOTES_LATEST_PATH = '/v2/cryptocurrency/quotes/latest'
const SYMBOL = 'BTC'

const REQUESTS_PER_MINUTE_PER_ENDPOINT = 10
const DURATION = '3m'

// Generous on purpose: GitHub-hosted runners are shared and noisy. Tighten
// once there's a baseline to compare against.
const MAX_P95_MS = 1500
const MAX_P99_MS = 3000
const MAX_FAILED_RATE = 0.01
const MIN_CHECKS_RATE = 0.99

const ENDPOINTS = ['simple-price', 'quotes-latest'] as const
// k6 doesn't create directories; test:perf and the workflow mkdir this first.
const SUMMARY_DIR = 'perf-results'

/** HTTP 429s; one aborts the run so a rate-limited key doesn't keep burning credits. */
const rateLimited = new Counter('rate_limited')

const scenario = (exec: string): Scenario => ({
  executor: 'constant-arrival-rate',
  exec,
  rate: REQUESTS_PER_MINUTE_PER_ENDPOINT,
  timeUnit: '1m',
  duration: DURATION,
  preAllocatedVUs: 2,
  maxVUs: 4,
})

export const options: Options = {
  scenarios: {
    simplePrice: scenario('simplePrice'),
    quotesLatest: scenario('quotesLatest'),
  },
  summaryTrendStats: ['min', 'med', 'avg', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    http_req_failed: [`rate<${MAX_FAILED_RATE}`],
    checks: [`rate>${MIN_CHECKS_RATE}`],
    rate_limited: [{ threshold: 'count<1', abortOnFail: true }],
    ...Object.fromEntries(
      ENDPOINTS.map((endpoint) => [
        `http_req_duration{endpoint:${endpoint}}`,
        [`p(95)<${MAX_P95_MS}`, `p(99)<${MAX_P99_MS}`],
      ]),
    ),
  },
}

// Read from __ENV rather than returned from setup(): k6 copies setup()'s return
// value into handleSummary's data, which is written to the uploaded summary.json.
const API_KEY = __ENV.CMC_API_KEY ?? ''

export function setup(): void {
  if (!API_KEY) fail('CMC_API_KEY must be set')
}

interface CmcBody {
  status?: { error_code?: number | string }
  data?: unknown
}

function get(path: string, query: string, endpoint: string): CmcBody | undefined {
  const res = http.get(`${CMC_BASE_URL}${path}?${query}`, {
    headers: { [API_KEY_HEADER]: API_KEY, Accept: 'application/json' },
    tags: { endpoint },
  })
  if (res.status === 429) rateLimited.add(1)

  let body: CmcBody | undefined
  try {
    body = res.json() as CmcBody
  } catch {
    body = undefined
  }
  check(res, {
    [`${endpoint}: status 200`]: (r) => r.status === 200,
    // simple/price sends error_code as a numeric string, quotes/latest as a number.
    [`${endpoint}: error_code 0`]: () => body?.status?.error_code === 0 || body?.status?.error_code === '0',
  })
  return body
}

export function simplePrice(): void {
  const body = get(SIMPLE_PRICE_PATH, `symbol=${SYMBOL}&convert=USD`, 'simple-price')
  const data = body?.data as { quotes?: { price?: number }[] }[] | undefined
  check(data, { 'simple-price: has BTC price': (d) => (d?.[0]?.quotes?.[0]?.price ?? 0) > 0 })
}

export function quotesLatest(): void {
  const body = get(QUOTES_LATEST_PATH, `symbol=${SYMBOL}`, 'quotes-latest')
  const data = body?.data as Record<string, { quote?: { USD?: { price?: number } } }[]> | undefined
  check(data, { 'quotes-latest: has BTC price': (d) => (d?.[SYMBOL]?.[0]?.quote?.USD?.price ?? 0) > 0 })
}

interface MetricSummary {
  values: Record<string, number>
}

const ms = (value: number | undefined): string => (value === undefined ? 'n/a' : `${Math.round(value)} ms`)

/** Markdown table for stdout and the GitHub job summary, plus the raw JSON. */
export function handleSummary(data: { metrics: Record<string, MetricSummary | undefined> }): Record<string, string> {
  const rows = ENDPOINTS.map((endpoint) => {
    const duration = data.metrics[`http_req_duration{endpoint:${endpoint}}`]?.values ?? {}
    return `| ${endpoint} | ${ms(duration.med)} | ${ms(duration['p(95)'])} | ${ms(duration['p(99)'])} | ${ms(duration.max)} |`
  })
  const failedRate = data.metrics.http_req_failed?.values.rate ?? 0
  const requests = data.metrics.http_reqs?.values.count ?? 0
  const markdown = [
    '## CMC API latency baseline',
    '',
    `Requests: ${requests}, failed: ${(failedRate * 100).toFixed(2)}% (thresholds: p95 < ${MAX_P95_MS} ms, p99 < ${MAX_P99_MS} ms)`,
    '',
    '| Endpoint | Median | p95 | p99 | Max |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')

  return {
    stdout: markdown,
    [`${SUMMARY_DIR}/summary.md`]: markdown,
    [`${SUMMARY_DIR}/summary.json`]: JSON.stringify(data, null, 2),
  }
}
