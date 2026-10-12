import 'dotenv/config'
import { execFileSync, execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { chromium } from '@playwright/test'
import type {
  JSONReport,
  JSONReportSpec,
  JSONReportSuite,
  JSONReportTestResult,
} from '@playwright/test/reporter'
import { promptLocalModel } from '../shared/localModel.mts'
import { auditChange, reportAuditBlock } from '../self-heal-commit-auditor/auditChange.mts'

// Assumes invocation from the repo root (true for both the CI workflow and
// local `node .agents/coinmarketcap-navigation/self-heal-navigation-locators.mts`).
const REPO_ROOT = process.cwd()
const PAGE_OBJECT_GIT_PATH = 'tests/e2e/pages/CoinMarketCapHomePage.ts'
const PAGE_OBJECT_PATH = path.join(REPO_ROOT, PAGE_OBJECT_GIT_PATH)
const JSON_REPORT_PATH = path.join(REPO_ROOT, '.agents/coinmarketcap-navigation/last-run.json')
// This suite's own Allure bucket (see playwright.config.ts / allurerc.mjs), so
// its report never mixes with the BTC price or simple price suites.
const ALLURE_SUITE = 'navigation'
const ALLURE_RESULTS_DIR = path.join(REPO_ROOT, 'allure-results', ALLURE_SUITE)
// Verifying a navigation-target fix runs a spec that isn't on this branch, so
// its results go to a throwaway bucket rather than this suite's report.
const VERIFY_ALLURE_SUITE = 'navigation-verify'
const PLAYWRIGHT_BIN = path.join(REPO_ROOT, 'node_modules/.bin/playwright')
const CI_GIT_IDENTITY = ['-c', 'user.name=nknysh', '-c', 'user.email=nknysh@gmail.com']

interface TestFailure {
  title: string
  // Spec file path relative to the repo root, as the JSON report gives it.
  file: string
  error: string
}

interface TestRun {
  passed: boolean
  failures: TestFailure[]
  passedTitles: Set<string>
}

function toFailure(spec: JSONReportSpec, result: JSONReportTestResult): TestFailure {
  // All errors, not just the first: on a test timeout the first is a bare
  // "Test timeout of Nms exceeded." and the call log that says what was being
  // waited for is only in the later ones.
  const messages = (result.errors ?? []).map(e => e.message).filter(Boolean)
  return {
    title: spec.title,
    file: spec.file,
    error: stripVTControlCharacters(messages.join('\n\n') || result.error?.message || 'unknown error'),
  }
}

function runE2ETests(options: { args?: string[]; env?: NodeJS.ProcessEnv } = {}): TestRun {
  // Remove any previous report so a run that crashes before writing one (bad
  // config, import error) fails loudly below instead of reading a stale file.
  fs.rmSync(JSON_REPORT_PATH, { force: true })

  try {
    // No --reporter override: the config adds the json reporter when
    // PLAYWRIGHT_JSON_OUTPUT_NAME is set, keeping its allure-playwright options.
    // PLAYWRIGHT_HTML_OPEN=never stops a local failing run from blocking on the
    // html reporter's report server.
    execFileSync(PLAYWRIGHT_BIN, ['test', '--project=e2e', ...(options.args ?? [])], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: {
        ...process.env,
        ALLURE_SUITE,
        PLAYWRIGHT_JSON_OUTPUT_NAME: JSON_REPORT_PATH,
        PLAYWRIGHT_HTML_OPEN: 'never',
        ...options.env,
      },
    })
  } catch {
    // Playwright exits non-zero on any test failure; the JSON report is still written.
  }

  const report: JSONReport = JSON.parse(fs.readFileSync(JSON_REPORT_PATH, 'utf-8'))
  const failures: TestFailure[] = []
  const passedTitles = new Set<string>()

  const walk = (suite: JSONReportSuite): void => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          if (result.status === 'passed') passedTitles.add(spec.title)
          else if (result.status !== 'skipped') failures.push(toFailure(spec, result))
        }
      }
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  for (const suite of report.suites ?? []) walk(suite)

  // Printed unconditionally (not just the count) - without this, a CI failure
  // is undebuggable after the fact: the workflow doesn't upload the JSON report,
  // so the console log is the only record of which test broke and why.
  for (const failure of failures) {
    console.log(`[coinmarketcap-navigation]   ✗ ${failure.title}\n${failure.error.slice(0, 1000)}`)
  }

  return { passed: failures.length === 0, failures, passedTitles }
}

