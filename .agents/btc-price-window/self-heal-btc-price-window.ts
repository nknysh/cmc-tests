import 'dotenv/config'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'
import { BtcPriceWindow, readBtcPriceWindow, writeBtcPriceWindow } from './btcPriceWindow'

const WINDOW_JSON_GIT_PATH = '.agents/btc-price-window/btc-price-window.json'
const SYMBOL_BTC = 'BTC'
// Largest accepted distance between the fetched price and the current
// window's centre, as a fraction of the price. BTC rarely moves this much
// between 4-hourly runs; a bigger jump more likely means a bad API value
// (e.g. a decimal-place error) than real movement.
const MAX_SHIFT_RATIO = 0.1

// These checks used to go to the local-model auditor, but they're all
// arithmetic and the 7B model got the comparisons wrong, e.g. blocking a valid
// recentring because the bounds were "inverted". Code gets them right every time.
function recentringProblems(current: BtcPriceWindow, price: number, proposed: BtcPriceWindow): string[] {
  if (!Number.isFinite(price) || price <= 0) return [`fetched price ${price} is not a positive number`]

  const problems: string[] = []
  if (proposed.min >= proposed.max) {
    problems.push(`proposed bounds are inverted: min ${proposed.min} >= max ${proposed.max}`)
  }
  if (proposed.max - proposed.min !== current.max - current.min) {
    problems.push(
      `proposed width ${proposed.max - proposed.min} differs from current width ${current.max - current.min}`
    )
  }
  const currentCentre = (current.min + current.max) / 2
  const shift = Math.abs(price - currentCentre)
  if (shift > price * MAX_SHIFT_RATIO) {
    problems.push(
      `price ${price} is ${Math.round(shift)} from the current window's centre ${currentCentre}, ` +
        `more than ${MAX_SHIFT_RATIO * 100}% of the price`
    )
  }
  return problems
}

function reportBlockedRecentring(problems: string[]): void {
  const reason = problems.join('; ')
  console.error(`[self-heal-btc-price-window] recentring blocked, window left unchanged: ${reason}`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 🚫 BTC price window recentring blocked\n\n${reason}\n\n`)
  }
}

function commitHealedWindow(): void {
  // In CI there's no configured git identity; scope one to this commit only
  // so we never touch a developer's global/local git config, while still
  // attributing the commit to the repo owner rather than a bot account.
  const identity = process.env.CI
    ? '-c user.name="nknysh" -c user.email="nknysh@gmail.com" '
    : ''

  try {
    execSync(`git add ${WINDOW_JSON_GIT_PATH}`, { stdio: 'inherit' })
    // Pathspec after `--` so only the window file is committed, not anything else already staged.
    execSync(`git ${identity}commit --no-verify -m "Self-heal BTC price window" -- ${WINDOW_JSON_GIT_PATH}`, {
      stdio: 'inherit',
    })
  } catch (error) {
    console.warn('[self-heal-btc-price-window] failed to commit healed window', error)
  }
}

export default async function globalSetup(): Promise<void> {
  // Set by runs that don't use the window (the contract suite), so they make no
  // live price call and can't produce a heal commit.
  if (process.env.SKIP_BTC_PRICE_HEAL) {
    console.log('[self-heal-btc-price-window] SKIP_BTC_PRICE_HEAL set, skipping self-heal')
    return
  }

  const apiKey = process.env.CMC_API_KEY
  if (!apiKey) {
    console.warn('[self-heal-btc-price-window] CMC_API_KEY not set, skipping self-heal')
    return
  }

  const window = readBtcPriceWindow()
  const width = window.max - window.min

  const client = new CoinMarketCapClient({ apiKey })
  const { price } = await client.fetchPrice(SYMBOL_BTC)

  if (price > window.min && price < window.max) {
    console.log(
      `[self-heal-btc-price-window] price ${price} within [${window.min}, ${window.max}], no change`
    )
    return
  }

  const newMin = Math.round(price - width / 2)
  const newMax = newMin + width

  console.log(
    `[self-heal-btc-price-window] price ${price} outside [${window.min}, ${window.max}], recentring to [${newMin}, ${newMax}]`
  )

  const problems = recentringProblems(window, price, { min: newMin, max: newMax })
  if (problems.length > 0) {
    reportBlockedRecentring(problems)
    // A plain warning would leave a blocked recentring silently invisible in
    // CI, since nothing else in this script fails the job - force the job
    // red so it's not missed among otherwise-green runs.
    process.exitCode = 1
    return
  }

  console.log('[self-heal-btc-price-window] recentring checks passed, committing')
  writeBtcPriceWindow({ min: newMin, max: newMax })
  commitHealedWindow()
}
