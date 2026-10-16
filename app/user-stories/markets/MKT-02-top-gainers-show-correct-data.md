# MKT-02: Top gainers show correct data

**As a** user
**I want** to see the coins that rose the most in the last 24 hours
**so that** I can spot the strongest movers without sorting the list myself.

## Acceptance criteria

- The Markets page shows a "Top gainers 24h" section. `AC-1`
- It lists up to 5 coins from the snapshot with a 24h change above 0, highest change first. `AC-2`
- Coins with an equal 24h change are ordered by rank, best rank first. `AC-3`
- Fewer than 5 coins are listed when fewer than 5 coins rose. `AC-4`
- When no coin rose, the section shows "None right now." instead of a list. `AC-5`
- Each entry shows the coin's logo, name and 24h change in percent change format, shown as up. `AC-6`
- Selecting an entry opens that coin's details (COIN-01). `AC-7`
- The section covers the whole snapshot and doesn't change when the coin list is searched, filtered, sorted or paged. `AC-8`
