# APP-01: Sections can be reached from the main navigation

**As a** user
**I want** a main navigation on every page
**so that** I can move between the app's sections from anywhere.

## Acceptance criteria

- Every page shows a "Main" navigation with Markets, Converter, Compare and Portfolio, in this order. `AC-1`
- Each item opens its section: Markets the coin list, Converter, Compare and Portfolio their pages. `AC-2`
- The "CoinBoard" name in the header opens the Markets page. `AC-3`
- The item for the section being shown is marked as the current page; no other item is. `AC-4`
- On a coin's details page and on a not-found page, no item is marked as current. `AC-5`
- Every page shows the footer "Data from CoinMarketCap, refreshed daily. Not financial advice.", with "CoinMarketCap" linking to https://coinmarketcap.com/api/. `AC-6`
- Each section has its own address, so reloading a page keeps the user in the same section. `AC-7`

## Open questions

- Should Markets be marked as current on a coin's details page, since that's where coin details belong?
