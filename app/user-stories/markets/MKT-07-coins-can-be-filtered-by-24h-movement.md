# MKT-07: Coins can be filtered by 24h movement

**As a** user
**I want** to limit the coin list to coins that went up or down in the last 24 hours
**so that** I can focus on the winners or the losers.

## Acceptance criteria

- The Markets page offers a "24h movement" choice with three mutually exclusive options: All, Gainers, Losers. `AC-1`
- All is selected by default and shows coins regardless of their 24h change. `AC-2`
- Gainers shows only coins with a 24h change above 0. `AC-3`
- Losers shows only coins with a 24h change below 0. `AC-4`
- Coins with a 24h change of exactly 0% appear only under All. `AC-5`
- The movement filter combines with every other filter, and changing it returns the list to page 1. `AC-6`
- The movement choice is part of the shareable view (MKT-15). `AC-7`
