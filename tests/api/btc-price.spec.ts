import { test, expect } from '@playwright/test'
import { CoinMarketCapClient } from '../../src/clients/coinmarketcap'

const BTC_PRICE_MIN = 70_000
const BTC_PRICE_MAX = 80_000
const apiKey = process.env.CMC_API_KEY

test.describe('CoinMarketCap BTC Price', () => {
  test('BTC price is within expected range', async () => {
    expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()

    const client = new CoinMarketCapClient({ apiKey: apiKey! })
    const btc = await client.fetchBtcPrice()

    expect(btc.price).toBeGreaterThan(BTC_PRICE_MIN)
    expect(btc.price).toBeLessThan(BTC_PRICE_MAX)
  })
})
