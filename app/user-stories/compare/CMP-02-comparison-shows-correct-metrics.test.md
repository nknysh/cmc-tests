<!-- suite
tags: compare, CMP-02
-->

# CMP-02: Comparison shows correct metrics

Covers [CMP-02](CMP-02-comparison-shows-correct-metrics.md): both coins in the comparison show the same metrics in the same formats.

Preconditions for all tests:

- The app runs at the Playwright `baseURL`. Paths below are relative to it.
- Every test serves the committed fixture `app/public/data/latest.json` (taken 2026-10-15T15:12 UTC, 100 coins) by routing `**/data/latest.json` to that file with `page.route`, so results don't depend on the snapshot the app is deployed with.
- Tests with a "Stubbed snapshot" precondition route `**/data/latest.json` to a modified copy of the fixture instead, built exactly as the test describes. Every price in a stub stays above 0, so APP-06 doesn't reject it.

Conventions:

- "The comparison table" is the table named "Coin comparison". "The Price row shows V for C" means the cell in the row headed Price, under the column headed C, has exactly the text V.
- "In the up state" means that cell has the CSS class `up`; likewise `down` and `flat`.

Formats (from the README glossary):

```
Price format           $82,074.63 for $1 or more (up to 2 decimals); 4 significant digits below $1 ($0.999, $0.000004099)
Compact USD            $1.65T, $41.83B, $541.8M (up to 2 decimals, trailing zeros dropped)
Percent change format  sign and 2 decimals: +1.49%, -0.27%, 0.00%
                       the sign and state come from the unrounded value:
                       > 0 -> up, < 0 -> down, exactly 0 -> flat (so +0.0049% reads +0.00% and is up, -0.0033% reads -0.00% and is down)
Supply                 whole number rounded to the nearest unit, with thousands separators, no symbol: 20,098,671
```

Fixture values used below:

| Metric | Bitcoin | Ethereum | Tether USDt |
| --- | --- | --- | --- |
| Rank | #1 | #2 | #3 |
| Price | $82,074.63 | $2,417.21 | $0.999 |
| Market cap | $1.65T | $295.23B | $183.86B |
| Volume (24h) | $41.83B | $18.63B | $87.57B |
| 1h change | +1.49% | +1.90% | +0.02% |
| 24h change | +0.48% | -0.22% | +0.00% |
| 7d change | -0.27% | -3.83% | -0.03% |
| 30d change | +8.00% | +0.21% | -0.04% |
| Circulating supply | 20,098,671 | 122,136,580 | 184,045,984,069 |
| Max supply | 21,000,000 | ∞ | ∞ |

| Coin (slug) | Rank | Value used | Raw value |
| --- | --- | --- | --- |
| Pepe (`pepe`) | 50 | Price `$0.000004099`, Market cap `$1.7B`, Volume (24h) `$297.73M` | price 0.0000040990829… |
| TRON (`tron`) | 8 | Price `$0.3302`, Volume (24h) `$541.8M` | volume 541,801,823.65 |
| PayPal USD (`paypal-usd`) | 34 | 1h change `-0.00%` | -0.00334884 |
| BNB (`bnb`) | 4 | Circulating supply and Max supply `133,158,496` | both 133,158,495.63 |

<!-- test
labels: Severity: critical
-->

# Comparison lists the ten metrics in the specified order

Covers AC-1.

## Steps

- Open `/#/compare`
  *Expected*: The comparison table body has exactly 10 rows
  *Expected*: The row headers read, top to bottom: Rank, Price, Market cap, Volume (24h), 1h change, 24h change, 7d change, 30d change, Circulating supply, Max supply
  *Expected*: Every row has a non-empty cell under both the Bitcoin and the Ethereum column

<!-- test
labels: Severity: normal
-->

# Rank shows as a hash sign followed by the rank number

Covers AC-2.

## Steps

- Open `/#/compare?a=bnb&b=tether`
  *Expected*: The Rank row shows `#4` for BNB
  *Expected*: The Rank row shows `#3` for Tether USDt

<!-- test
labels: Severity: critical
-->

# Price of one dollar or more shows in price format

Covers AC-3 for prices of $1 or more.

## Steps

- Open `/#/compare`
  *Expected*: The Price row shows `$82,074.63` for Bitcoin
  *Expected*: The Price row shows `$2,417.21` for Ethereum

<!-- test
labels: Severity: normal
-->

# Price below one dollar shows four significant digits

Covers AC-3 for prices below $1. The fixture price of Tether USDt is 0.99897674…, which rounds to 4 significant digits as `$0.999` (trailing zero dropped).

## Steps

- Open `/#/compare?a=tether&b=bitcoin`
  *Expected*: The Price row shows `$0.999` for Tether USDt
  *Expected*: The Price row shows `$82,074.63` for Bitcoin

<!-- test
labels: Severity: normal
-->

# Price below one cent keeps four significant digits after the leading zeros

Covers AC-3 for very small prices: the 4 significant digits start after the leading zeros, so the price isn't shown as `$0.00`. The fixture price of Pepe is 0.0000040990829….

## Steps

- Open `/#/compare?a=pepe&b=tron`
  *Expected*: The Price row shows `$0.000004099` for Pepe
  *Expected*: The Price row shows `$0.3302` for TRON

<!-- test
labels: Severity: normal
-->

# Market cap and 24h volume show in compact USD

Covers AC-3 for Market cap and Volume (24h) in trillions and billions.

## Steps

- Open `/#/compare`
  *Expected*: The Market cap row shows `$1.65T` for Bitcoin
  *Expected*: The Market cap row shows `$295.23B` for Ethereum
  *Expected*: The Volume (24h) row shows `$41.83B` for Bitcoin
  *Expected*: The Volume (24h) row shows `$18.63B` for Ethereum

