import { BaseEndpoint } from './BaseEndpoint'
import type { ListingsLatestOptions, ListingsLatestResponse, ListingsLatestResult } from '../types'

const LISTINGS_LATEST_PATH = '/v3/cryptocurrency/listings/latest'

/** GET /v3/cryptocurrency/listings/latest: active coins ranked by market cap. */
export class ListingsLatestEndpoint extends BaseEndpoint {
  async fetchListingsLatest({ start, limit, convert }: ListingsLatestOptions = {}): Promise<ListingsLatestResult> {
    const responseText = await this.request(LISTINGS_LATEST_PATH, {
      start: start === undefined ? undefined : String(start),
      limit: limit === undefined ? undefined : String(limit),
      convert,
    })

    const body = JSON.parse(responseText) as ListingsLatestResponse

    return {
      timestamp: body.status.timestamp,
      creditCount: body.status.credit_count,
      entries: body.data.map((item) => ({
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        slug: item.slug,
        rank: item.cmc_rank,
        tags: item.tags,
        dateAdded: item.date_added,
        circulatingSupply: item.circulating_supply,
        totalSupply: item.total_supply,
        maxSupply: item.max_supply,
        quotes: item.quote.map((quote) => ({
          currency: quote.symbol,
          price: quote.price,
          marketCap: quote.market_cap,
          marketCapDominance: quote.market_cap_dominance,
          volume24h: quote.volume_24h,
          percentChange1h: quote.percent_change_1h,
          percentChange24h: quote.percent_change_24h,
          percentChange7d: quote.percent_change_7d,
          percentChange30d: quote.percent_change_30d,
        })),
      })),
    }
  }
}
