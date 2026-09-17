import type { BtcPrice, BtcQuoteResponse, CoinMarketCapClientOptions } from './types'

const DEFAULT_BASE_URL = 'https://pro-api.coinmarketcap.com'
const QUOTES_LATEST_PATH = '/v2/cryptocurrency/quotes/latest'
const API_KEY_HEADER = 'X-CMC_PRO_API_KEY'
const SYMBOL_BTC = 'BTC'
const CURRENCY_USD = 'USD'

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
    const url = new URL(QUOTES_LATEST_PATH, this.baseUrl)
    url.searchParams.set('symbol', SYMBOL_BTC)
    url.searchParams.set('convert', CURRENCY_USD)

    const headers = {
      [API_KEY_HEADER]: this.apiKey,
      Accept: 'application/json',
    }

    console.log('[CoinMarketCapClient] request', {
      method: 'GET',
      url: url.toString(),
      headers: { ...headers, [API_KEY_HEADER]: '[redacted]' },
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
    const quote = body.data[SYMBOL_BTC][0].quote[CURRENCY_USD]

    return {
      price: quote.price,
      currency: CURRENCY_USD,
      lastUpdated: quote.last_updated,
    }
  }
}
