# COIN-01: Coin details show price and changes

**As a** user
**I want** a page for each coin with its current price and recent changes
**so that** I can study one coin in detail.

## Acceptance criteria

- Each coin in the snapshot has a details page, reached from the coin list, the top movers and the portfolio. `AC-1`
- The page shows the coin's logo, name, symbol and "Rank #N". `AC-2`
- It shows the current price in price format. `AC-3`
- It shows the price change over 1h, 24h, 7d and 30d, each in percent change format and shown as up, down or flat by its sign. `AC-4`
- It has a watchlist toggle that behaves as MKT-10. `AC-5`
- "← All coins" returns to the Markets page. `AC-6`
- The page address identifies the coin by its slug (e.g. `#/coin/bitcoin`), so it can be bookmarked or shared. `AC-7`

## Open questions

- "← All coins" opens the default Markets view, not the filtered view the user came from. Should it restore the previous view?
