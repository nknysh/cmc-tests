# CoinMarketCap Pro API — Endpoints Available on This Key

Generated 2026-09-22 by probing every documented Pro API endpoint live against the
key in `.env` (`CMC_API_KEY`), which is on the free **Basic** plan (15,000
credits/month, 50 requests/minute — see `GET /v1/key/info`).

## Methodology

Each endpoint was called with its documented HTTP method (GET/POST) and no or
minimal parameters. A response of `403` with `error_code: 1006`
(`"Your API Key subscription plan doesn't support this endpoint"`) means the
current plan does **not** include that endpoint — this is a hard plan gate,
distinct from `400`/`4002` parameter-validation errors, which mean the
endpoint itself works but needs different arguments. Endpoints were re-tested
with real parameters where an initial call returned an inconclusive `500`.

This is a snapshot, not a guarantee — CoinMarketCap's endpoint catalog and
plan entitlements can change. Re-run the probe if behavior here seems stale.

**Legend:** `[x]` available on this key today · `[ ]` blocked (`1006`, needs a paid tier).

## Cryptocurrency (9/19)

- [ ] `GET /v1/cryptocurrency/airdrop`
- [ ] `GET /v1/cryptocurrency/airdrops`
- [x] `GET /v1/cryptocurrency/categories`
- [x] `GET /v1/cryptocurrency/category`
- [x] `GET /v1/cryptocurrency/map` — Cryptocurrency ID Map
- [x] `GET /v1/cryptocurrency/listings/historical`
- [x] `GET /v3/cryptocurrency/listings/latest`
- [ ] `GET /v1/cryptocurrency/listings/new`
- [ ] `GET /v2/cryptocurrency/market-pairs/latest`
- [x] `GET /v2/cryptocurrency/info` — Metadata
- [ ] `GET /v2/cryptocurrency/ohlcv/historical`
- [ ] `GET /v2/cryptocurrency/ohlcv/latest`
- [ ] `GET /v2/cryptocurrency/price-performance-stats/latest`
- [x] `GET /v3/cryptocurrency/quotes/historical`
- [x] `GET /v3/cryptocurrency/quotes/latest`
- [x] `GET /v2/simple/price`
- [ ] `GET /v1/cryptocurrency/trending/gainers-losers`
- [ ] `GET /v1/cryptocurrency/trending/latest`
- [ ] `GET /v1/cryptocurrency/trending/most-visited`

## Exchange (4/7)

- [x] `GET /v1/exchange/assets`
- [x] `GET /v1/exchange/map` — Exchange ID Map
- [ ] `GET /v1/exchange/listings/latest`
- [ ] `GET /v1/exchange/market-pairs/latest`
- [x] `GET /v1/exchange/info` — Metadata
- [x] `GET /v1/exchange/quotes/historical`
- [ ] `GET /v1/exchange/quotes/latest`

## Real World Assets (6/7)

- [x] `GET /v5/real-world-assets/issuers`
- [x] `GET /v5/real-world-assets/issuers/list`
- [ ] `GET /v5/real-world-assets/market-pairs/list`
- [x] `GET /v5/real-world-assets/info` — Metadata
- [x] `GET /v5/real-world-assets/quotes/latest`
- [x] `GET /v5/real-world-assets/map` — RWA ID Map
- [x] `GET /v5/real-world-assets/assets/list` — RWA List

## Derivatives (6/6)

- [x] `GET /v5/cryptocurrency/derivatives/market-pairs/list/latest`
- [x] `GET /v5/exchange/derivatives/market-pairs/list/latest`
- [x] `GET /v5/derivatives/liquidations/cryptocurrency/list/latest`
- [x] `GET /v5/derivatives/liquidations/exchange/list/latest`
- [x] `GET /v5/derivatives/liquidations/quotes/latest`
- [x] `GET /v5/exchange/derivatives/list`

## CMC AI (0/3)

- [ ] `GET /v5/cmc-ai/coins/map`
- [ ] `GET /v5/cmc-ai/coins/latest`
- [ ] `GET /v5/cmc-ai/latest`

## Global Metrics (6/6)

- [x] `GET /v1/altcoin-season-index/historical`
- [x] `GET /v1/altcoin-season-index/latest`
- [x] `GET /v3/fear-and-greed/historical`
- [x] `GET /v3/fear-and-greed/latest`
- [x] `GET /v1/global-metrics/quotes/historical`
- [x] `GET /v1/global-metrics/quotes/latest`

## Content (3/4)

- [ ] `GET /v1/content/latest`
- [x] `GET /v1/content/posts/latest`
- [x] `GET /v1/content/posts/comments`
- [x] `GET /v1/content/posts/top`

## Community (0/2)

- [ ] `GET /v1/community/trending/token`
- [ ] `GET /v1/community/trending/topic`

## CMC Index (4/4)

- [x] `GET /v3/index/cmc100-historical`
- [x] `GET /v3/index/cmc100-latest`
- [x] `GET /v3/index/cmc20-historical`
- [x] `GET /v3/index/cmc20-latest`

## Token — DEX (10/16)

- [ ] `POST /v1/dex/token/price/batch`
- [ ] `POST /v1/dex/tokens/batch-query`
- [x] `GET /v1/dex/liquidity-change/list`
- [ ] `POST /v1/dex/meme/list`
- [ ] `POST /v1/dex/new/list`
- [x] `GET /v1/dex/security/detail`
- [x] `GET /v1/dex/tokens/transactions` — swap list
- [x] `GET /v1/dex/token` — token detail
- [x] `GET /v1/dex/token/pools`
- [x] `GET /v1/dex/token/price`
- [ ] `POST /v1/dex/gainer-loser/list`
- [ ] `POST /v1/dex/tokens/trending/list`
- [x] `GET /v4/dex/spot-pairs/latest`
- [x] `GET /v1/dex/token-liquidity/query`
- [x] `GET /v4/dex/pairs/quotes/latest`
- [x] `GET /v1/dex/search`

## Platform — DEX (2/2)

- [x] `GET /v1/dex/platform/detail`
- [x] `GET /v1/dex/platform/list`

## Holder — DEX (4/5)

- [x] `GET /v1/dex/holders/count`
- [x] `POST /v1/dex/holders/detail`
- [x] `GET /v1/dex/holders/tag_count`
- [ ] `GET /v1/dex/holders/trend/list`
- [x] `POST /v1/dex/holders/list`

## OHLCV — DEX (2/2)

- [x] `GET /v1/k-line/candles`
- [x] `GET /v1/k-line/points` — returned a transient backend `500` during
  testing even with valid params; no `1006` was seen, so it is not
  plan-blocked, but recheck if you hit this in practice.

## Tools (4/4)

- [x] `GET /v1/fiat/map`
- [x] `GET /v1/key/info`
- [x] `GET /v1/tools/postman`
- [x] `GET /v2/tools/price-conversion`

## Summary

The Basic plan covers core lookup/quote/listing endpoints in every category,
plus all of Derivatives, Global Metrics, CMC Index, Platform, and OHLCV. It
excludes: CMC AI, Community, `trending/*` and `airdrop*` under
Cryptocurrency, the `listings/latest` / `market-pairs/latest` / `quotes/latest`
trio on Exchange, `market-pairs/latest` on Cryptocurrency, and the
batch/trending/discovery DEX token endpoints (`tokens/trending/list`,
`tokens/batch-query`, `token/price/batch`, `new/list`, `meme/list`,
`gainer-loser/list`) — all of these require a paid tier (Startup/Builder or
above).