function appendStepSummary(markdown: string): void {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n\n`)
}

// A tab that still resolves and clicks fine but now lands somewhere else: the
// site moved the tab's destination. No locator patch can fix that - only the
// spec's expectedPath can - so it's reported and proposed as a PR for a human
// to review, never committed directly.
interface NavigationDrift {
  title: string
  file: string
  expectedPath: string
  actualUrl: string
  actualPath: string
}

function findNavigationDrift(failure: TestFailure): NavigationDrift | undefined {
  // The spec waits with page.waitForURL(`**${expectedPath}*`); its call log
  // names that glob and every URL the page actually navigated to.
  const expected = /waiting for navigation to "\*\*(\/[^"*]*)\*"/.exec(failure.error)
  const actualUrl = [...failure.error.matchAll(/navigated to "([^"]+)"/g)].at(-1)?.[1]
  if (!expected || !actualUrl) return undefined

  const actualPath = new URL(actualUrl).pathname
  // Landed on the expected path but the wait still timed out (e.g. the load
  // event never fired) - not a destination change.
  if (actualPath === expected[1]) return undefined

  return { title: failure.title, file: failure.file, expectedPath: expected[1], actualUrl, actualPath }
}

function reportNavigationDrift(drifts: NavigationDrift[]): void {
  for (const drift of drifts) {
    console.error(
      `[coinmarketcap-navigation] navigation target changed for "${drift.title}": ` +
        `expected ${drift.expectedPath}, actual ${drift.actualUrl}`
    )
  }
  appendStepSummary(
    [
      '### ⚠️ Navigation target changed',
      '',
      driftTable(drifts),
    ].join('\n')
  )
}

function driftTable(drifts: NavigationDrift[]): string {
  return [
    '| Test | Expected path | Actual URL | Proposed `expectedPath` |',
    '| --- | --- | --- | --- |',
    ...drifts.map(
      d => `| ${textCell(d.title)} | ${codeCell(d.expectedPath)} | ${codeCell(d.actualUrl)} | ${codeCell(d.actualPath)} |`
    ),
  ].join('\n')
}

// Cell values come from test titles and the live site's URLs, so they can hold
// characters that end a table cell or start Markdown formatting. A newline
// would end the row; GFM unescapes `\|` even inside a code span.
function tableSafe(value: string): string {
  return value.replaceAll(/\r?\n/g, ' ').replaceAll('|', String.raw`\|`)
}

function textCell(value: string): string {
  return tableSafe(value.replaceAll(/[\\`*_[\]<>]/g, String.raw`\$&`))
}

