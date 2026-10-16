# CNV-02: Conversion direction can be swapped

**As a** user
**I want** to swap the From and To currencies in one step
**so that** I can convert in the opposite direction without reselecting both.

## Acceptance criteria

- The Converter page has a "⇅ Swap" action. `AC-1`
- Swapping puts the current To currency in From and the current From currency in To. `AC-2`
- Swapping keeps the Amount unchanged. `AC-3`
- The result updates at once to the new direction (e.g. "1 BTC = 82,074.63 USD" becomes "1 USD = 0.000012184033 BTC"). `AC-4`
- Swapping twice restores the original direction. `AC-5`
- Swapping while the Amount is invalid swaps the currencies and keeps the error (CNV-01/AC-10). `AC-6`
