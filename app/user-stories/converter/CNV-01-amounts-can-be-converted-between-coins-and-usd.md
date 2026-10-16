# CNV-01: Amounts can be converted between coins and USD

**As a** user
**I want** to convert an amount of one coin into another coin or US dollars
**so that** I know what my coins are worth in other terms.

## Acceptance criteria

- The Converter page has an Amount, a From currency and a To currency. `AC-1`
- On opening the page, Amount is `1`, From is the top-ranked snapshot coin and To is US Dollar (USD). `AC-2`
- From and To each offer US Dollar (USD) first, then every snapshot coin as "<name> (<symbol>)" in rank order. `AC-3`
- The result reads "<amount> <from symbol> = <converted amount> <to symbol>", e.g. "1 BTC = 82,074.63 USD". `AC-4`
- The converted amount is Amount × From's USD price ÷ To's USD price, with USD's price being 1. `AC-5`
- Both amounts in the result show up to 8 significant digits, with thousands separators. `AC-6`
- The result updates as soon as Amount, From or To changes, with no submit step. `AC-7`
- From and To may be the same currency; the result is then equal to Amount. `AC-8`
- An Amount of 0 is valid and converts to 0. `AC-9`
- An empty or negative Amount shows "Enter an amount of 0 or more.", marks Amount as invalid, and shows the result as "—". `AC-10`
- Amount, From and To aren't kept: leaving the page and coming back restores the defaults (AC-2). `AC-11`

## Open questions

- Is there an upper limit or precision limit for Amount? Very large or very small amounts are shown with 8 significant digits (AC-6), but no AC says what the user should expect beyond that.

## Known gaps

- AC-2: From defaults to Bitcoin, not the top-ranked coin.
