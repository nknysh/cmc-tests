# MKT-05: Coins can be sorted

**As a** user
**I want** to sort the coin list by any of its columns
**so that** I can find the coins that lead or trail on the metric I care about.

## Acceptance criteria

- The coin list can be sorted by any visible column: #, Name, Price, 1h %, 24h %, 7d %, Market cap, Volume (24h). `AC-1`
- The default sort is by rank, ascending. `AC-2`
- Choosing a column that isn't the current sort column sorts by it in its default direction: ascending for # and Name (Name A→Z), descending (largest first) for every numeric column. `AC-3`
- Choosing the current sort column again reverses the direction. `AC-4`
- Name sorting is alphabetical in English collation, ignoring letter case. `AC-5`
- Coins with equal values in the sort column are ordered by rank, best rank first, in both directions. `AC-6`
- The current sort column shows its direction (▲ ascending, ▼ descending), and assistive technology announces it as sorted ascending or descending; other columns are announced as not sorted. `AC-7`
- Sorting applies to all matching coins before paging, and changing the sort returns the list to page 1. `AC-8`
- Sorting keeps the current search and filters. `AC-9`
- The sort is part of the shareable view (MKT-15). `AC-10`
