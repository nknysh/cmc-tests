# MKT-14: Coin list can be paged

**As a** user
**I want** to page through the coin list and choose the page size
**so that** I can browse all coins in manageable chunks.

## Acceptance criteria

- The coin list shows 25 rows per page by default. `AC-1`
- "Rows per page" offers 10, 25 and 50. `AC-2`
- The list shows "Page X of Y", where Y is the number of matching coins divided by rows per page, rounded up, and at least 1. `AC-3`
- "Next" shows the following page; it's unavailable on the last page. `AC-4`
- "Previous" shows the preceding page; it's unavailable on page 1. `AC-5`
- Changing rows per page, the sort, the search or any filter returns the list to page 1. `AC-6`
- A page number above the last page (e.g. from a shared link) shows the last page. `AC-7`
- The page number and rows per page are part of the shareable view (MKT-15). `AC-8`
- Paging controls are hidden when no coin matches the filters. `AC-9`
