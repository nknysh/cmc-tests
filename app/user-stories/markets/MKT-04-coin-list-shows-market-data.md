# MKT-04: Coin list shows market data

**As a** user
**I want** to see every coin in the snapshot with its key market data
**so that** I can compare coins by price, change and size.

## Acceptance criteria

- The Markets page is titled "Cryptocurrency prices by market cap". `AC-1`
- By default the coin list shows the snapshot's coins in rank order, best rank first. `AC-2`
- Each row shows, in this order: watchlist toggle, rank (`#`), Name, Price, 1h %, 24h %, 7d %, Market cap, Volume (24h). `AC-3`
- Name shows the coin's logo, name and symbol, and selecting it opens that coin's details (COIN-01). `AC-4`
- Price uses price format; 1h %, 24h % and 7d % use percent change format, each shown as up, down or flat by its sign; Market cap and Volume (24h) use compact USD. `AC-5`
- A count above the list shows how many coins match the current filters across all pages: "1 coin" for one, "N coins" otherwise (including "0 coins"). `AC-6`
- When no coin matches the current filters, the list is replaced by an empty state (MKT-12/AC-5). `AC-7`
