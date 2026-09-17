import 'dotenv/config'
import { CoinMarketCapClient } from '../../src/clients/coinmarketcap'
import { readBtcPriceWindow, writeBtcPriceWindow } from './btcPriceWindow'

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
}