<!-- test
labels: Severity: normal
-->

# Values below one billion show in millions in compact USD

Covers AC-3 for compact USD below $1B, and for a trailing zero being dropped (`$1.7B`, not `$1.70B`).

## Steps

- Open `/#/compare?a=pepe&b=tron`
  *Expected*: The Volume (24h) row shows `$297.73M` for Pepe
  *Expected*: The Volume (24h) row shows `$541.8M` for TRON
  *Expected*: The Market cap row shows `$1.7B` for Pepe

<!-- test
labels: Severity: normal
-->

# Positive change shows a plus sign and the up state

Covers AC-4 for positive changes, including Tether's 24h change of +0.0049%, which rounds to `+0.00%` but is still positive.

## Steps

- Open `/#/compare?a=bitcoin&b=tether`
  *Expected*: The 1h change row shows `+1.49%` for Bitcoin in the up state
  *Expected*: The 30d change row shows `+8.00%` for Bitcoin in the up state
  *Expected*: The 24h change row shows `+0.00%` for Tether USDt in the up state

<!-- test
labels: Severity: normal
-->

# Negative change shows a minus sign and the down state

Covers AC-4 for negative changes.

## Steps

- Open `/#/compare`
  *Expected*: The 7d change row shows `-0.27%` for Bitcoin in the down state
  *Expected*: The 24h change row shows `-0.22%` for Ethereum in the down state
  *Expected*: The 7d change row shows `-3.83%` for Ethereum in the down state

<!-- test
labels: Severity: minor
-->

# Negative change that rounds to zero shows -0.00% and the down state

Covers AC-4 for a negative change smaller than 0.005%: the sign and state come from the unrounded value. The fixture 1h change of PayPal USD is -0.00334884%.

## Steps

- Open `/#/compare?a=paypal-usd&b=bitcoin`
  *Expected*: The 1h change row shows `-0.00%` for PayPal USD
  *Expected*: That cell is in the down state

<!-- test
labels: Severity: minor
-->

# Exactly zero change shows 0.00% and the flat state

Covers AC-4 for zero. Only an exact 0 is flat, so this needs a stubbed value.

Preconditions:

- Stubbed snapshot: the fixture with Bitcoin's `percentChange1h` set to `0`.

## Steps

- Open `/#/compare`
  *Expected*: The 1h change row shows `0.00%` for Bitcoin, with no `+` or `-` sign
  *Expected*: That cell is in the flat state
  *Expected*: The 1h change row shows `+1.90%` for Ethereum in the up state

<!-- test
labels: Severity: normal
-->

# Supplies show rounded whole numbers with thousands separators and no symbol

Covers AC-5. BNB's supplies are 133,158,495.63 in the fixture, so they also show that the value is rounded, not cut off. The coin details page shows supplies with the symbol, so this formatting is specific to the comparison.

## Steps

- Open `/#/compare?a=bitcoin&b=bnb`
  *Expected*: The Circulating supply row shows `20,098,671` for Bitcoin
  *Expected*: The Max supply row shows `21,000,000` for Bitcoin
  *Expected*: The Circulating supply row shows `133,158,496` for BNB
  *Expected*: The Max supply row shows `133,158,496` for BNB
  *Expected*: None of these four cells contains "BTC", "BNB" or "."

<!-- test
labels: Severity: normal
-->

# Coin without a max supply shows Max supply as infinity

Covers AC-6.

## Steps

- Open `/#/compare`
  *Expected*: The Max supply row shows `∞` for Ethereum
  *Expected*: The Max supply row shows `21,000,000` for Bitcoin

<!-- test
labels: Severity: critical
-->

# Every Bitcoin value in the comparison matches the Bitcoin details page

Covers AC-7 for a coin with a price above $1 and a max supply. The details page (COIN-01, COIN-03) is the reference. On it, rank is the "Rank #N" badge, price is the `coin-price` element, changes are the items of the "Price change" list, and the other figures are the Statistics entries. It shows supplies followed by the coin symbol.

## Steps

- Open `/#/compare?a=bitcoin&b=tether`
  *Expected*: The left coin column is headed "Bitcoin"
- Read the 10 cells in the Bitcoin column, with the state of the four change cells
  *Expected*: There are 10 non-empty values
- Open `/#/coin/bitcoin`
  *Expected*: The level-1 heading starts with "Bitcoin"
  *Expected*: The rank badge reads "Rank " followed by the Rank value
  *Expected*: The price equals the Price value
  *Expected*: Market cap and Volume (24h) equal their values
  *Expected*: The 1h, 24h, 7d and 30d changes equal their values, in the same up/down/flat state
  *Expected*: Circulating supply and Max supply equal their values followed by " BTC"

<!-- test
labels: Severity: critical
-->

# Every Tether USDt value in the comparison matches the Tether USDt details page

Covers AC-7 for a coin with a price below $1 and no max supply, using the same reference as the Bitcoin test.

## Steps

- Open `/#/compare?a=bitcoin&b=tether`
  *Expected*: The right coin column is headed "Tether USDt"
- Read the 10 cells in the Tether USDt column, with the state of the four change cells
  *Expected*: There are 10 non-empty values
- Open `/#/coin/tether`
  *Expected*: The level-1 heading starts with "Tether USDt"
  *Expected*: The rank badge reads "Rank " followed by the Rank value
  *Expected*: The price equals the Price value
  *Expected*: Market cap and Volume (24h) equal their values
  *Expected*: The 1h, 24h, 7d and 30d changes equal their values, in the same up/down/flat state
  *Expected*: Circulating supply equals its value followed by " USDT"
  *Expected*: Max supply is `∞` on both pages