// Backslashes don't escape inside a code span, so instead the fence is one
// backtick longer than the longest backtick run in the value.
function codeCell(value: string): string {
  const longestRun = Math.max(0, ...(value.match(/`+/g) ?? []).map(run => run.length))
  const fence = '`'.repeat(longestRun + 1)
  const padding = value.startsWith('`') || value.endsWith('`') ? ' ' : ''
  return `${fence}${padding}${tableSafe(value)}${padding}${fence}`
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
}

function gh(...args: string[]): string {
  return execFileSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
}

// Rewrites each drifted test's expectedPath in its spec, verifies the drifted
// tests then pass against the live site, and (in CI only) opens a PR with the
// change. The working tree is always restored afterwards, so the rest of the
// run - and any locator heal committed to this branch - never sees it.
function proposeNavigationFix(drifts: NavigationDrift[]): void {
  const originals = new Map<string, string>()
  const fixable: NavigationDrift[] = []

  try {
    for (const drift of drifts) {
      const filePath = path.join(REPO_ROOT, drift.file)
      const source = fs.readFileSync(filePath, 'utf-8')
      if (!originals.has(drift.file)) originals.set(drift.file, source)

      const needle = `expectedPath: '${drift.expectedPath}'`
      if (source.split(needle).length !== 2) {
        console.error(
          `[coinmarketcap-navigation] can't find a unique ${needle} in ${drift.file}; not proposing a fix for "${drift.title}"`
        )
        continue
      }
      fs.writeFileSync(filePath, source.replace(needle, `expectedPath: '${drift.actualPath}'`))
      fixable.push(drift)
    }
    if (fixable.length === 0) return

    console.log('[coinmarketcap-navigation] verifying the proposed expectedPath change')
    const verify = runE2ETests({
      args: ['--grep', fixable.map(d => escapeRegExp(d.title)).join('|')],
      env: { ALLURE_SUITE: VERIFY_ALLURE_SUITE, SKIP_BTC_PRICE_HEAL: '1' },
    })
    // passedTitles guards against a grep that matched nothing passing vacuously.
    if (!verify.passed || !fixable.every(d => verify.passedTitles.has(d.title))) {
      console.error('[coinmarketcap-navigation] proposed expectedPath change still fails; not opening a PR')
      appendStepSummary('The proposed `expectedPath` change still failed against the live site, so no PR was opened.')
      return
    }

    if (!process.env.CI) {
      console.log('[coinmarketcap-navigation] verified; not in CI, so not opening a PR. Proposed change:')
      console.log(git('diff', '--', ...originals.keys()))
      return
    }

    openNavigationFixPr(fixable, [...originals.keys()])
  } finally {
    for (const [file, source] of originals) fs.writeFileSync(path.join(REPO_ROOT, file), source)
  }
}

function openNavigationFixPr(drifts: NavigationDrift[], files: string[]): void {
  const baseBranch = git('rev-parse', '--abbrev-ref', 'HEAD')
  // Keyed on the exact change, so a daily re-run finds its own open PR instead
  // of opening a duplicate, while a further destination change gets a new one.
  const changeKey = drifts.map(d => `${d.title}|${d.expectedPath}|${d.actualPath}`).join('\n')
  const branch = `self-heal/navigation-target-${createHash('sha256').update(changeKey).digest('hex').slice(0, 10)}`

  const existing = gh('pr', 'list', '--head', branch, '--state', 'open', '--json', 'url', '--jq', '.[0].url // ""')
  if (existing) {
    console.log(`[coinmarketcap-navigation] fix PR already open: ${existing}`)
    appendStepSummary(`Fix PR already open: ${existing}`)
    return
  }

  const title = `Update navigation test for changed tab destination${drifts.length > 1 ? 's' : ''}`
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : undefined
  const body = [
    'CoinMarketCap changed where these homepage tabs navigate, so their tests time out waiting for the old URL.',
    'The tab locators still match, so the locator self-heal can\'t fix this.',
    '',
    driftTable(drifts),
    '',
    'The spec only checks the pathname, so the new URL\'s query string isn\'t asserted.',
    'Check that the new destination is intended before merging.',
    '',
    'The updated tests passed against the live site before this PR was opened.',
    ...(runUrl ? ['', `Opened by [the navigation self-heal run](${runUrl}).`] : []),
  ].join('\n')

  try {
    git('switch', '-C', branch)
    git('add', '--', ...files)
    git(...CI_GIT_IDENTITY, 'commit', '--no-verify', '-m', title, '--', ...files)
    git('push', '--force', 'origin', branch)
    const prUrl = gh('pr', 'create', '--base', baseBranch, '--head', branch, '--title', title, '--body', body)
    console.log(`[coinmarketcap-navigation] opened fix PR: ${prUrl}`)
    appendStepSummary(`Opened fix PR: ${prUrl}`)
  } catch (error) {
    console.error('[coinmarketcap-navigation] failed to open fix PR', error)
    appendStepSummary('Opening the fix PR failed; see the job log.')
  } finally {
    git('switch', baseBranch)
  }
}

// Distinguishes a stale-selector failure (worth self-healing) from a genuine
// assertion/business-logic failure (not something an LLM should paper over).
function isLocatorFailure(failure: TestFailure): boolean {
  // Playwright prints "waiting for locator(...)" as call-log boilerplate on
  // *every* locator-based assertion timeout, including a toHaveCount() that
  // resolved fine but got a different (nonzero) count than expected - e.g.
  // the live site added a nav tab. That's page content drift, not a broken
  // selector, and rewriting the selector can't fix it - only editing the
  // test's expectation can, which is a human call.
  const countMismatch = failure.error.match(/toHaveCount[\s\S]{0,200}?Received:\s*"?(\d+)"?/)
  if (countMismatch && Number(countMismatch[1]) > 0) return false

  return /waiting for locator|strict mode violation|resolved to \d+ elements|element is not attached/i.test(
    failure.error
  )
}

// A plain ARIA snapshot (roles/names only) never carries the raw HTML
// attributes (data-test, data-index, ...) that this site's selectors key
// off, so it can't tell the model what a renamed attribute's new value is.
// Serialize actual tag + attributes + text instead, dropping only class/style
// (hashed per-deploy, pure noise for selector repair).
function serializeElement(root: Element): string {
  const KEEP_ATTRS = /^(data-|aria-|role$|id$|href$)/
  const serialize = (el: Element, depth: number): string => {
    if (depth > 8) return ''
    const tag = el.tagName.toLowerCase()
    const attrs = Array.from(el.attributes)
      .filter(a => KEEP_ATTRS.test(a.name))
      .map(a => `${a.name}="${a.value}"`)
      .join(' ')
    const openTag = attrs ? `<${tag} ${attrs}>` : `<${tag}>`
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent?.trim())
      .filter(Boolean)
      .join(' ')
    const children = Array.from(el.children)
      .map(c => serialize(c, depth + 1))
      .join('')
    return `${openTag}${directText}${children}</${tag}>`
  }
  return serialize(root, 0)
}

async function captureLiveContext(): Promise<string> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(process.env.BASE_URL || 'https://coinmarketcap.com')

    const navHeader = page.locator('[data-test="homepage-table-header"]')
    if ((await navHeader.count()) > 0) {
      return (await navHeader.first().evaluate(serializeElement)).slice(0, 20000)
    }

    // The container itself may be what broke; fall back to a wider capture.
    const header = page.locator('header').first()
    if ((await header.count()) > 0) {
      return (await header.evaluate(serializeElement)).slice(0, 20000)
    }

    return (await page.locator('body').evaluate(serializeElement)).slice(0, 20000)
  } finally {
    await browser.close()
  }
}

