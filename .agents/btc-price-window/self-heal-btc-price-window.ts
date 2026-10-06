import 'dotenv/config'
import { execSync } from 'node:child_process'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'
import { readBtcPriceWindow, writeBtcPriceWindow } from './btcPriceWindow'
import { auditChange, reportAuditBlock } from '../self-heal-commit-auditor/auditChange.mts'

const WINDOW_JSON_GIT_PATH = '.agents/btc-price-window/btc-price-window.json'
const SYMBOL_BTC = 'BTC'

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

  const audit = await auditChange({
    systemPrompt: [
      'You audit an automated recentring of a BTC price-alert window used by a test',
      'assertion. You are given the old window, the live BTC price that triggered the',
      'recentre, and the proposed new window. Flag CRITICAL if: the price is',
      'non-positive or implausible for BTC, the new window width does not match the old',
      'width, the bounds are inverted (min >= max), or the shift from the old window is',
      'wildly disproportionate to normal BTC volatility over a several-hour interval.',
      'Otherwise PASS.',
    ].join(' '),
    userPrompt: [
      `old window: min=${window.min}, max=${window.max}, width=${width}`,
      `fetched price: ${price}`,
      `proposed new window: min=${newMin}, max=${newMax}, width=${newMax - newMin}`,
    ].join('\n'),
  })

  if (audit.critical) {
    reportAuditBlock('BTC price window recentring (window left unchanged)', audit.reasoning)
    // A plain warning would leave a blocked recentring silently invisible in
    // CI, since nothing else in this script fails the job - force the job
    // red so it's not missed among otherwise-green runs.
    process.exitCode = 1
    return
  }

  console.log('[self-heal-btc-price-window] auditor passed the recentring, committing')
  writeBtcPriceWindow({ min: newMin, max: newMax })
  commitHealedWindow()
}
