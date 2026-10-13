/**
 * Turns k6's end-of-test summary into Allure result files, one test per
 * threshold, so the perf run gets its own Allure report like the Playwright
 * suites. k6 has no Allure reporter and this runs inside k6's runtime, so it
 * builds the JSON by hand and uses no Node APIs.
 */

export interface MetricSummary {
  values: Record<string, number>
  /** Keyed by threshold expression, e.g. `p(95)<1500`. Only present on metrics with thresholds. */
  thresholds?: Record<string, { ok: boolean }>
}

export interface SummaryData {
  metrics: Record<string, MetricSummary | undefined>
  state?: { testRunDurationMs?: number }
}

export interface AllureResultsOptions {
  suite: string
  resultsDir: string
  /** The k6 Markdown summary, attached to every result. */
  summaryMarkdown: string
}

type Status = 'passed' | 'failed'

/**
 * A Rate metric's `rate` is a 0–1 ratio (reported with `passes`/`fails`), but a
 * Counter's `rate` is per second, so only the former is shown as a percentage.
 */
const formatValue = (stat: string, value: number, values: Record<string, number>): string => {
  if (stat === 'rate') return 'passes' in values ? `${(value * 100).toFixed(2)}%` : `${value.toFixed(4)}/s`
  if (stat === 'count' || stat === 'passes' || stat === 'fails') return String(value)
  return `${Math.round(value)} ms`
}

/** `http_req_duration{endpoint:simple-price}` → metric `http_req_duration`, endpoint `simple-price`. */
const parseMetricName = (name: string): { metric: string; endpoint?: string } => {
  const match = /^([^{]+)\{endpoint:([^}]+)\}$/.exec(name)
  return match ? { metric: match[1], endpoint: match[2] } : { metric: name }
}

/** The stat a threshold expression checks, e.g. `p(95)<1500` → `p(95)`, `rate==0` → `rate`. */
const thresholdStat = (expression: string): string => /^[a-z]+(\(\d+\))?/i.exec(expression)?.[0] ?? expression

/**
 * Allure severity, which the quality gate in allurerc.mjs tiers failures by. A p99
 * breach is the noisiest signal, so it is tolerated; every other threshold is critical.
 * Plain strings, since k6 can't resolve allure-js-commons' Severity enum.
 */
const thresholdSeverity = (stat: string): 'critical' | 'normal' => (stat === 'p(99)' ? 'normal' : 'critical')

export function toAllureResults(data: SummaryData, options: AllureResultsOptions): Record<string, string> {
  const stop = Date.now()
  const start = stop - (data.state?.testRunDurationMs ?? 0)
  const runId = `${options.suite}-${start}`
  const attachmentFile = `${runId}-attachment.md`
  const attachments = [{ name: 'k6 summary', source: attachmentFile, type: 'text/markdown' }]

  const files: Record<string, string> = {
    [`${options.resultsDir}/${attachmentFile}`]: options.summaryMarkdown,
  }

  let index = 0
  for (const [metricName, summary] of Object.entries(data.metrics)) {
    for (const [expression, { ok }] of Object.entries(summary?.thresholds ?? {})) {
      const { metric, endpoint } = parseMetricName(metricName)
      const stat = thresholdStat(expression)
      // Keyed on the stat, not the limit, so tightening a threshold keeps its history.
      const id = `${endpoint ?? 'overall'}: ${metric} ${stat}`
      const name = `${endpoint ?? 'overall'}: ${metric} ${expression}`
      const values = summary?.values ?? {}
      const observed = values[stat]
      const status: Status = ok ? 'passed' : 'failed'
      const uuid = `${runId}-${index++}`

      const result = {
        uuid,
        historyId: id,
        testCaseId: id,
        name,
        fullName: `${options.suite}: ${id}`,
        status,
        statusDetails: {
          message: observed === undefined ? `${stat} not reported` : `${stat} = ${formatValue(stat, observed, values)}`,
        },
        stage: 'finished',
        start,
        stop,
        labels: [
          { name: 'suite', value: options.suite },
          { name: 'feature', value: endpoint ?? 'overall' },
          { name: 'framework', value: 'k6' },
          { name: 'severity', value: thresholdSeverity(stat) },
        ],
        steps: Object.entries(values).map(([key, value]) => ({
          name: `${key} = ${formatValue(key, value, values)}`,
          status: 'passed',
          stage: 'finished',
          start,
          stop,
        })),
        attachments,
      }
      files[`${options.resultsDir}/${uuid}-result.json`] = JSON.stringify(result)
    }
  }
  return files
}
