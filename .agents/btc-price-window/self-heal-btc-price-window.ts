import 'dotenv/config'
import { execSync } from 'node:child_process'
import { CoinMarketCapClient } from '@src/clients/coinmarketcap'
import { readBtcPriceWindow, writeBtcPriceWindow } from './btcPriceWindow'

const WINDOW_JSON_GIT_PATH = '.agents/btc-price-window/btc-price-window.json'

function commitHealedWindow(): void {
  // In CI there's no configured git identity; scope one to this commit only
  // so we never touch a developer's global/local git config.
  const identity = process.env.CI
    ? '-c user.name="github-actions[bot]" -c user.email="github-actions[bot]@users.noreply.github.com" '
    : ''

  try {
    execSync(`git add ${WINDOW_JSON_GIT_PATH}`, { stdio: 'inherit' })
    execSync(`git ${identity}commit -m "Self-heal BTC price window"`, { stdio: 'inherit' })
  } catch (error) {
    console.warn('[self-heal-btc-price-window] failed to commit healed window', error)
  }
}

export default async function globalSetup(): Promise<void> {
  const apiKey = process.env.CMC_API_KEY
  if (!apiKey) {
    console.warn('[self-heal-btc-price-window] CMC_API_KEY not set, skipping self-heal')
    return
  }

  const window = readBtcPriceWindow()
  const width = window.max - window.min

  const client = new CoinMarketCapClient({ apiKey })
  const { price } = await client.fetchBtcPrice()

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

  writeBtcPriceWindow({ min: newMin, max: newMax })
  commitHealedWindow()
}
