# CNV-02: Conversion direction can be swapped

**As a** user
**I want** to swap the From and To currencies in one step
**so that** I can convert in the opposite direction without reselecting both.

## Acceptance criteria

- The Converter page has a "⇅ Swap" action. `AC-1`
- Swapping puts the current To currency in From and the current From currency in To. `AC-2`
- Swapping keeps the Amount unchanged. `AC-3`
- The result updates at once to the new direction (e.g. "1 BTC = 82,074.628 USD" becomes "1 USD = 0.000012184033 BTC"). `AC-4`
- Swapping twice restores the original direction. `AC-5`
- Swapping while the Amount is invalid swaps the currencies and keeps the error (CNV-01/AC-10, AC-13, AC-14). `AC-6`
- When From and To are the same currency, swapping leaves both currencies and the result unchanged (CNV-01/AC-8). `AC-7`
- A currency that isn't in the snapshot is never shown or converted. It falls back to that side's default (CNV-01/AC-15): the top-ranked coin for From, US Dollar (USD) for To. No error is shown, so From and To always show the currencies being converted, and swapping visibly swaps them. `AC-8`
- Swap can be used from the keyboard (Enter or Space). After swapping, focus stays on Swap. `AC-9`
- Screen readers announce the new result after a swap. `AC-10`
- Each activation is one swap, so a double-click swaps twice and leaves the direction unchanged (AC-5). `AC-11`
- Swapping doesn't change the page address or add a browser history entry. Back after a swap leaves the Converter rather than undoing the swap. `AC-12`
- At a viewport width of 640 px or less, the result fits within the page in either direction (CNV-01/AC-16). `AC-13`
