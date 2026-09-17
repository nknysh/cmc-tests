import { test, expect } from '@playwright/test'
import { CoinMarketCapClient } from '../../src/clients/coinmarketcap'

const BTC_PRICE_THRESHOLD = 30_000

test('BTC price is above threshold', async () => {
  const apiKey = process.env.CMC_API_KEY
  expect(apiKey, 'CMC_API_KEY must be set').toBeTruthy()

  const client = new CoinMarketCapClient({ apiKey: apiKey! })
  const btc = await client.fetchBtcPrice()

  expect(btc.price).toBeGreaterThan(BTC_PRICE_THRESHOLD)
})
