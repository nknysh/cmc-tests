import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import type {
  JSONReport,
  JSONReportSpec,
  JSONReportSuite,
  JSONReportTestResult,
} from '@playwright/test/reporter'
import { promptLocalModel } from '../shared/localModel.mts'
import { auditChange, reportAuditBlock } from '../self-heal-commit-auditor/auditChange.mts'
// The attachment the coinboard `page` fixture adds to every failing test. An
// .mts module, so both Playwright and this plain-node script can import it.
import { DOM_SNAPSHOT_ATTACHMENT } from '../../tests/coinboard/domSnapshot.mts'

// Assumes invocation from the repo root (true for both the CI workflow and
// local `node .agents/coinboard-locators/self-heal-coinboard-locators.mts`).
const REPO_ROOT = process.cwd()
const JSON_REPORT_PATH = path.join(REPO_ROOT, '.agents/coinboard-locators/last-run.json')
// This suite's own Allure bucket (see playwright.config.ts / allurerc.mjs).
const ALLURE_SUITE = 'coinboard'
const ALLURE_RESULTS_DIR = path.join(REPO_ROOT, 'allure-results', ALLURE_SUITE)
const PLAYWRIGHT_BIN = path.join(REPO_ROOT, 'node_modules/.bin/playwright')
const CI_GIT_IDENTITY = ['-c', 'user.name=nknysh', '-c', 'user.email=nknysh@gmail.com']
// Page objects the heal may patch, keyed by the fixture that provides each
// one (tests/coinboard/fixtures.ts). A failing spec implicates the page
// objects whose fixtures it uses.
const PAGE_OBJECT_FIXTURES: Readonly<Record<string, string>> = {
  comparePage: 'tests/coinboard/pages/ComparePage.ts',
  coinPage: 'tests/coinboard/pages/CoinPage.ts',
}

interface TestFailure {
  title: string
  // Spec file path relative to the repo root.
  file: string
  error: string
  domSnapshot?: string
}

interface TestRun {
  passed: boolean
  failures: TestFailure[]
}

function readDomSnapshot(result: JSONReportTestResult): string | undefined {
  const attachment = result.attachments.find(a => a.name === DOM_SNAPSHOT_ATTACHMENT)
  if (attachment?.path) return fs.readFileSync(attachment.path, 'utf-8')
  if (attachment?.body) return Buffer.from(attachment.body, 'base64').toString('utf-8')
  return undefined
}

function toFailure(spec: JSONReportSpec, result: JSONReportTestResult, rootDir: string): TestFailure {
  // All errors, not just the first: on a test timeout the first is a bare
  // "Test timeout of Nms exceeded." and the call log that says what was being
  // waited for is only in the later ones.
  const messages = (result.errors ?? []).map(e => e.message).filter(Boolean)
  return {
    title: spec.title,
    file: path.relative(REPO_ROOT, path.join(rootDir, spec.file)),
    error: stripVTControlCharacters(messages.join('\n\n') || result.error?.message || 'unknown error'),
    domSnapshot: readDomSnapshot(result),
  }
}

function runCoinboardTests(): TestRun {
  // Remove any previous report so a run that crashes before writing one (bad
  // config, import error) fails loudly below instead of reading a stale file.
  fs.rmSync(JSON_REPORT_PATH, { force: true })

  try {
    // No --reporter override: the config adds the json reporter when
    // PLAYWRIGHT_JSON_OUTPUT_NAME is set, keeping its allure-playwright options.
    // PLAYWRIGHT_HTML_OPEN=never stops a local failing run from blocking on the
    // html reporter's report server.
    execFileSync(PLAYWRIGHT_BIN, ['test', '--project=coinboard'], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: {
        ...process.env,
        ALLURE_SUITE,
        SKIP_BTC_PRICE_HEAL: '1',
        PLAYWRIGHT_JSON_OUTPUT_NAME: JSON_REPORT_PATH,
        PLAYWRIGHT_HTML_OPEN: 'never',
      },
    })
  } catch {
    // Playwright exits non-zero on any test failure; the JSON report is still written.
  }

  const report: JSONReport = JSON.parse(fs.readFileSync(JSON_REPORT_PATH, 'utf-8'))
  // Deduped per test: CI retries report the same failure once per attempt. The
  // last attempt wins, so a test that passed on retry isn't counted as failed.
  // Keyed by Playwright's per-test id, since two tests can share a title (in
  // different files, or different describe blocks of one file).
  const outcomes = new Map<string, TestFailure | undefined>()

  const walk = (suite: JSONReportSuite): void => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const key = spec.id
        for (const result of test.results ?? []) {
          if (result.status === 'passed') outcomes.set(key, undefined)
          else if (result.status !== 'skipped') outcomes.set(key, toFailure(spec, result, report.config.rootDir))
        }
      }
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  for (const suite of report.suites ?? []) walk(suite)

  const failures = [...outcomes.values()].filter(f => f !== undefined)
  // Printed unconditionally (not just the count): the console log is the
  // quickest record of which test broke and why.
  for (const failure of failures) {
    console.log(`[coinboard-locators]   ✗ ${failure.file}: ${failure.title}\n${failure.error.slice(0, 1000)}`)
  }

  return { passed: failures.length === 0, failures }
}

