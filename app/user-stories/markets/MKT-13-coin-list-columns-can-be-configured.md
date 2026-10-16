# MKT-13: Coin list columns can be configured

**As a** user
**I want** to choose which columns the coin list shows
**so that** I can hide data I don't use and keep the list readable.

## Acceptance criteria

- The Markets page has a "Columns" menu titled "Visible columns". `AC-1`
- The menu lists Price, 1h %, 24h %, 7d %, Market cap and Volume (24h), each visible by default. `AC-2`
- Turning a column off hides it from the coin list; turning it on shows it again in its original position. `AC-3`
- Rank (`#`), Name and the watchlist toggle are always shown and can't be hidden. `AC-4`
- All six configurable columns can be hidden at once. `AC-5`
- The column choice is kept on this device and survives a page reload; if storage is unavailable, it applies until the reload. `AC-6`
- The column choice isn't part of the shareable view (MKT-15) and isn't changed by "Reset filters" (MKT-12). `AC-7`
- Hiding a column doesn't change the CSV export (MKT-16/AC-3). `AC-8`

## Open questions

- If the list is sorted by a column that is then hidden, the sort stays applied but no visible column shows it. Should hiding the sort column reset the sort to rank?
