# MKT-09: Coins can be filtered by market cap range

**As a** user
**I want** to limit the coin list to a market cap range
**so that** I can focus on large, mid or small coins.

## Acceptance criteria

- The Markets page has a "Market cap (billions USD)" filter with a Min and a Max value, both empty by default. `AC-1`
- Values are entered in billions of USD and may be decimal (e.g. `0.5` = $500M). `AC-2`
- With only Min set, the list shows coins with a market cap of at least Min. `AC-3`
- With only Max set, the list shows coins with a market cap of at most Max. `AC-4`
- With both set, the list shows coins with a market cap between Min and Max, both inclusive. `AC-5`
- A Min or Max that isn't a number, or is below 0, shows "Enter a market cap of 0 or more, in billions." `AC-6`
- A Min greater than Max shows "Min market cap must not exceed max." `AC-7`
- While the range is invalid, both values are marked invalid, the market cap filter isn't applied, and the other filters still are. `AC-8`
- Clearing a value removes that bound. `AC-9`
- The range combines with every other filter, and changing either value returns the list to page 1. `AC-10`
- Min and Max are part of the shareable view (MKT-15), exactly as typed, including invalid values. `AC-11`
- A decimal comma (e.g. `1,5`) isn't a number and shows the AC-6 message; leading and trailing spaces are ignored. `AC-12`

## Open questions

- Min and Max are free text, so any form JavaScript reads as a number is accepted: `1e3` means 1,000 billion and `0x10` means 16 billion. Should only plain decimals be accepted?
- Users whose locale writes decimals with a comma get the AC-6 error for `1,5`. Should a decimal comma be accepted?
