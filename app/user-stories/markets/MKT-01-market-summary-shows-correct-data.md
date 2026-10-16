# MKT-01: Market summary shows correct data

**As a** user
**I want** to see headline figures for the whole crypto market on the Markets page
**so that** I can judge the market's state at a glance before looking at single coins.

## Acceptance criteria

- The Markets page shows four summary figures: "Total market cap", "24h volume (top N)", "BTC dominance" and "Gainers / losers (24h)". `AC-1`
- "Total market cap" equals the market cap of the first coin in the snapshot with a market dominance above 0, divided by that coin's dominance as a fraction (dominance % / 100), in compact USD. `AC-2`
- "Total market cap" shows `$0` when no coin in the snapshot has a dominance above 0. `AC-3`
- The volume label's N is the number of coins in the snapshot (e.g. "24h volume (top 100)"), and the value is the sum of those coins' 24h volume, in compact USD. `AC-4`
- "BTC dominance" is Bitcoin's market dominance with 1 decimal and a percent sign (e.g. `56.3%`); it shows `0.0%` when Bitcoin isn't in the snapshot. `AC-5`
- "Gainers / losers (24h)" shows `G / L`, where G counts snapshot coins with a 24h change above 0 and L counts those below 0. Coins at exactly 0% count in neither. `AC-6`
- All figures cover the whole snapshot and don't change when the coin list is searched, filtered, sorted or paged. `AC-7`

## Open questions

- Total market cap is derived, not reported by the data source. Is a rounding gap against CoinMarketCap's published total acceptable, and how large?
