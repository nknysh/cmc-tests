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
- A coin that isn't in the snapshot (e.g. named by an old link, CMP-03) is never shown or compared. Its choice falls back to that choice's default from AC-3: the top-ranked coin for First coin, the second-ranked for Second coin. No error is shown, so the choices always show the coins being compared. `AC-7`
- When the AC-7 fallback gives the same coin as the other choice (e.g. a missing First coin next to the top-ranked coin), AC-6 applies. `AC-8`
