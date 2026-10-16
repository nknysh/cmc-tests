# CoinBoard user stories

User stories reverse-engineered from the current behavior of the CoinBoard app (`app/src`) on 2026-10-16. Each file is one story; its acceptance criteria (AC) are the requirements. AC ids are unique within a story (`AC-1`), so reference one as `<story id>/AC-n`, e.g. `MKT-02/AC-3`.

Where a story states agreed behavior that the app doesn't have yet, its "Known gaps" section lists the affected ACs; tests for those ACs are expected to fail until the app catches up.

Stories are grouped by the app's first-level navigation. Coin details are reached from Markets, so they sit under it. `app-shell/` holds behavior shared by every section (header, data loading, theme, unknown pages).

## Glossary

- **Snapshot**: the latest market data the app has loaded: the top 100 coins by market cap, taken once a day, with the time it was taken. Which coins they are changes over time, so no behavior may depend on a particular coin being among them. A new snapshot with any coin priced at 0 or below is rejected, and the last accepted one stays (APP-06).
- **Coin list**: the main list of coins on the Markets page.
- **Watchlist**: the coins the user has starred on this device.
- **Holding**: one coin and the amount of it the user owns, in the Portfolio.
- **On this device**: kept in the browser's storage. It survives reloads but isn't shared across browsers or devices. With the app open in several tabs, the latest save wins: each save replaces the whole stored value, and a tab doesn't pick up another tab's changes until it's reloaded.
- **Price format**: `$82,074.63` (up to 2 decimals) for prices of $1 or more, 4 significant digits below $1 (`$0.1234`). A value of 0 (e.g. a holding whose coin isn't in the snapshot) shows as `$0`.
- **Compact USD**: `$1.65T`, `$41.83B` (up to 2 decimals).
- **Percent change format**: sign and 2 decimals: `+1.49%`, `-0.27%`, `0.00%`. Positive changes show as up, negative as down, zero as flat. The sign and the up/down/flat state come from the unrounded value, so a change of +0.004% reads `+0.00%` and shows as up, and -0.004% reads `-0.00%` and shows as down; only an exact 0 reads `0.00%` and shows as flat.

## Markets (`markets/`)

| ID | Story |
| --- | --- |
| MKT-01 | [Market summary shows correct data](markets/MKT-01-market-summary-shows-correct-data.md) |
| MKT-02 | [Top gainers show correct data](markets/MKT-02-top-gainers-show-correct-data.md) |
| MKT-03 | [Top losers show correct data](markets/MKT-03-top-losers-show-correct-data.md) |
| MKT-04 | [Coin list shows market data](markets/MKT-04-coin-list-shows-market-data.md) |
| MKT-05 | [Coins can be sorted](markets/MKT-05-coins-can-be-sorted.md) |
| MKT-06 | [Coins can be filtered by name or symbol](markets/MKT-06-coins-can-be-filtered-by-name-or-symbol.md) |
| MKT-07 | [Coins can be filtered by 24h movement](markets/MKT-07-coins-can-be-filtered-by-24h-movement.md) |
| MKT-08 | [Coins can be filtered by tags](markets/MKT-08-coins-can-be-filtered-by-tags.md) |
| MKT-09 | [Coins can be filtered by market cap range](markets/MKT-09-coins-can-be-filtered-by-market-cap-range.md) |
| MKT-10 | [Coins can be added to the watchlist](markets/MKT-10-coins-can-be-added-to-the-watchlist.md) |
| MKT-11 | [Coins can be filtered to the watchlist](markets/MKT-11-coins-can-be-filtered-to-the-watchlist.md) |
| MKT-12 | [Filters can be reset](markets/MKT-12-filters-can-be-reset.md) |
| MKT-13 | [Coin list columns can be configured](markets/MKT-13-coin-list-columns-can-be-configured.md) |
| MKT-14 | [Coin list can be paged](markets/MKT-14-coin-list-can-be-paged.md) |
| MKT-15 | [Market view can be shared as a link](markets/MKT-15-market-view-can-be-shared-as-a-link.md) |
| MKT-16 | [Coins can be exported to CSV](markets/MKT-16-coins-can-be-exported-to-csv.md) |
| MKT-17 | [Coin list is usable on narrow screens](markets/MKT-17-coin-list-is-usable-on-narrow-screens.md) |

### Coin details (`markets/coin-details/`)

| ID | Story |
| --- | --- |
| COIN-01 | [Coin details show price and changes](markets/coin-details/COIN-01-coin-details-show-price-and-changes.md) |
| COIN-02 | [Coin price history can be viewed](markets/coin-details/COIN-02-coin-price-history-can-be-viewed.md) |
| COIN-03 | [Coin statistics show market and supply data](markets/coin-details/COIN-03-coin-statistics-show-market-and-supply-data.md) |
| COIN-04 | [Coin tags can be expanded](markets/coin-details/COIN-04-coin-tags-can-be-expanded.md) |
| COIN-05 | [Unknown coin shows not found](markets/coin-details/COIN-05-unknown-coin-shows-not-found.md) |

## Converter (`converter/`)

| ID | Story |
| --- | --- |
| CNV-01 | [Amounts can be converted between coins and USD](converter/CNV-01-amounts-can-be-converted-between-coins-and-usd.md) |
| CNV-02 | [Conversion direction can be swapped](converter/CNV-02-conversion-direction-can-be-swapped.md) |

## Compare (`compare/`)

| ID | Story |
| --- | --- |
| CMP-01 | [Two coins can be compared](compare/CMP-01-two-coins-can-be-compared.md) |
| CMP-02 | [Comparison shows correct metrics](compare/CMP-02-comparison-shows-correct-metrics.md) |
| CMP-03 | [Comparison can be shared as a link](compare/CMP-03-comparison-can-be-shared-as-a-link.md) |

## Portfolio (`portfolio/`)

| ID | Story |
| --- | --- |
| PRT-01 | [Portfolio items can be added](portfolio/PRT-01-portfolio-items-can-be-added.md) |
| PRT-02 | [Portfolio items can be edited](portfolio/PRT-02-portfolio-items-can-be-edited.md) |
| PRT-03 | [Portfolio items can be removed](portfolio/PRT-03-portfolio-items-can-be-removed.md) |
| PRT-04 | [Holdings show current value](portfolio/PRT-04-holdings-show-current-value.md) |
| PRT-05 | [Portfolio total and 24h change are correct](portfolio/PRT-05-portfolio-total-and-24h-change-are-correct.md) |

## App shell (`app-shell/`)

| ID | Story |
| --- | --- |
| APP-01 | [Sections can be reached from the main navigation](app-shell/APP-01-sections-can-be-reached-from-the-main-navigation.md) |
| APP-02 | [Data freshness is shown](app-shell/APP-02-data-freshness-is-shown.md) |
| APP-03 | [Market data load failure can be retried](app-shell/APP-03-market-data-load-failure-can-be-retried.md) |
| APP-04 | [Theme can be switched](app-shell/APP-04-theme-can-be-switched.md) |
| APP-05 | [Unknown address shows not found](app-shell/APP-05-unknown-address-shows-not-found.md) |
| APP-06 | [Snapshots with invalid prices are rejected](app-shell/APP-06-snapshots-with-invalid-prices-are-rejected.md) |

## Cross-cutting open questions

These affect every story that keeps data "on this device" (APP-04, MKT-10, MKT-13, PRT-01 to PRT-03).

- The app stores four values, as JSON: `coinboard.theme` (`"light"` or `"dark"`), `coinboard.watchlist` (an array of coin ids, e.g. `[1, 1027]`), `coinboard.hiddenColumns` (an array of column keys, e.g. `["volume24h"]`) and `coinboard.portfolio` (an array of holdings, e.g. `[{"coinId": 1, "amount": 0.25}]`). A value that is valid JSON of the wrong shape (e.g. `{}` as the watchlist or portfolio, from a future format change or manual editing) isn't treated as unavailable storage: the page fails to render and is left blank, with no error message (there's no error boundary). Should malformed stored data be discarded and replaced by the default?
- Should `-0.00%` and `+0.00%` (see Percent change format) show as flat, given they read as no change?
