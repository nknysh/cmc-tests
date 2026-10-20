import { test, expect } from '@playwright/test'
import { Severity, severity } from '@tests/helpers/severity'
import { createCmcClient } from '@tests/helpers/cmc'
import { readBtcPriceWindow } from '@agents/btc-price-window/btcPriceWindow'

const SYMBOL_BTC = 'BTC'
const { min: BTC_PRICE_MIN, max: BTC_PRICE_MAX } = readBtcPriceWindow()

test.describe('CoinMarketCap BTC Price', () => {
  test('BTC price is within expected range', severity(Severity.BLOCKER), async () => {
    const client = createCmcClient()
    const btc = await client.fetchPrice(SYMBOL_BTC)

    expect(btc.price).toBeGreaterThan(BTC_PRICE_MIN)
    expect(btc.price).toBeLessThan(BTC_PRICE_MAX)
  })
})
