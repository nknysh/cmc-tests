# CMP-02: Comparison shows correct metrics

**As a** user
**I want** the comparison to show the same metrics for both coins
**so that** I can compare like with like.

## Acceptance criteria

- The comparison shows these metrics, one per row, in this order: Rank, Price, Market cap, Volume (24h), 1h change, 24h change, 7d change, 30d change, Circulating supply, Max supply. `AC-1`
- Rank shows as `#N`. `AC-2`
- Price uses price format; Market cap and Volume (24h) use compact USD. `AC-3`
- 1h, 24h, 7d and 30d change use percent change format, each shown as up, down or flat by its sign. `AC-4`
- Circulating supply and Max supply show whole numbers with thousands separators, without the coin's symbol. `AC-5`
- A coin with no max supply shows Max supply as `∞`. `AC-6`
- Each value matches the same figure on that coin's details page (COIN-01, COIN-03). `AC-7`
