# MKT-17: Coin list is usable on narrow screens

**As a** user on a phone
**I want** the coin list to fit my screen
**so that** I can read it without scrolling sideways.

## Acceptance criteria

- At a viewport width of 640 px or less, each coin is shown as a compact card instead of a table row. `AC-1`
- Each card shows the coin's logo, `#rank`, name, symbol, price (price format), 24h change (percent change format, shown as up, down or flat) and its watchlist toggle. `AC-2`
- Selecting the coin's name on a card opens its details (COIN-01). `AC-3`
- Cards follow the same search, filters, sort and paging as the table. `AC-4`
- Above 640 px, the table is shown and the cards aren't. `AC-5`

## Open questions

- Cards don't follow the column configuration (MKT-13) and can't be sorted by tapping a header, since they have none. Sorting set elsewhere (e.g. via a link) still applies. Is a sort control needed on narrow screens?