// Local models are less reliable than Claude about honoring "no markdown fences" -
// strip a leading/trailing ```-fence if the model wrapped its answer in one anyway.
function stripCodeFence(text: string): string {
  const fenced = text.trim().match(/^```(?:\w+)?\n([\s\S]*?)\n```$/)
  return fenced ? fenced[1].trim() : text.trim()
}

async function proposeFix(params: {
  pageObjectSource: string
  errorSummary: string
  liveSnapshot: string
}): Promise<string> {
  const response = await promptLocalModel({
    systemPrompt: [
      'You repair a broken Playwright Page Object for the live CoinMarketCap website',
      '(coinmarketcap.com) after its DOM changed and a locator no longer matches.',
      'You are given the current TypeScript source of the page object, the Playwright',
      'error(s) from the failing test(s), and a fresh ARIA snapshot of the live page in',
      'the area the locators target.',
      'Reply with ONLY the complete corrected TypeScript file contents, no markdown',
      'fences and no commentary before or after. Change only what is broken (selectors',
      'that no longer resolve); preserve everything else exactly, including the existing',
      'code style (no semicolons, single quotes, 2-space indent).',
    ].join(' '),
    userPrompt: [
      '## Failing test error(s)',
      '```',
      params.errorSummary,
      '```',
      '',
      '## Live page ARIA snapshot (area the locators target)',
      '```yaml',
      params.liveSnapshot,
      '```',
      '',
      '## Current page object source',
      '```typescript',
      params.pageObjectSource,
      '```',
    ].join('\n'),
  })

  return stripCodeFence(response)
}

function commitHealedLocator(): void {
  // In CI there's no configured git identity; scope one to this commit only
  // so we never touch a developer's global/local git config, while still
  // attributing the commit to the repo owner rather than a bot account.
  const identity = process.env.CI ? `${CI_GIT_IDENTITY.join(' ')} ` : ''

  try {
    execSync(`git add ${PAGE_OBJECT_GIT_PATH}`, { stdio: 'inherit', cwd: REPO_ROOT })
    // Pathspec after `--` so only the page object is committed, not anything else already staged.
    execSync(
      `git ${identity}commit --no-verify -m "Self-heal CoinMarketCap navigation locator" -- ${PAGE_OBJECT_GIT_PATH}`,
      { stdio: 'inherit', cwd: REPO_ROOT }
    )
  } catch (error) {
    console.warn('[coinmarketcap-navigation] failed to commit healed locator', error)
  }
}

