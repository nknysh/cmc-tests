# CNV-01: Amounts can be converted between coins and USD

**As a** user
**I want** to convert an amount of one coin into another coin or US dollars
**so that** I know what my coins are worth in other terms.

## Acceptance criteria

- The Converter page has an Amount, a From currency and a To currency. `AC-1`
- On opening the page, Amount is `1`, From is the top-ranked snapshot coin and To is US Dollar (USD). `AC-2`
- From and To each offer US Dollar (USD) first, then every snapshot coin as "<name> (<symbol>)" in rank order. `AC-3`
- The result reads "<amount> <from symbol> = <converted amount> <to symbol>", e.g. "1 BTC = 82,074.628 USD". `AC-4`
- The converted amount is Amount × From's USD price ÷ To's USD price, with USD's price being 1. `AC-5`
- Both amounts in the result, including the repeated Amount, show up to 8 significant digits with thousands separators, in plain digits however large or small (e.g. an Amount of `123456789` reads "123,456,790 BTC"). `AC-6`
- The result updates as soon as Amount, From or To changes, with no submit step. `AC-7`
- From and To may be the same currency; the result is then equal to Amount. `AC-8`
- An Amount of 0 is valid and converts to 0. `AC-9`
- An empty Amount shows "Enter an amount of 0 or more.", marks Amount as invalid, and shows the result as "—". The error clears as soon as Amount is valid again. `AC-10`
- Amount, From and To aren't kept: leaving the page and coming back restores the defaults (AC-2). `AC-11`
- Amount accepts only digits and at most one decimal point. Any other typed character (such as `-`, `+`, `e` or `,`) is ignored. Pasted text containing anything else leaves Amount unchanged. Negative amounts and scientific notation therefore can't be entered. `AC-12`
- An Amount above 1,000,000,000 shows "Enter an amount up to 1,000,000,000.", marks Amount as invalid, and shows the result as "—". `AC-13`
- An incomplete Amount (a lone `.`, or one ending in `.` such as `2.`) shows the result as "—" while the user types. The AC-10 error appears only once focus leaves Amount. `AC-14`
- A currency that isn't in the snapshot is never shown or converted. It falls back to that side's default from AC-2: the top-ranked coin for From, US Dollar (USD) for To. No error is shown, so From and To always show the currencies being converted. `AC-15`
- At a viewport width of 640 px or less, the result fits within the page: a long result wraps, and the page doesn't scroll sideways. `AC-16`
- Amount, From and To can be used from the keyboard. Screen readers announce each change of the result, and the Amount error when it appears. `AC-17`
- Pressing Enter in Amount doesn't reload or leave the page. `AC-18`
