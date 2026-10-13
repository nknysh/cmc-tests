import { BaseEndpoint } from './BaseEndpoint'
import type { QuotesLatestOptions, QuotesLatestResult, QuotesLatestV3Response } from '../types'

const QUOTES_LATEST_V3_PATH = '/v3/cryptocurrency/quotes/latest'

const flag = (value: number | undefined): boolean | undefined => (value === undefined ? undefined : value === 1)

/**
 * GET /v3/cryptocurrency/quotes/latest. Params are passed through without
 * client-side checks, so the API's own validation (missing or conflicting
 * identifiers, convert vs convert_id) surfaces as the thrown error.
 */
export class QuotesLatestV3Endpoint extends BaseEndpoint {
  async fetchQuotesLatest({
    id,
    slug,
    symbol,
    convert,
    convertId,
    aux,
    skipInvalid,
  }: QuotesLatestOptions = {}): Promise<QuotesLatestResult> {
    const responseText = await this.request(QUOTES_LATEST_V3_PATH, {
      id,
      slug,
      symbol,
      convert,
      convert_id: convertId,
      aux,
      skip_invalid: skipInvalid === undefined ? undefined : String(skipInvalid),
    })

    const body = JSON.parse(responseText) as QuotesLatestV3Response

    return {
      creditCount: body.status.credit_count,
      entries: body.data.map((item) => ({
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        slug: item.slug,
        numMarketPairs: item.num_market_pairs,
        cmcRank: item.cmc_rank,
        dateAdded: item.date_added,
        tags: item.tags?.map((tag) => tag.slug),
        platform: item.platform && { id: item.platform.id, tokenAddress: item.platform.token_address },
        maxSupply: item.max_supply,
        circulatingSupply: item.circulating_supply,
        totalSupply: item.total_supply,
        isActive: flag(item.is_active),
        isFiat: flag(item.is_fiat),
        quotes: item.quote.map((quote) => ({
          currency: quote.symbol,
          currencyId: quote.id,
          price: quote.price,
          marketCap: quote.market_cap,
          volume24h: quote.volume_24h,
          percentChange1h: quote.percent_change_1h,
          percentChange24h: quote.percent_change_24h,
          percentChange7d: quote.percent_change_7d,
          lastUpdated: quote.last_updated,
        })),
      })),
    }
  }
}
