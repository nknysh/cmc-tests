import type { BtcPrice, BtcQuoteResponse, CoinMarketCapClientOptions } from './types'

const DEFAULT_BASE_URL = 'https://pro-api.coinmarketcap.com'

export class CoinMarketCapClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL }: CoinMarketCapClientOptions) {
    if (!apiKey) {
      throw new Error('CoinMarketCapClient requires an apiKey')
    }
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async fetchBtcPrice(): Promise<BtcPrice> {
    const url = new URL('/v2/cryptocurrency/quotes/latest', this.baseUrl)
    url.searchParams.set('symbol', 'BTC')
    url.searchParams.set('convert', 'USD')

    const headers = {
      'X-CMC_PRO_API_KEY': this.apiKey,
      Accept: 'application/json',
    }

    console.log('[CoinMarketCapClient] request', {
      method: 'GET',
      url: url.toString(),
      headers: { ...headers, 'X-CMC_PRO_API_KEY': '[redacted]' },
    })

    const response = await fetch(url, { headers })
    const responseText = await response.text()

    console.log('[CoinMarketCapClient] response', {
      url: url.toString(),
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    })

    if (!response.ok) {
      throw new Error(
        `CoinMarketCap API request failed: ${response.status} ${response.statusText}`
      )
    }

    const body = JSON.parse(responseText) as BtcQuoteResponse
    const quote = body.data.BTC[0].quote.USD

    return {
      price: quote.price,
      currency: 'USD',
      lastUpdated: quote.last_updated,
    }
  }
}