async function main(): Promise<void> {
  // Cleared once per script run, not per runE2ETests() call, so the report
  // records both the initial run and the post-heal re-run.
  fs.rmSync(ALLURE_RESULTS_DIR, { recursive: true, force: true })

  console.log('[coinmarketcap-navigation] running e2e navigation tests')
  const initial = runE2ETests()

  if (initial.passed) {
    console.log('[coinmarketcap-navigation] all tests passed, nothing to heal')
    return
  }

  // Deduped by title: CI retries report the same drift once per attempt.
  const drifts = [
    ...new Map(
      initial.failures.map(findNavigationDrift).filter(d => d !== undefined).map(d => [d.title, d])
    ).values(),
  ]
  const driftTitles = new Set(drifts.map(d => d.title))
  if (drifts.length > 0) {
    // Still a failing run: main keeps failing until the fix PR is merged.
    process.exitCode = 1
    reportNavigationDrift(drifts)
    proposeNavigationFix(drifts)
  }

  const otherFailures = initial.failures.filter(f => !driftTitles.has(f.title))
  if (otherFailures.length === 0) return

  const locatorFailures = otherFailures.filter(isLocatorFailure)
  if (locatorFailures.length === 0) {
    console.error(
      '[coinmarketcap-navigation] tests failed for reasons other than a stale locator; leaving for a human'
    )
    process.exitCode = 1
    return
  }

  console.log(
    `[coinmarketcap-navigation] ${locatorFailures.length} locator failure(s) detected, attempting self-heal`
  )

  const originalSource = fs.readFileSync(PAGE_OBJECT_PATH, 'utf-8')
  const errorSummary = locatorFailures.map(f => `${f.title}\n${f.error}`).join('\n\n')
  const liveSnapshot = await captureLiveContext()

  const patchedSource = await proposeFix({ pageObjectSource: originalSource, errorSummary, liveSnapshot })

  if (patchedSource === originalSource) {
    console.error('[coinmarketcap-navigation] local model proposed no change; leaving failure for a human')
    process.exitCode = 1
    return
  }

  console.log('[coinmarketcap-navigation] proposed patch:')
  console.log(patchedSource)

  fs.writeFileSync(PAGE_OBJECT_PATH, patchedSource)

  console.log('[coinmarketcap-navigation] re-running tests to verify the patch')
  let verified = false
  try {
    // Drifted tests still fail here: their fix is on the PR branch, not this one.
    verified = runE2ETests().failures.every(f => driftTitles.has(f.title))
  } finally {
    // Also runs if verification throws, so a patched file is never left behind unverified.
    if (!verified) fs.writeFileSync(PAGE_OBJECT_PATH, originalSource)
  }

  if (!verified) {
    console.error('[coinmarketcap-navigation] patched locator still fails, reverted')
    process.exitCode = 1
    return
  }

  console.log('[coinmarketcap-navigation] self-heal verified, auditing patch before commit')
  const audit = await auditChange({
    systemPrompt: [
      'You audit an automated patch to a Playwright Page Object for a live website,',
      'proposed by another LLM to fix a failing locator. You are given the original',
      'source and the patched source. Flag CRITICAL if the diff changes anything beyond',
      'locator selectors - assertions, method signatures, exported members, or unrelated',
      'logic - or if a new selector looks suspiciously broad or fragile (a bare tag',
      'selector, or a selector keyed on visible text likely to change). Otherwise PASS.',
    ].join(' '),
    userPrompt: [
      '## Original source',
      '```typescript',
      originalSource,
      '```',
      '',
      '## Patched source',
      '```typescript',
      patchedSource,
      '```',
    ].join('\n'),
    // Holds two full copies of the page object plus the failing-test
    // errors - bigger than the 8192 default, which risks silently
    // truncating the prompt (and so the verdict) for a larger page object.
    contextSize: 16384,
  })

  if (audit.critical) {
    fs.writeFileSync(PAGE_OBJECT_PATH, originalSource)
    reportAuditBlock('CoinMarketCap navigation locator patch (reverted)', audit.reasoning)
    process.exitCode = 1
    return
  }

  console.log('[coinmarketcap-navigation] auditor passed the patch, committing')
  commitHealedLocator()
}

main().catch(error => {
  console.error('[coinmarketcap-navigation] unexpected failure', error)
  process.exitCode = 1
})
