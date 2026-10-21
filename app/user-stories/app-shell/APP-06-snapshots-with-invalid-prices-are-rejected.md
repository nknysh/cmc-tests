# APP-06: Snapshots with invalid prices are rejected

**As a** user
**I want** market data with an impossible price never to reach the app
**so that** I don't see wrong prices, totals or charts.

## Acceptance criteria

- When a new daily snapshot has any coin with a price of 0 or below, the whole snapshot is rejected, not only that coin. `AC-1`
- A rejected snapshot isn't published: the app keeps showing the last accepted snapshot, in every section. `AC-2`
- A rejected snapshot's prices aren't added to price history, so the price chart (COIN-02) doesn't change. `AC-3`
- The header keeps showing the age of the last accepted snapshot (APP-02), so it turns stale after 26 hours if no newer snapshot is accepted (APP-02/AC-3). `AC-4`
- A snapshot whose prices are all above 0, however small, is accepted as usual. `AC-5`
- A rejection is written to the daily update's log; no other alert is raised. `AC-6`
- The app can also load a previous snapshot and its price history, published next to the latest one. The previous snapshot is replaced only after a newer snapshot is confirmed to have every price above 0; until then it is kept as it is. A file that wasn't confirmed (e.g. a manual edit) never becomes the previous snapshot. `AC-7`
- If the published snapshot has a price of 0 or below anyway (e.g. after a manual edit), or is corrupt (APP-03/AC-7), the app loads the previous snapshot and its price history instead, on every visit, so the user sees no update: no page shows the invalid file's data, including the price chart, and the header shows the previous snapshot's age (APP-02). `AC-8`
- When the app falls back to the previous snapshot, it writes this to the browser console. `AC-9`
- If the app would fall back (AC-8) but there is no previous snapshot (e.g. on the first deploy), every page shows that no market data is available, and no coin data, totals or charts are shown. `AC-10`
- If the previous snapshot itself has a price of 0 or below (e.g. it was edited by hand), the app shows it, but each price of 0 or below is shown in red with an indicator that the price isn't valid. Prices above 0 are shown as usual. `AC-11`

## Open questions

- AC-11: values worked out from an invalid price (the market summary totals, a holding's value and the portfolio total, conversions, the price chart): should they also be marked as not valid, left out, or shown as usual?

## Known gaps

None. The snapshot step (`scripts/snapshot-listings.ts`, `.github/workflows/app-deploy.yml`) covers AC-1 to AC-7. The app (`app/src/data/MarketData.tsx`, `app/src/components/Price.tsx`) covers AC-8 to AC-11.