// Distinguishes a stale-selector failure (worth self-healing) from a genuine
// assertion/business-logic failure (not something an LLM should paper over).
function isLocatorFailure(failure: TestFailure): boolean {
  // The coinboard `page` fixture fails a test on an app error; that's an app
  // bug, whatever the locators look like.
  if (/unexpected browser error/i.test(failure.error)) return false

  // A toHaveCount() of 0 is a locator that matches nothing. A different
  // nonzero count is content drift: the locator works, and only editing the
  // test's expectation can fix it, which is a human call.
  const countMismatch = /toHaveCount[\s\S]{0,200}?Received:\s*"?(\d+)"?/.exec(failure.error)
  if (countMismatch) return Number(countMismatch[1]) === 0

  // Playwright's call log says "waiting for getBy…(…)" on *every* assertion,
  // so that line alone doesn't mean a locator broke. "locator resolved to …"
  // followed by "unexpected value" means it found the element and the content
  // was wrong: an app regression, not a stale locator.
  if (/unexpected value/i.test(failure.error)) return false

  // "resolved to 0 elements" is a multi-element assertion (an array
  // toHaveText()) whose locator matched nothing; a nonzero count there means it
  // matched and the content differed. A strict-mode failure says so itself.
  if (/element\(s\) not found|resolved to 0 elements|strict mode violation|element is not attached/i.test(failure.error)) {
    return true
  }
  // An action (click, selectOption, …) that timed out without its locator
  // ever resolving.
  return /Timeout \d+ms exceeded/i.test(failure.error) && !/locator resolved to/i.test(failure.error)
}

/** The page objects a failing spec uses, as repo-relative paths. */
function pageObjectsFor(failure: TestFailure): string[] {
  const specSource = fs.readFileSync(path.join(REPO_ROOT, failure.file), 'utf-8')
  return Object.entries(PAGE_OBJECT_FIXTURES)
    .filter(([fixture]) => new RegExp(String.raw`\b${fixture}\b`).test(specSource))
    .map(([, pageObject]) => pageObject)
}

function groupByPageObject(failures: TestFailure[]): Map<string, TestFailure[]> {
  const groups = new Map<string, TestFailure[]>()
  for (const failure of failures) {
    for (const pageObject of pageObjectsFor(failure)) {
      groups.set(pageObject, [...(groups.get(pageObject) ?? []), failure])
    }
  }
  return groups
}

// Local models are less reliable than Claude about honoring "no markdown fences" -
// strip a leading/trailing ```-fence if the model wrapped its answer in one anyway.
function stripCodeFence(text: string): string {
  const fenced = /^```(?:\w+)?\n([\s\S]*?)\n```$/.exec(text.trim())
  return fenced ? fenced[1].trim() : text.trim()
}

async function proposeFix(params: { pageObjectSource: string; failures: TestFailure[] }): Promise<string> {
  const errorSummary = params.failures.map(f => `${f.title}\n${f.error.slice(0, 3000)}`).join('\n\n')
  // One snapshot is enough: the failing tests of one page object share its page.
  const domSnapshot = params.failures.find(f => f.domSnapshot)?.domSnapshot ?? '(no DOM snapshot captured)'

  const response = await promptLocalModel({
    systemPrompt: [
      'You repair a broken Playwright Page Object for CoinBoard, a React web app,',
      'after its markup changed and a locator no longer matches.',
      'You are given the current TypeScript source of the page object, the Playwright',
      'error(s) from the failing test(s), and the DOM of the page when the test failed',
      '(tags, data-testid/aria/role/id/for attributes and text; long selects trimmed).',
      'Reply with ONLY the complete corrected TypeScript file contents, no markdown',
      'fences and no commentary before or after. Change only what is broken (locators',
      'that no longer resolve), preferring getByRole, getByLabel and getByTestId; preserve',
      'everything else exactly, including the existing code style (no semicolons,',
      'single quotes, 2-space indent).',
    ].join(' '),
    userPrompt: [
      '## Failing test error(s)',
      '```',
      errorSummary,
      '```',
      '',
      '## DOM of the page when the test failed',
      '```html',
      domSnapshot,
      '```',
      '',
      '## Current page object source',
      '```typescript',
      params.pageObjectSource,
      '```',
    ].join('\n'),
    // Holds a DOM snapshot of up to 20 000 characters plus the page object and
    // the errors - bigger than the 8192 default.
    contextSize: 16384,
    // The answer is the page object itself, so allow about twice its tokens
    // (~4 characters each) instead of letting the model run on.
    maxTokens: Math.ceil(params.pageObjectSource.length / 2),
  })

  return stripCodeFence(response)
}

