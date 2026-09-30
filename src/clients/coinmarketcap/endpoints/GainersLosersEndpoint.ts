import { BaseEndpoint } from './BaseEndpoint'
import type { GainersLosersOptions, GainersLosersResponse, GainersLosersResult } from '../types'

const GAINERS_LOSERS_PATH = '/v1/cryptocurrency/trending/gainers-losers'

/** GET /v1/cryptocurrency/trending/gainers-losers */
export class GainersLosersEndpoint extends BaseEndpoint {
  async fetchGainersLosers({
    start,
    limit,
    timePeriod,
    convert,
    convertId,
    sort,
    sortDir,
  }: GainersLosersOptions = {}): Promise<GainersLosersResult> {
    if (convert && convertId) {
      throw new Error('CoinMarketCapClient.fetchGainersLosers cannot accept both convert and convertId')
    }

    const responseText = await this.request(GAINERS_LOSERS_PATH, {
      start: start === undefined ? undefined : String(start),
      limit: limit === undefined ? undefined : String(limit),
      time_period: timePeriod,
      convert,
      convert_id: convertId,
      sort,
      sort_dir: sortDir,
    })

    const body = JSON.parse(responseText) as GainersLosersResponse

    return {
      creditCount: body.status.credit_count,
      entries: body.data.map((item) => ({
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        slug: item.slug,
        quotes: Object.entries(item.quote).map(([currency, quote]) => ({
          currency,
          price: quote.price,
          percentChange1h: quote.percent_change_1h,
          percentChange24h: quote.percent_change_24h,
          percentChange7d: quote.percent_change_7d,
          percentChange30d: quote.percent_change_30d,
        })),
      })),
    }
  }
}
