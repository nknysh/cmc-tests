# APP-03: Market data load failure can be retried

**As a** user
**I want** clear feedback while market data loads, and a way to retry if it fails
**so that** I'm never left on a blank page.

## Acceptance criteria

- While market data loads, every section shows a loading placeholder announced as "Loading market data". `AC-1`
- If loading fails, every section shows "Couldn't load market data", a reason, and a "Retry" action. The message is announced to assistive technology. The reason is written for users, never a raw technical error (technical details go to the browser console only): `AC-2`
  - the server answered with an error: its status code and standard text, e.g. "404 Not Found", even when the server sends no text with the code (as GitHub Pages doesn't). A code the app has no standard text for is followed by "Error", e.g. "520 Error";
  - the server couldn't be reached: "Network error";
  - the data hasn't fully arrived within 30 seconds of the load starting, counting every file it needs, including the fallback to the previous snapshot (APP-06/AC-8): "The server took too long to respond". The loading placeholder is never shown for longer than that;
  - the data is corrupt and the previous snapshot can't replace it (AC-7): "The market data file is invalid".
- "Retry" shows the loading placeholder again and reloads the data; on success the requested section is shown. `AC-3`
- A failed retry shows the AC-2 message again. `AC-4`
- The main navigation, the theme switch and the footer stay available while loading and after a failure, including a failure caused by corrupt data. `AC-5`
- Market data is loaded once per visit and shared by every section; moving between sections, or back and forward in the browser, doesn't reload it. Reloading the page starts a new visit. The coin page's price history isn't part of this: it loads when a coin page opens and has its own error message and "Retry" (COIN-02). `AC-6`
- Data that loads but is corrupt is never shown, and never leaves a blank page. A corrupt latest snapshot is handled like one with an invalid price (APP-06/AC-8 to AC-10): the app shows the previous snapshot and its price history instead, writes this to the browser console, and shows that no market data is available when there is no previous snapshot. A corrupt previous snapshot counts as a failure and shows the AC-2 message. Corrupt means any of: `AC-7`
  - the file isn't valid JSON (including an empty file);
  - it's valid JSON but not a market snapshot: not an object, no update time or one that isn't an ISO 8601 date and time (e.g. `2026-10-15T08:00:00.000Z`), no coin list, or an empty coin list;
  - any coin is missing a field or has a field of the wrong type (e.g. a name that isn't text, a price or percentage change that isn't a number, tags that aren't a list of text). Only the max supply may be empty;
  - any coin has an impossible value: an id or rank that isn't a positive whole number, an empty name, symbol or slug, a date added that isn't an ISO 8601 date and time, a negative supply, market cap or volume, or a market dominance outside 0–100%;
  - two coins share an id, a slug or a rank. Coins may share a symbol, since CoinMarketCap allows it.

  One malformed coin rejects the whole snapshot, as an invalid price does (APP-06). Prices themselves are checked by APP-06, not here.
- The loading placeholder and the AC-2 message are shown on every address, including an unknown one; "Page not found" (APP-05) is shown only once market data has loaded. `AC-8`
- If a section can't be shown for any other reason, it shows "Something went wrong", "This page couldn't be shown." and a "Retry" action instead of a blank page. The main navigation, the theme switch and the footer stay available. "Retry" reloads the market data (AC-3) and shows the section again; moving to another section clears the message. `AC-9`
- The daily update never publishes a snapshot that the app would count as corrupt (AC-7). Such a snapshot is rejected whole, like one with an invalid price (APP-06/AC-1, AC-2, AC-6): nothing is written, the rejection is logged, and the app keeps showing the last accepted snapshot. `AC-10`

## Known gaps

None. `app/src/data/MarketData.tsx` and `app/src/data/snapshotShape.ts` cover AC-2 and AC-7, `app/src/components/ErrorBoundary.tsx` covers AC-9, and `scripts/snapshot-listings.ts` covers AC-10.
