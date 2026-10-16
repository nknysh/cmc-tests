# COIN-02: Coin price history can be viewed

**As a** user
**I want** to see a coin's recent price as a chart
**so that** I can see its trend, not just today's price.

## Acceptance criteria

- The coin's details page has a "Price chart" section with a "Chart range" choice of 24h and 7d; 24h is selected on opening the page. `AC-1`
- The chart plots the coin's recorded prices from the selected range before the snapshot time (not before the current time), oldest first. `AC-2`
- With fewer than 2 recorded prices in the range, the chart shows "Not enough price history yet." instead. `AC-3`
- The line shows as up when the last price in the range is greater than or equal to the first, and as down otherwise. `AC-4`
- The chart's text alternative reads "<coin name> price, last <range>: from <first price> to <last price>, low <lowest>, high <highest>", prices in price format. `AC-5`
- Below the chart, "Hover the chart for prices" is shown while the pointer isn't over it. `AC-6`
- With the pointer over the chart, the nearest recorded price is marked and the text below shows "<price> · <Mon D, HH:MM> UTC" (24-hour, UTC, e.g. "$82,074.63 · Oct 15, 15:00 UTC"). `AC-7`
- While price history loads, the section shows "Loading price history…". `AC-8`
- If price history fails to load, the section shows "Couldn't load price history", the error, and a "Retry" action that loads it again; the rest of the page still works. `AC-9`
- Price history loads only when a coin's details page is opened. `AC-10`
- Price history that loads but is corrupt (not valid JSON, or not price history) counts as a failure and shows the AC-9 message. `AC-11`

## Open questions

- History has about one recorded price a day, so the 24h range holds at most two points and often shows "Not enough price history yet." Is that acceptable for the 24h range?
- The chart has no keyboard or touch equivalent of hovering to read a single price. Is one required?

## Known gaps

- AC-11: valid JSON that isn't price history isn't checked; depending on its shape the chart may break instead of showing the AC-9 message.
