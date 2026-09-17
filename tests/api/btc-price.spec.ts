import { test, expect } from '@playwright/test'
import { CoinMarketCapClient } from '../../src/clients/coinmarketcap'
import { readBtcPriceWindow } from '../../agents/btc-price-window/btcPriceWindow'

const apiKey = process.env.CMC_API_KEY
const { min: BTC_PRICE_MIN, max: BTC_PRICE_MAX } = readBtcPriceWindow()

test.describe('CoinMarketCap BTC Price', () => {
  test('BTC price is within expected range', async () => {
    expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()

    const client = new CoinMarketCapClient({ apiKey: apiKey! })
    const btc = await client.fetchBtcPrice()

    expect(btc.price).toBeGreaterThan(BTC_PRICE_MIN)
    expect(btc.price).toBeLessThan(BTC_PRICE_MAX)
  })
})
