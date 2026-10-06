import { z } from 'zod'

/**
 * Zod schemas for the raw CoinMarketCap responses this client parses. They are
 * the source of truth for the raw response types in `types.ts` (via
 * `z.infer`) and for the contract tests under `tests/contract/`, which check
 * live responses and recorded fixtures against them. The client itself doesn't
 * validate at runtime.
 *
 * Each schema lists only the fields the client reads. `z.object` ignores
 * unknown keys, so CMC adding a field doesn't break the contract; renaming,
 * removing or retyping one does.
 */

/**
 * `status.error_code` isn't typed consistently across endpoints: quotes/latest
 * and gainers-losers send a number (`0`, `1001`) with `error_message: null`,
 * while simple/price sends a numeric string (`"0"`, `"1001"`) with `""`.
 */
const ErrorCodeSchema = z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])

export const CmcApiStatusSchema = z.object({
  timestamp: z.iso.datetime(),
  error_code: ErrorCodeSchema,
  error_message: z.string().nullable(),
  elapsed: z.number(),
  credit_count: z.number().int().nonnegative(),
})

/** Body of a non-OK response: a status envelope with a non-zero error code and a message. */
export const CmcErrorResponseSchema = z.object({
  status: CmcApiStatusSchema.extend({
    error_code: ErrorCodeSchema.refine((code) => Number(code) > 0, 'error_code must be non-zero'),
    error_message: z.string().min(1),
  }),
})

const quoteLatestEntry = <P extends z.ZodType>(price: P) =>
  z.object({
    quote: z.object({
      USD: z.object({
        price,
        last_updated: z.iso.datetime(),
      }),
    }),
  })

/**
 * GET /v2/cryptocurrency/quotes/latest. A symbol maps to every coin sharing it
 * (BTC returns ~13), ranked so the canonical coin comes first. Inactive
 * collisions further down have `price: null`, so only the first entry, the
 * one the client reads, is required to carry a numeric price.
 */
export const QuoteResponseSchema = z.object({
  data: z.record(z.string(), z.tuple([quoteLatestEntry(z.number())], quoteLatestEntry(z.number().nullable()))),
  status: CmcApiStatusSchema,
})

const SimplePriceQuoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  market_cap: z.number().optional(),
  volume_24h: z.number().optional(),
  percent_change_24h: z.number().optional(),
  last_updated: z.iso.datetime().optional(),
})

/** Every optional include_* field present, as returned for `include_all=true`. */
export const SimplePriceQuoteIncludeAllSchema = SimplePriceQuoteSchema.required()

/** GET /v2/simple/price */
export const SimplePriceResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      symbol: z.string(),
      slug: z.string(),
      quotes: z.array(SimplePriceQuoteSchema),
    }),
  ),
  status: CmcApiStatusSchema,
})

/** GET /v1/cryptocurrency/trending/gainers-losers */
export const GainersLosersResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      symbol: z.string(),
      slug: z.string(),
      quote: z.record(
        z.string(),
        z.object({
          price: z.number(),
          percent_change_1h: z.number(),
          percent_change_24h: z.number(),
          percent_change_7d: z.number(),
          percent_change_30d: z.number(),
        }),
      ),
    }),
  ),
  status: CmcApiStatusSchema,
})