async function auditPatch(pageObject: string, originalSource: string, patchedSource: string) {
  return auditChange({
    systemPrompt: [
      'You audit an automated patch to a Playwright Page Object for a web app,',
      'proposed by another LLM to fix a failing locator. You are given the original',
      'source and the patched source. Flag CRITICAL if the diff changes anything beyond',
      'locator definitions - assertions, method signatures, exported members, or unrelated',
      'logic - or if a new locator looks suspiciously broad or fragile (a bare tag or',
      'CSS class selector, or an nth() index where a role or label would do). Otherwise PASS.',
    ].join(' '),
    userPrompt: [
      `## File: ${pageObject}`,
      '',
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
    // Holds two full copies of the page object - bigger than the 8192 default,
    // which risks silently truncating the prompt (and so the verdict).
    contextSize: 16384,
    // A verdict line and a short paragraph.
    maxTokens: 512,
  })
}

function commitHealedLocators(pageObjects: string[]): void {
  // In CI there's no configured git identity; scope one to this commit only
  // so we never touch a developer's global/local git config, while still
  // attributing the commit to the repo owner rather than a bot account.
  const identity = process.env.CI ? CI_GIT_IDENTITY : []

  try {
    execFileSync('git', ['add', '--', ...pageObjects], { stdio: 'inherit', cwd: REPO_ROOT })
    // Pathspec after `--` so only the page objects are committed, not anything else already staged.
    execFileSync(
      'git',
      [...identity, 'commit', '--no-verify', '-m', 'Self-heal CoinBoard locators', '--', ...pageObjects],
      { stdio: 'inherit', cwd: REPO_ROOT }
    )
  } catch (error) {
    console.warn('[coinboard-locators] failed to commit healed locators', error)
  }
}

function restore(originals: Map<string, string>): void {
  for (const [pageObject, source] of originals) fs.writeFileSync(path.join(REPO_ROOT, pageObject), source)
}

async function main(): Promise<void> {
  // Cleared once per script run, not per runCoinboardTests() call, so the
  // report records both the initial run and the post-heal re-run.
  fs.rmSync(ALLURE_RESULTS_DIR, { recursive: true, force: true })

  console.log('[coinboard-locators] running CoinBoard UI tests')
  const initial = runCoinboardTests()

  if (initial.passed) {
    console.log('[coinboard-locators] all tests passed, nothing to heal')
    return
  }

  const locatorFailures = initial.failures.filter(isLocatorFailure)
  if (locatorFailures.length < initial.failures.length) {
    // A real regression in the same run means the suite isn't healable as a
    // whole; patching locators around it would hide it.
    console.error('[coinboard-locators] tests failed for reasons other than a stale locator; leaving for a human')
    process.exitCode = 1
    return
  }

  const groups = groupByPageObject(locatorFailures)
  if (groups.size === 0) {
    console.error('[coinboard-locators] failing specs use no known page object; leaving for a human')
    process.exitCode = 1
    return
  }

  console.log(
    `[coinboard-locators] ${locatorFailures.length} locator failure(s) in ${[...groups.keys()].join(', ')}, attempting self-heal`
  )

  const originals = new Map<string, string>()
  const patches = new Map<string, string>()
  let verified = false
  try {
    for (const [pageObject, failures] of groups) {
      const originalSource = fs.readFileSync(path.join(REPO_ROOT, pageObject), 'utf-8')
      const patchedSource = await proposeFix({ pageObjectSource: originalSource, failures })
      if (patchedSource === originalSource) continue

      console.log(`[coinboard-locators] proposed patch for ${pageObject}:\n${patchedSource}`)
      originals.set(pageObject, originalSource)
      patches.set(pageObject, patchedSource)
      fs.writeFileSync(path.join(REPO_ROOT, pageObject), patchedSource)
    }

    if (patches.size === 0) {
      console.error('[coinboard-locators] local model proposed no change; leaving failure for a human')
      process.exitCode = 1
      return
    }

    console.log('[coinboard-locators] re-running tests to verify the patch')
    verified = runCoinboardTests().passed
  } finally {
    // Also runs if a step throws, so a patched file is never left behind unverified.
    if (!verified) restore(originals)
  }

  if (!verified) {
    console.error('[coinboard-locators] patched locators still fail, reverted')
    process.exitCode = 1
    return
  }

  console.log('[coinboard-locators] self-heal verified, auditing patch before commit')
  for (const [pageObject, patchedSource] of patches) {
    const audit = await auditPatch(pageObject, originals.get(pageObject) ?? '', patchedSource)
    if (audit.critical) {
      restore(originals)
      reportAuditBlock(`CoinBoard locator patch to ${pageObject} (all patches reverted)`, audit.reasoning)
      process.exitCode = 1
      return
    }
  }

  console.log('[coinboard-locators] auditor passed the patch, committing')
  commitHealedLocators([...patches.keys()])
}

main().catch(error => {
  console.error('[coinboard-locators] unexpected failure', error)
  process.exitCode = 1
})
