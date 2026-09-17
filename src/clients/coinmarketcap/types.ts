export interface BtcPrice {
  price: number
  currency: string
  lastUpdated: string
}

export interface CoinMarketCapClientOptions {
  apiKey: string
  baseUrl?: string
}

export interface CmcApiStatus {
  timestamp: string
  error_code: number
  error_message: string | null
  elapsed: number
  credit_count: number
}

export interface BtcQuoteResponse {
  data: {
    BTC: Array<{
      quote: {
        USD: {
          price: number
          last_updated: string
        }
      }
    }>
  }
  status: CmcApiStatus
}
