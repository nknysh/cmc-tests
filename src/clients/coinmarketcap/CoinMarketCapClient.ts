import { QuotesLatestEndpoint } from './endpoints/QuotesLatestEndpoint'
import { SimplePriceEndpoint } from './endpoints/SimplePriceEndpoint'
import type { CoinMarketCapClientOptions, Price, SimplePriceEntry, SimplePriceOptions } from './types'

const DEFAULT_BASE_URL = 'https://pro-api.coinmarketcap.com'

/**
 * Facade over CoinMarketCap's Pro API. Each endpoint's request/response
 * handling lives in its own class under `endpoints/`; this class just wires
 * up shared config and delegates.
 */
export class CoinMarketCapClient {
  private readonly quotesLatest: QuotesLatestEndpoint
  private readonly simplePrice: SimplePriceEndpoint

  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL }: CoinMarketCapClientOptions) {
    if (!apiKey) {
      throw new Error('CoinMarketCapClient requires an apiKey')
    }
    this.quotesLatest = new QuotesLatestEndpoint({ apiKey, baseUrl })
    this.simplePrice = new SimplePriceEndpoint({ apiKey, baseUrl })
  }

  fetchPrice(symbol: string): Promise<Price> {
    return this.quotesLatest.fetchPrice(symbol)
  }

  fetchSimplePrice(options: SimplePriceOptions): Promise<SimplePriceEntry[]> {
    return this.simplePrice.fetchSimplePrice(options)
  }
}
