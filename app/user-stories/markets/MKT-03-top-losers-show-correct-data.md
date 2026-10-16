# MKT-03: Top losers show correct data

**As a** user
**I want** to see the coins that fell the most in the last 24 hours
**so that** I can spot the weakest movers without sorting the list myself.

## Acceptance criteria

- The Markets page shows a "Top losers 24h" section. `AC-1`
- It lists up to 5 coins from the snapshot with a 24h change below 0, the largest fall (most negative change) first. `AC-2`
- Fewer than 5 coins are listed when fewer than 5 coins fell. `AC-3`
- When no coin fell, the section shows "None right now." instead of a list. `AC-4`
- Each entry shows the coin's logo, name and 24h change in percent change format, shown as down. `AC-5`
- Selecting an entry opens that coin's details (COIN-01). `AC-6`
- The section covers the whole snapshot and doesn't change when the coin list is searched, filtered, sorted or paged. `AC-7`

## Open questions

- Coins with an equal 24h change are currently listed with the *worse* rank first (the reverse of top gainers, MKT-02/AC-3). Is that intended, or should ties be ordered best rank first in both sections?
