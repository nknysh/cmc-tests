# PRT-04: Holdings show current value

**As a** user
**I want** each holding to show its price and current value
**so that** I can see what each coin I hold is worth today.

## Acceptance criteria

- Holdings are listed with these columns: Coin, Amount, Price, Value, 24h. `AC-1`
- Coin shows the coin's name; selecting it opens the coin's details (COIN-01). `AC-2`
- Amount shows the held amount with up to 8 significant digits and thousands separators, followed by the coin's symbol. `AC-3`
- Price is the coin's snapshot price in price format; Value is Amount × Price in price format; 24h is the coin's 24h change in percent change format, shown as up, down or flat. `AC-4`
- A holding whose coin isn't in the current snapshot shows "Not in current data" as Coin, the amount without a symbol, "—" for Price and 24h, and `$0` as Value. `AC-5`
- A holding whose coin returns to a later snapshot shows its data again. `AC-6`
