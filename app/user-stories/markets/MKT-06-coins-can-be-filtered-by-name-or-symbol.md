# MKT-06: Coins can be filtered by name or symbol

**As a** user
**I want** to search the coin list by name or symbol
**so that** I can find a specific coin without scrolling through the list.

## Acceptance criteria

- The Markets page has a search field labelled "Search", with the hint "Name or symbol". `AC-1`
- The list shows only coins whose name or symbol contains the search text, ignoring letter case (e.g. "eth" matches Ethereum and ETH). `AC-2`
- Leading and trailing spaces in the search text are ignored; search text of only spaces doesn't filter. `AC-3`
- The list updates 250 ms after the user stops typing, not on every keystroke. `AC-4`
- Clearing the search text shows all coins again (subject to the other filters). `AC-5`
- Search combines with every other filter: a coin must match all of them to be listed. `AC-6`
- Changing the search returns the list to page 1. `AC-7`
- When no coin matches, the list shows the empty state (MKT-12/AC-5). `AC-8`
- The search text is part of the shareable view (MKT-15). `AC-9`
