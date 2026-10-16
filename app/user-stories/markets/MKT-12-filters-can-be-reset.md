# MKT-12: Filters can be reset

**As a** user
**I want** to clear every filter at once
**so that** I can get back to the full coin list without undoing each filter.

## Acceptance criteria

- The Markets page has a "Reset filters" action. `AC-1`
- It's available when any filter differs from its default: search text, 24h movement, tags, market cap Min or Max (even if invalid), or Watchlist only; otherwise it's unavailable. `AC-2`
- Resetting clears the search, sets 24h movement to All, deselects all tags, empties market cap Min and Max, turns Watchlist only off, and returns the list to page 1. `AC-3`
- Resetting keeps the current sort, rows per page and column configuration. `AC-4`
- When no coin matches the filters, the list is replaced by an empty state with a message (MKT-11/AC-3, else "No coins match your filters.") and its own "Reset filters" action, which behaves as AC-3. `AC-5`
