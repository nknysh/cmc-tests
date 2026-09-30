# CoinMarketCap API Endpoints

Compiled from the [CoinMarketCap Pro API reference](https://coinmarketcap.com/api/documentation/pro-api-reference/endpoint-overview) (2026-09-30). Base URL for all endpoints below: `https://pro-api.coinmarketcap.com`.

CoinMarketCap groups its ~90 endpoints into three families: **Market Data** (prices, listings, exchanges, indices, community/content), **DEX Data** (on-chain token/pair data), and **Utilities** (fiat map, key info, conversion tools). Everything below is `GET` unless noted otherwise.

## Market Data

### Cryptocurrency

| Path | Name | Description |
|---|---|---|
| `/v1/cryptocurrency/map` | Cryptocurrency ID Map | Mapping of all cryptocurrencies to unique CoinMarketCap IDs |
| `/v3/cryptocurrency/listings/latest` | Listings Latest | Paginated list of active cryptocurrencies with current market data |
| `/v1/cryptocurrency/listings/new` | Listings New | Most recently added cryptocurrencies |
| `/v1/cryptocurrency/listings/historical` | Listings Historical | Ranked cryptocurrency list for a specific historical UTC date |
| `/v3/cryptocurrency/quotes/latest` | Quotes Latest | Latest market quote for one or more cryptocurrencies |
| `/v3/cryptocurrency/quotes/historical` | Quotes Historical | Historic market quotes over time intervals |
| `/v2/cryptocurrency/ohlcv/latest` | OHLCV Latest | Latest OHLCV values for the current UTC day |
| `/v2/cryptocurrency/ohlcv/historical` | OHLCV Historical | Historical OHLCV data (daily/hourly) |
| `/v2/cryptocurrency/market-pairs/latest` | Market Pairs Latest | Active market pairs trading a given cryptocurrency |
| `/v2/cryptocurrency/price-performance-stats/latest` | Price Performance Stats | Price performance stats including ATH/ATL |
| `/v2/cryptocurrency/info` | Metadata | Static metadata (logo, description, social links) |
| `/v1/cryptocurrency/trending/latest` | Trending Latest | Trending cryptocurrencies by search volume |
| `/v1/cryptocurrency/trending/gainers-losers` | Trending Gainers & Losers | Cryptocurrencies sorted by largest price gains/losses |
| `/v1/cryptocurrency/trending/most-visited` | Trending Most Visited | Trending cryptocurrencies by detail-page traffic |
| `/v2/simple/price` | Simple Price | Simplified price data for cryptocurrencies |
| `/v1/cryptocurrency/categories` | Categories | List of cryptocurrency categories |
| `/v1/cryptocurrency/category` | Category | Details for a specific category |
| `/v1/cryptocurrency/airdrops` | Airdrops | Paginated list of cryptocurrency airdrops |
| `/v1/cryptocurrency/airdrop` | Airdrop | Details for a specific airdrop |

### Exchange

| Path | Name | Description |
|---|---|---|
| `/v1/exchange/map` | Exchange ID Map | Paginated list of all active exchanges by ID |
| `/v1/exchange/listings/latest` | Listings Latest | Current aggregate market data for all exchanges, ranked |
| `/v1/exchange/quotes/latest` | Quotes Latest | Latest market metrics for one or more exchanges |
| `/v1/exchange/quotes/historical` | Quotes Historical | Historic market data points for exchanges |
| `/v1/exchange/market-pairs/latest` | Market Pairs Latest | Active trading pairs tracked on a given exchange |
| `/v1/exchange/assets` | Exchange Assets | Token holdings from exchange wallets exceeding $100k |
| `/v1/exchange/info` | Metadata | Static metadata (logos, URLs) for one or more exchanges |

### Real World Assets (RWA)

| Path | Name | Description |
|---|---|---|
| `/v5/real-world-assets/map` | RWA ID Map | Mapping of RWA assets to their unique `rwa_id` |
| `/v5/real-world-assets/info` | Metadata | Static info (company details, descriptions) for RWA assets |
| `/v5/real-world-assets/assets/list` | RWA List | Paginated RWA listings with tokenized market quotes/volume |
| `/v5/real-world-assets/market-pairs/list` | Market Pairs | Active trading markets for RWA underlying tokens |
| `/v5/real-world-assets/quotes/latest` | Quotes Latest | Current tokenized prices, caps, and token-level info |
| `/v5/real-world-assets/issuers/list` | Issuers List | Paginated inventory of RWA token issuers |
| `/v5/real-world-assets/issuers` | Issuer | Detail on a single issuer and its linked tokens |

### Derivatives

| Path | Name | Description |
|---|---|---|
| `/v5/exchange/derivatives/list` | List Derivatives Exchanges | Derivatives exchanges tracked, sorted by 24h volume |
| `/v5/exchange/derivatives/market-pairs/list/latest` | Derivative Market Pairs by Exchange | Active derivative pairs on a given exchange |
| `/v5/cryptocurrency/derivatives/market-pairs/list/latest` | Derivative Market Pairs by Cryptocurrency | Active derivative pairs for a given asset across exchanges |
| `/v5/derivatives/liquidations/quotes/latest` | Latest Total Liquidations | Aggregate perpetual/futures liquidation data across time windows |
| `/v5/derivatives/liquidations/exchange/list/latest` | Latest Liquidations by Exchange | Per-exchange liquidations (1h/4h/24h) |
| `/v5/derivatives/liquidations/cryptocurrency/list/latest` | Latest Liquidations by Cryptocurrency | Per-coin liquidation totals across exchanges |

### CMC AI

| Path | Name | Description |
|---|---|---|
| `/v5/cmc-ai/coins/map` | CMC AI Map | Cryptocurrencies for which CMC AI writes Coin Detail Page content |
| `/v5/cmc-ai/latest` | Market Feed Latest | Market-wide CMC AI insights, Q&A, and top news |
| `/v5/cmc-ai/coins/latest` | Coin Insights Latest | CMC AI questions/answers explaining price moves and news for a coin |

### Global Metrics

| Path | Name | Description |
|---|---|---|
| `/v1/global-metrics/quotes/latest` | Quotes Latest | Latest global crypto market metrics, multi-currency |
| `/v1/global-metrics/quotes/historical` | Quotes Historical | Historical global market metrics over intervals |
| `/v3/fear-and-greed/latest` | CMC Crypto Fear and Greed Latest | Latest Fear & Greed index value |
| `/v3/fear-and-greed/historical` | CMC Crypto Fear and Greed Historical | Paginated Fear & Greed values at 12am UTC |
| `/v1/altcoin-season-index/latest` | Altcoin Season Index Latest | Current altcoin season index with annual high/low |
| `/v1/altcoin-season-index/historical` | Altcoin Season Index Historical | Historical altcoin season index (7/30/90-day) |

### Content

| Path | Name | Description |
|---|---|---|
| `/v1/content/latest` | Content Latest | Paginated content from CMC News/Headlines and Alexandria |
| `/v1/content/posts/top` | Content Top Posts | Highest-engagement CMC Community posts |
| `/v1/content/posts/latest` | Content Latest Posts | Most recently published CMC Community posts |
| `/v1/content/posts/comments` | Content Post Comments | Comments on a specific CMC Community post |

### Community

| Path | Name | Description |
|---|---|---|
| `/v1/community/trending/token` | Community Trending Tokens | Latest trending tokens from the CMC Community |
| `/v1/community/trending/topic` | Community Trending Topics | Latest trending topics from the CMC Community |

### CMC Index

| Path | Name | Description |
|---|---|---|
| `/v3/index/cmc100-latest` | CMC 100 Index Latest | Current CMC 100 Index value with constituent details |
| `/v3/index/cmc100-historical` | CMC 100 Index Historical | Historic CMC 100 Index values |
| `/v3/index/cmc20-latest` | CMC 20 Index Latest | Most recent CMC 20 Index value and constituent weights |
| `/v3/index/cmc20-historical` | CMC 20 Index Historical | Historic CMC 20 Index values |

### Others

| Path | Name | Description |
|---|---|---|
| `/v1/blockchain/statistics/latest` | Statistics Latest | Latest blockchain statistics (Bitcoin, Litecoin, Ethereum) |

## DEX Data

On-chain token, pair, liquidity, and platform data across decentralized exchanges (Ethereum, Solana, BNB Chain, and more).

### Token

| Method | Path | Name | Description |
|---|---|---|---|
| GET | `/v1/dex/token` | Get Token Detail | Detailed information for a specific token |
| GET | `/v1/dex/token/price` | Get Token Price | Current price for a specific token |
| POST | `/v1/dex/token/price/batch` | Batch Get Token Prices | Prices for multiple tokens in one request |
| GET | `/v1/dex/token/pools` | Get Token Pools | Liquidity pool information for a token |
| GET | `/v1/dex/token-liquidity/query` | Query Token Liquidity | Liquidity data for specific tokens |
| GET | `/v1/dex/tokens/transactions` | Get Swap List | Token swap/transaction history |
| POST | `/v1/dex/tokens/batch-query` | Batch Query Tokens | Query multiple tokens in one request |
| POST | `/v1/dex/tokens/trending/list` | Get Trending Tokens | List of trending tokens |
| POST | `/v1/dex/new/list` | Get New Tokens | List of newly launched tokens |
| POST | `/v1/dex/meme/list` | Get Meme Tokens | List of meme tokens |
| POST | `/v1/dex/gainer-loser/list` | Get Top Gainers and Losers | Top gainer/loser tokens |
| GET | `/v1/dex/security/detail` | Get Security Detail | Security scan results for a token |
| GET | `/v1/dex/search` | Search Tokens | Search tokens by name or symbol |
| GET | `/v1/dex/liquidity-change/list` | Get Liquidity Change List | Liquidity changes over time |
| GET | `/v4/dex/spot-pairs/latest` | Pairs Listings Latest | Paginated active DEX spot pairs with market data |
| GET | `/v4/dex/pairs/quotes/latest` | Quotes Latest | Latest market quote for one or more spot pairs |

### Platform

| Path | Name | Description |
|---|---|---|
| `/v1/dex/platform/list` | Get Platform List | List of all supported platforms/networks |
| `/v1/dex/platform/detail` | Get Platform Detail | Detailed info about a specific blockchain platform |

### Holder

| Method | Path | Name | Description |
|---|---|---|---|
| POST | `/v1/dex/holders/list` | Get Holders List | Token holder details, filterable by tag category |
| POST | `/v1/dex/holders/detail` | Get Holder Detail | A specific wallet's holdings and trading activity for a token |
| GET | `/v1/dex/holders/trend/list` | Get Holder Trend List | Historical trends of holder distribution metrics |
| GET | `/v1/dex/holders/tag_count` | Get Holder Tag Count | Holder counts by classification tag (whale, bot, smart money, etc.) |
| GET | `/v1/dex/holders/count` | Get Holder Count | Total holder count for a token on a given platform |

### OHLCV

| Path | Name | Description |
|---|---|---|
| `/v1/k-line/points` | Get K-line Points | K-line price points for a token (price, volume, timestamp arrays) |
| `/v1/k-line/candles` | Get K-line Candles | K-line/OHLCV candle data for a token, including trader count |

### Others

Trade-level and blockchain-statistics data for DEX pairs (e.g. individual swap/trade lookups). Overlaps with `Get Swap List` (`/v1/dex/tokens/transactions`) above; the full endpoint list for this category wasn't retrievable from the docs site at time of writing — check the [Others](https://coinmarketcap.com/api/documentation/pro-api-reference/others) reference page directly.

## Utilities (Tools)

| Path | Name | Description |
|---|---|---|
| `/v1/fiat/map` | Fiat ID Map | Mapping of supported fiat currencies to unique CoinMarketCap IDs |
| `/v1/key/info` | Key Info | API key details and usage stats (rate limits, credits) |
| `/v2/tools/price-conversion` | Price Conversion v2 | Convert crypto/fiat amounts using current or historical rates |
| `/v1/tools/postman` | Postman Conversion v1 | Convert the API spec into a Postman collection |

## Notes

- This repo's `CoinMarketCapClient` (`src/clients/coinmarketcap/`) currently only calls `/v2/simple/price` (Simple Price), used to assert live BTC price data — see `tests/api/simple-price.spec.ts` and `tests/api/btc-price.spec.ts`.
- Most endpoints require the `X-CMC_PRO_API_KEY` header; DEX endpoints are namespaced separately from the market-data family and some are `POST` rather than `GET`.
- v2/v3/v4/v5 suffixes reflect independent per-endpoint versioning, not a single global API version.
