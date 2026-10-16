# MKT-10: Coins can be added to the watchlist

**As a** user
**I want** to star the coins I follow
**so that** I can find them again quickly.

## Acceptance criteria

- Every coin in the coin list and on its details page has a watchlist toggle. `AC-1`
- For a coin not in the watchlist, the toggle shows ☆ and is announced as "Add <coin name> to watchlist". `AC-2`
- Toggling it adds the coin; the toggle then shows ★, is announced as pressed, and as "Remove <coin name> from watchlist". `AC-3`
- Toggling a starred coin removes it from the watchlist. `AC-4`
- The watchlist is the same everywhere: a coin starred in the coin list shows as starred on its details page, and vice versa. `AC-5`
- The watchlist is kept on this device and survives a page reload. `AC-6`
- If the device's storage is unavailable, starring still works until the page is reloaded. `AC-7`
- An empty watchlist is the default for a first visit. `AC-8`
