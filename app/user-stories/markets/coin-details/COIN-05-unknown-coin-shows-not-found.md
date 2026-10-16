# COIN-05: Unknown coin shows not found

**As a** user who opened a coin link
**I want** to be told clearly when that coin isn't available
**so that** I don't mistake a missing coin for a broken app.

## Acceptance criteria

- Opening a coin details address whose slug matches no coin in the snapshot shows "Coin not found". `AC-1`
- The page explains: "No coin with the slug “<slug>” is in the current top N.", N being the number of coins in the snapshot. `AC-2`
- A "Back to all coins" link opens the Markets page. `AC-3`
- This covers a coin that was in an earlier snapshot but has dropped out of the current one. `AC-4`
