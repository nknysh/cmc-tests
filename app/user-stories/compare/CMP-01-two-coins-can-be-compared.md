# CMP-01: Two coins can be compared

**As a** user
**I want** to choose two coins and see them side by side
**so that** I can weigh one against the other.

## Acceptance criteria

- The Compare page is titled "Compare coins" and has a "First coin" and a "Second coin" choice. `AC-1`
- Both choices offer every snapshot coin as "<name> (<symbol>)" in rank order; US dollars aren't offered. `AC-2`
- On opening the page without a chosen pair, First coin is the top-ranked snapshot coin and Second coin the second-ranked, whichever coins those are. `AC-3`
- Choosing a coin updates the comparison at once, with no submit step. `AC-4`
- The comparison has a column per coin, headed by the coin's name, First coin on the left. `AC-5`
- Choosing the same coin for both shows "Pick two different coins to compare." instead of the comparison. `AC-6`
- When either chosen coin isn't in the snapshot (e.g. from an old link, CMP-03), the page shows "One of these coins isn't in the current data. Pick another." instead of the comparison. `AC-7`
- When both AC-6 and AC-7 apply (the same missing coin chosen twice), the AC-7 message is shown. `AC-8`

## Open questions

- In the AC-7 case, the choice for the missing coin can't show it, so it appears to show another coin. Should the page fall back to a default coin instead of the error?

## Known gaps

- AC-3: the defaults are fixed to Bitcoin and Ethereum.
