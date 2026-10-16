# APP-03: Market data load failure can be retried

**As a** user
**I want** clear feedback while market data loads, and a way to retry if it fails
**so that** I'm never left on a blank page.

## Acceptance criteria

- While market data loads, every section shows a loading placeholder announced as "Loading market data". `AC-1`
- If loading fails, every section shows "Couldn't load market data", the reason (e.g. "404 Not Found"), and a "Retry" action. `AC-2`
- "Retry" shows the loading placeholder again and reloads the data; on success the requested section is shown. `AC-3`
- A failed retry shows the AC-2 message again. `AC-4`
- The main navigation, the theme switch and the footer stay available while loading and after a failure. `AC-5`
- Market data is loaded once per visit and shared by every section; moving between sections doesn't reload it. `AC-6`
- Data that loads but is corrupt counts as a failure and shows the AC-2 message, never a blank page: a file that isn't valid JSON, or valid JSON that isn't a market snapshot (e.g. no coin list, or fields of the wrong type). `AC-7`

## Known gaps

- AC-7: a file that isn't valid JSON is handled, but valid JSON that isn't a market snapshot leaves the page blank.
