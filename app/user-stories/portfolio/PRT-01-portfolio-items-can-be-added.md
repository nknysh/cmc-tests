# PRT-01: Portfolio items can be added

**As a** user
**I want** to record how much of a coin I hold
**so that** I can track what my holdings are worth.

## Acceptance criteria

- The Portfolio page has an "Add holding" form with a Coin choice and an Amount. `AC-1`
- Coin offers every snapshot coin as "<name> (<symbol>)" in rank order, with the top-ranked coin chosen by default; US dollars aren't offered. `AC-2`
- Amount is empty by default. `AC-3`
- "Add holding" with an Amount greater than 0 adds the holding to the portfolio. `AC-4`
- Amounts may be decimal (e.g. `0.25`). `AC-5`
- Adding a coin that's already a holding adds the Amount to that holding's amount; the portfolio keeps one holding per coin. `AC-6`
- A new holding appears after existing holdings, in the order added. `AC-7`
- After a successful add, Amount is cleared, the chosen coin stays chosen, and any error is cleared. `AC-8`
- "Add holding" with an empty Amount, 0, or a negative Amount adds nothing, shows "Enter an amount greater than 0." and marks Amount as invalid. `AC-9`
- The portfolio is kept on this device and survives a page reload; if storage is unavailable, it works until the reload. `AC-10`
- With no holdings, the page shows "No holdings yet. Add one above." and no total or holdings list. `AC-11`
