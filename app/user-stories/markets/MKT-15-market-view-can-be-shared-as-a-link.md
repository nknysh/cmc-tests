# MKT-15: Market view can be shared as a link

**As a** user
**I want** the page address to capture my search, filters, sort and page
**so that** I can bookmark or share exactly the view I'm looking at.

## Acceptance criteria

- The Markets page address reflects the current search, sort column and direction, page, rows per page, 24h movement, selected tags, market cap Min and Max, and Watchlist only. `AC-1`
- Only values that differ from their defaults appear in the address, so the default view's address has no parameters. `AC-2`
- Opening an address with these parameters shows the coin list with that view applied. `AC-3`
- An unrecognised or out-of-range parameter value falls back to its default: an unknown sort column → rank, a direction other than descending → ascending, a page that isn't a positive whole number → 1, rows per page other than 10, 25 or 50 → 25, a movement other than gainers or losers → All. `AC-4`
- Changing the view updates the address without adding browser history entries, so Back leaves the Markets page instead of undoing each change. `AC-5`
- Going back or forward to a Markets address with different parameters shows the view that address describes. `AC-6`
- The column configuration (MKT-13) and the watchlist contents (MKT-10) aren't part of the address. `AC-7`

## Open questions

- An address with a sort column but no direction sorts ascending, even for numeric columns whose default direction is descending (MKT-05/AC-3). Is that intended?
