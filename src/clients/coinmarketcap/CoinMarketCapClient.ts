import { GainersLosersEndpoint } from './endpoints/GainersLosersEndpoint'
import { QuotesLatestEndpoint } from './endpoints/QuotesLatestEndpoint'
import { QuotesLatestV3Endpoint } from './endpoints/QuotesLatestV3Endpoint'
import { SimplePriceEndpoint } from './endpoints/SimplePriceEndpoint'
import type {
  CoinMarketCapClientOptions,
  GainersLosersOptions,
  GainersLosersResult,
  Price,
  QuotesLatestOptions,
  QuotesLatestResult,
  SimplePriceEntry,
  SimplePriceOptions,
} from './types'

const DEFAULT_BASE_URL = 'https://pro-api.coinmarketcap.com'

/**
 * Facade over CoinMarketCap's Pro API. Each endpoint's request/response
 * handling lives in its own class under `endpoints/`; this class just wires
 * up shared config and delegates.
 */
export class CoinMarketCapClient {
  private readonly gainersLosers: GainersLosersEndpoint
  private readonly quotesLatest: QuotesLatestEndpoint
  private readonly quotesLatestV3: QuotesLatestV3Endpoint
  private readonly simplePrice: SimplePriceEndpoint

  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, rateLimiter }: CoinMarketCapClientOptions) {
    if (!apiKey) {
      throw new Error('CoinMarketCapClient requires an apiKey')
    }
    this.gainersLosers = new GainersLosersEndpoint({ apiKey, baseUrl, rateLimiter })
    this.quotesLatest = new QuotesLatestEndpoint({ apiKey, baseUrl, rateLimiter })
    this.quotesLatestV3 = new QuotesLatestV3Endpoint({ apiKey, baseUrl, rateLimiter })
    this.simplePrice = new SimplePriceEndpoint({ apiKey, baseUrl, rateLimiter })
  }

  fetchPrice(symbol: string): Promise<Price> {
    return this.quotesLatest.fetchPrice(symbol)
  }

  fetchQuotesLatest(options?: QuotesLatestOptions): Promise<QuotesLatestResult> {
    return this.quotesLatestV3.fetchQuotesLatest(options)
  }

  fetchSimplePrice(options: SimplePriceOptions): Promise<SimplePriceEntry[]> {
    return this.simplePrice.fetchSimplePrice(options)
  }

  fetchGainersLosers(options?: GainersLosersOptions): Promise<GainersLosersResult> {
    return this.gainersLosers.fetchGainersLosers(options)
  }
}
