# COIN-03: Coin statistics show market and supply data

**As a** user
**I want** to see a coin's market and supply figures
**so that** I can judge its size and how much of it is still to be issued.

## Acceptance criteria

- The coin's details page has a "Statistics" section with: Market cap, Volume (24h), Market dominance, Circulating supply, Total supply, Max supply. `AC-1`
- Market cap and Volume (24h) use compact USD. `AC-2`
- Market dominance shows 2 decimals and a percent sign (e.g. `56.31%`). `AC-3`
- Circulating, total and max supply show whole numbers with thousands separators followed by the coin's symbol (e.g. `20,098,671 BTC`). `AC-4`
- A coin with no max supply shows Max supply as `∞` and the text "No max supply". `AC-5`
- A coin with a max supply shows the share of max supply in circulation, as a progress indicator and as "X.X% of max supply in circulation" (1 decimal). `AC-6`
- The share is capped at 100% when circulating supply exceeds max supply. `AC-7`
