import { BaseEndpoint } from './BaseEndpoint'
import type { Price, QuoteResponse } from '../types'

const QUOTES_LATEST_PATH = '/v2/cryptocurrency/quotes/latest'
const CURRENCY_USD = 'USD'

/** GET /v2/cryptocurrency/quotes/latest */
export class QuotesLatestEndpoint extends BaseEndpoint {
  async fetchPrice(symbol: string): Promise<Price> {
    if (!symbol) {
      throw new Error('CoinMarketCapClient.fetchPrice requires a symbol')
    }

    const responseText = await this.request(QUOTES_LATEST_PATH, {
      symbol,
      convert: CURRENCY_USD,
    })

    const body = JSON.parse(responseText) as QuoteResponse
    const quote = body.data[symbol][0].quote[CURRENCY_USD]

    return {
      price: quote.price,
      currency: CURRENCY_USD,
      lastUpdated: quote.last_updated,
    }
  }
}
