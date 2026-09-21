import 'dotenv/config'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { getLlama, resolveModelFile, LlamaChatSession } from 'node-llama-cpp'

// Assumes invocation from the repo root (true for both the CI workflow and
// local `node .agents/coinmarketcap-navigation/self-heal-navigation-locators.mts`).
const REPO_ROOT = process.cwd()
const PAGE_OBJECT_GIT_PATH = 'tests/e2e/pages/CoinMarketCapHomePage.ts'
const PAGE_OBJECT_PATH = path.join(REPO_ROOT, PAGE_OBJECT_GIT_PATH)
const JSON_REPORT_PATH = path.join(REPO_ROOT, '.agents/coinmarketcap-navigation/last-run.json')

// Runs fully offline via node-llama-cpp; downloaded once (~4.7GB) to MODELS_DIR on first use.
const MODEL_URI = 'hf:Qwen/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M'
const MODELS_DIR = path.join(REPO_ROOT, '.agents/coinmarketcap-navigation/models')

interface TestFailure {
  title: string
  error: string
}

function runE2ETests(): { passed: boolean; failures: TestFailure[] } {
  try {
    execSync('npx playwright test --project=e2e --reporter=json', {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: JSON_REPORT_PATH },
    })
  } catch {
    // Playwright exits non-zero on any test failure; the JSON report is still written.
  }

  const report = JSON.parse(fs.readFileSync(JSON_REPORT_PATH, 'utf-8'))
  const failures: TestFailure[] = []

  const walk = (suite: any): void => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          if (result.status !== 'passed' && result.status !== 'skipped') {
            failures.push({
              title: spec.title,
              error: result.error?.message ?? result.errors?.[0]?.message ?? 'unknown error',
            })
          }
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
    console.log(`[coinmarketcap-navigation]   ✗ ${failure.title}\n${failure.error.slice(0, 500)}`)
  }

  return { passed: failures.length === 0, failures }
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
  const modelPath = await resolveModelFile(MODEL_URI, MODELS_DIR)

  const llama = await getLlama()
  const model = await llama.loadModel({ modelPath })
  const context = await model.createContext({ contextSize: 8192 })

  try {
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
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
    })

    const response = await session.prompt(
      [
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
      ].join('\n')
    )

    return stripCodeFence(response)
  } finally {
    await context.dispose()
    await model.dispose()
    await llama.dispose()
  }
}

function commitHealedLocator(): void {
  // In CI there's no configured git identity; scope one to this commit only
  // so we never touch a developer's global/local git config, while still
  // attributing the commit to the repo owner rather than a bot account.
  const identity = process.env.CI
    ? '-c user.name="nknysh" -c user.email="nknysh@gmail.com" '
    : ''

  try {
    execSync(`git add ${PAGE_OBJECT_GIT_PATH}`, { stdio: 'inherit', cwd: REPO_ROOT })
    execSync(`git ${identity}commit -m "Self-heal CoinMarketCap navigation locator"`, {
      stdio: 'inherit',
      cwd: REPO_ROOT,
    })
  } catch (error) {
    console.warn('[coinmarketcap-navigation] failed to commit healed locator', error)
  }
}

async function main(): Promise<void> {
  console.log('[coinmarketcap-navigation] running e2e navigation tests')
  const initial = runE2ETests()

  if (initial.passed) {
    console.log('[coinmarketcap-navigation] all tests passed, nothing to heal')
    return
  }

  const locatorFailures = initial.failures.filter(isLocatorFailure)
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
  const verification = runE2ETests()

  if (!verification.passed) {
    console.error('[coinmarketcap-navigation] patched locator still fails, reverting')
    fs.writeFileSync(PAGE_OBJECT_PATH, originalSource)
    process.exitCode = 1
    return
  }

  console.log('[coinmarketcap-navigation] self-heal verified, committing')
  commitHealedLocator()
}

main().catch(error => {
  console.error('[coinmarketcap-navigation] unexpected failure', error)
  process.exitCode = 1
})
