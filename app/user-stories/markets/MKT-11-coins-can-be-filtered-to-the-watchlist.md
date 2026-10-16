# MKT-11: Coins can be filtered to the watchlist

**As a** user
**I want** to show only the coins on my watchlist
**so that** I can check the coins I follow in one view.

## Acceptance criteria

- The Markets page has a "Watchlist only" option, off by default. `AC-1`
- When on, the list shows only coins on the watchlist (MKT-10). `AC-2`
- When on and the watchlist is empty, the list shows "Your watchlist is empty." instead of the generic empty message. `AC-3`
- When on and the watchlist has coins but none match the other filters, the list shows "No coins match your filters." `AC-4`
- Removing a coin from the watchlist while the option is on removes its row from the list at once. `AC-5`
- The option combines with every other filter, and changing it returns the list to page 1. `AC-6`
- The option is part of the shareable view (MKT-15); a recipient sees their own watchlist, not the sender's. `AC-7`

## Open questions

- Starred coins stay in the watchlist after they drop out of the snapshot, and the watchlist can't show or remove them. If every starred coin has dropped out, "Watchlist only" shows "No coins match your filters." rather than "Your watchlist is empty.", although no other filter is set. Should the message account for this, or should dropped-out coins be shown or pruned?
