import { BaseEndpoint } from './BaseEndpoint'
import type { SimplePriceEntry, SimplePriceOptions, SimplePriceResponse } from '../types'

const SIMPLE_PRICE_PATH = '/v2/simple/price'

/** GET /v2/simple/price */
export class SimplePriceEndpoint extends BaseEndpoint {
  async fetchSimplePrice({
    id,
    slug,
    symbol,
    convert,
    convertId,
    includeMarketCap,
    include24hVolume,
    include24hChange,
    includeLastUpdated,
    includeAll,
    precision,
    skipInvalid,
  }: SimplePriceOptions): Promise<SimplePriceEntry[]> {
    if (!id && !slug && !symbol) {
      throw new Error('CoinMarketCapClient.fetchSimplePrice requires one of id, slug, or symbol')
    }
    if (convert && convertId) {
      throw new Error('CoinMarketCapClient.fetchSimplePrice cannot accept both convert and convertId')
    }

    const responseText = await this.request(SIMPLE_PRICE_PATH, {
      id,
      slug,
      symbol,
      convert,
      convert_id: convertId,
      include_market_cap: includeMarketCap === undefined ? undefined : String(includeMarketCap),
      include_24h_volume: include24hVolume === undefined ? undefined : String(include24hVolume),
      include_24h_change: include24hChange === undefined ? undefined : String(include24hChange),
      include_last_updated: includeLastUpdated === undefined ? undefined : String(includeLastUpdated),
      include_all: includeAll === undefined ? undefined : String(includeAll),
      precision: precision === undefined ? undefined : String(precision),
      skip_invalid: skipInvalid === undefined ? undefined : String(skipInvalid),
    })

    const body = JSON.parse(responseText) as SimplePriceResponse

    return body.data.map((item) => ({
      id: item.id,
      name: item.name,
      symbol: item.symbol,
      slug: item.slug,
      quotes: item.quotes.map((quote) => ({
        currency: quote.symbol,
        price: quote.price,
        marketCap: quote.market_cap,
        volume24h: quote.volume_24h,
        percentChange24h: quote.percent_change_24h,
        lastUpdated: quote.last_updated,
      })),
    }))
  }
}
