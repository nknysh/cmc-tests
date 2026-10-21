# APP-03 exploratory test report: Market data load failure can be retried

- **Story:** [APP-03](../user-stories/app-shell/APP-03-market-data-load-failure-can-be-retried.md)
- **Date:** 2026-10-21
- **Tool:** Playwright MCP (Chromium), with network stubbed through `page.route` on `**/data/latest.json`
- **Builds under test:**
  - Local Vite dev server (`app/`, `http://localhost:5173/cmc-tests/app/`), runs in React `StrictMode`
  - Deployed production build on GitHub Pages (`https://nknysh.github.io/cmc-tests/app/`, served over HTTP/2), used for AC-2 and AC-6
- **Sections covered:** Markets `#/`, Converter `#/converter`, Compare `#/compare`, Portfolio `#/portfolio`, Coin `#/coin/bitcoin`, unknown route `#/does-not-exist`
- **Screenshots:** [`APP-03/`](APP-03/)

## Resolution (2026-10-21)

The product owner answered Q-1 to Q-6, the story was updated (AC-2, AC-5, AC-6 and AC-7 reworded, AC-8 added, known gap closed), and F-1 to F-5 were fixed in `app/src/data/MarketData.tsx` and the new `app/src/data/snapshotShape.ts`. All fixes were re-tested with Playwright MCP on the dev server, and every AC-7 payload in the table below now shows "Couldn't load market data / The market data file is invalid / Retry" with the navigation and footer still present. Valid snapshots, including one with `maxSupply: null`, still render.

| Question | Decision |
|----------|----------|
| Q-1 Reason text | Written for users. HTTP: code plus standard text, filled in from a code map when the server sends none (fixes F-1). Unreachable server: "Network error". Corrupt data: "The market data file is invalid". Technical details go to `console.warn` only (fixes F-5). |
| Q-2 `coins: []` | Corrupt: shows the AC-2 message. |
| Q-3 Shape check | Strict: a valid `updatedAt` date, a non-empty coin list, and every field of every coin of the right type (only `maxSupply` may be null). One bad coin rejects the snapshot (fixes F-2, F-3, F-4). |
| Q-4 `history.json` | Out of AC-6's scope. It loads on demand per coin page (COIN-02), as now. |
| Q-5 Unknown address | Data state first, as now. Documented as AC-8. |
| Q-6 Focus | No change. The alert role is documented in AC-2. |

Fix verification:

| Check | Before | After |
|-------|--------|-------|
| 404 with no status text (simulated HTTP/2 response) | `404` | `404 Not Found` |
| Status code not in the map (418, no text) | `418` | `418` (no standard text known) |
| Network error | `Failed to fetch` | `Network error` |
| Request that never answers | Loading placeholder forever | After 30 s: "The server took too long to respond", Retry works; a 5 s response still loads |
| Wrong-shape JSON, bad coin fields, `coins: []`, bad `updatedAt` | Blank page, or wrong values rendered | AC-2 message, chrome stays |
| `history.json` not valid JSON | Raw `SyntaxError` text | "Couldn't load price history / The price history file is invalid" |

F-1 on GitHub Pages itself can only be confirmed after the next deploy.

## Summary (original run, before fixes)

| AC | Result | Notes |
|----|--------|-------|
| AC-1 Loading placeholder | ✅ Pass | |
| AC-2 Failure message + reason + Retry | ⚠️ Pass locally, **fails in production** | GitHub Pages shows "404" with no status text (F-1) |
| AC-3 Retry → loading → requested section | ✅ Pass | |
| AC-4 Failed retry shows AC-2 again | ✅ Pass | |
| AC-5 Nav, theme switch, footer stay available | ⚠️ Pass for load/HTTP failures, **fails for corrupt data** | Whole app unmounts (F-2) |
| AC-6 Loaded once per visit, shared | ✅ Pass (production) | Dev fetches twice because of StrictMode (O-1); `history.json` refetched per coin page visit (Q-4) |
| AC-7 Corrupt data counts as failure | ❌ **Fail** | The known gap is wider than documented (F-2, F-3, F-4) |

## Results by acceptance criterion

### AC-1: Loading placeholder announced as "Loading market data" ✅

The `latest.json` response was held open while checking the page.

- Every section shows `<output aria-busy="true" aria-label="Loading market data">` (role `status`) with 8 skeleton rows. ([ac1-loading.png](APP-03/ac1-loading.png))
- Moving from Markets to Converter during loading keeps the placeholder. Once the data arrives, the section the user moved to (Converter) is shown.
- The freshness badge is hidden while loading.

### AC-2: "Couldn't load market data", the reason, and "Retry" ✅ locally / ❌ production

Every section, including the coin page and the unknown route, shows a `role="alert"` panel with the heading "Couldn't load market data", the reason, and a Retry button (`data-testid="retry-button"`). ([ac2-error.png](APP-03/ac2-error.png))

| Failure stubbed | Reason shown |
|-----------------|--------------|
| 404 (dev server, HTTP/1.1) | `404 Not Found` |
| 500 | `500 Internal Server Error` |
| 503 | `503 Service Unavailable` |
| Network error (`route.abort`) | `Failed to fetch` |
| **404 on GitHub Pages (HTTP/2)** | **`404`** (no status text, see F-1) |

### AC-3: Retry shows loading, reloads, then shows the requested section ✅

- Clicking Retry replaces the error with the loading placeholder; the alert is gone while loading.
- Exactly one new `latest.json` request is made per Retry click. A double-click also made only one request.
- On success the user lands on the section they had asked for: Compare (after moving there while in the error state), `#/coin/bitcoin` (shows "Bitcoin BTC"), and an unknown route (shows "Page not found"). The freshness badge appears.
- Retry is reachable with the keyboard (7th Tab stop on Markets).

### AC-4: A failed retry shows the AC-2 message again ✅

Retries were chained: 404 → Retry (slow 503) → 500 → network error → success. Each failure showed the AC-2 panel with the new reason and a working Retry button.

### AC-5: Navigation, theme switch and footer stay available ⚠️

- **While loading:** the brand link, all 4 nav links, the theme toggle and the footer are visible and work. Switching sections and toggling the theme (light → dark) both worked. ✅
- **After an HTTP or network failure:** all of them are still visible. Nav links change the URL and keep showing the error, and the theme toggle works. ✅
- **After corrupt data:** the whole React tree unmounts (`#root` is empty), so the nav, theme switch and footer disappear too. ❌ See F-2. ([ac7-blank-page.png](APP-03/ac7-blank-page.png))

### AC-6: Loaded once per visit, shared, not reloaded on navigation ✅

`data/*.json` requests were counted during this walk: load, then Converter → Compare → Portfolio → Markets → first coin → Back → Forward → brand link.

| Build | `latest.json` requests during the walk | After a full reload |
|-------|----------------------------------------|---------------------|
| Production (GitHub Pages) | **1** | +1 (expected: a new visit) |
| Dev server | 2 (StrictMode double effect, see O-1) | +2 |

In-app hash navigation never refetched `latest.json`. `history.json` was fetched on every coin page mount (twice in production), see Q-4.

### AC-7: Corrupt data counts as a failure, never a blank page ❌

Each payload was served as `200` from `latest.json` and checked on Markets, Coin and Converter.

| Payload | Result | Page errors |
|---------|--------|-------------|
| Truncated JSON | ✅ AC-2 panel: "Unterminated string in JSON at position 25 …" | |
| Empty body | ✅ AC-2 panel: "Failed to execute 'json' on 'Response': Unexpected end of JSON input" | |
| HTML page served with 200 | ✅ AC-2 panel: "Unexpected token '<', "<!doctype "... is not valid JSON" | |
| `null` | ✅ AC-2 panel: "Cannot read properties of null (reading 'coins')" | |
| `{"coins":[null]}` | ✅ AC-2 panel: "Cannot read properties of null (reading 'price')" | |
| `[]`, `{}`, `"x"`, `42` | ❌ **Blank page** on all 3 sections | `reading 'filter'` / `'find'` / `'some'` |
| `coins` missing | ❌ **Blank page** on all 3 sections | same |
| `coins: "oops"` (not an array) | ❌ **Blank page** on all 3 sections | `coins.filter is not a function` |
| One coin with `tags` missing | ❌ **Blank page** on Markets and Coin; Converter works | `reading 'includes'` / `'slice'` |
| One coin with `percentChange24h: null` | ❌ **Blank page** on Markets and Coin; Converter works | `reading 'toFixed'` |
| One coin with `name: 123` | ❌ Renders "123" as the coin name, no error | |
| One coin with `slug` missing | ❌ Renders; `#/coin/bitcoin` says "Coin not found … in the current top 100" | |
| `updatedAt` missing or `"yesterday"` | ❌ Renders; freshness badge reads **"Updated NaN d ago"** | |
| `coins: []` | ❓ Renders "Total market cap $0", "24h volume (top 0)", "top 0" (see Q-2) | |
| One coin with `price: "82000"` (string) | ⚠️ Treated as an invalid price (APP-06 fallback). In dev, `previous.json` doesn't exist, the Vite SPA fallback returns `index.html` with 200, and the AC-2 panel says "Unexpected token '<' … is not valid JSON" (O-2) | |

The story's known gap ("valid JSON that isn't a market snapshot leaves the page blank") is confirmed, and it is wider than written: see F-2 to F-4.

## Findings

### F-1 (High): production shows "404" instead of "404 Not Found" (AC-2)

- **Where:** deployed app on GitHub Pages.
- **Steps:** redirect `data/latest.json` to a missing file on `nknysh.github.io` and open the app.
- **Actual:** "Couldn't load market data / **404** / Retry".
- **Expected (AC-2):** a reason such as "404 Not Found".
- **Cause:** GitHub Pages serves HTTP/2, which has no reason phrase, so `response.statusText` is `""`. `HttpError` in `app/src/data/MarketData.tsx` builds the message from `${status} ${statusText}`. Local tests pass only because the Vite dev server (and Playwright's `route.fulfill`) use HTTP/1.1 and include the text.
- **Impact:** automated tests against the dev server can't catch this. A spec asserting "404 Not Found" would fail against `COINBOARD_URL` set to the deployed app.
- **Suggestion:** derive the text from a status-code map when `statusText` is empty, or relax the AC to "the HTTP status code".

### F-2 (Critical): wrong-shape JSON blanks the whole app, including nav, theme switch and footer (AC-7, AC-5)

- **Steps:** serve `{}` (or `[]`, a string, a number, no `coins`, or `coins` that isn't an array) as `latest.json` and open any section.
- **Actual:** a render-time `TypeError` that nothing catches. React unmounts the root and the page is completely empty. Retry, navigation, theme switch and footer are all gone, so the only way out is a manual browser reload. ([ac7-blank-page.png](APP-03/ac7-blank-page.png))
- **Expected:** the AC-2 panel, with the AC-5 chrome still available.
- **Cause:** `fetchJson` casts `response.json()` to `MarketSnapshot` with no shape check, and the app has no error boundary. (`findInvalidPrices` skips a missing `coins` on purpose, per its comment.)
- **Note:** this is the documented known gap, but the story only mentions the blank page, not that AC-5 breaks as well.

### F-3 (High): one malformed coin field blanks the Markets and Coin sections (AC-7)

- `tags` missing or `percentChange24h: null` on a single coin crashes Markets and the Coin page in the same way as F-2. Converter still works.
- The known gap is described as "valid JSON that isn't a market snapshot", but here the snapshot shape is correct and only one field of one coin out of 100 is wrong.

### F-4 (Medium): wrong-typed fields render silently (AC-7)

AC-7 calls "fields of the wrong type" a failure, but these render without any error:
- `name: 123` is shown as the coin name "123".
- A missing `slug` makes that coin's page unreachable ("Coin not found").
- A missing or invalid `updatedAt` gives the freshness badge "Updated NaN d ago" (this also affects APP-02).

### F-5 (Low): technical exception text is shown to users as the reason

Reasons such as "Cannot read properties of null (reading 'coins')", "Failed to execute 'json' on 'Response': …" and "Unexpected token '<' …" are raw JavaScript messages. AC-2 gives only an HTTP example, so this isn't strictly a failure, but it's poor UX and makes assertions brittle across browsers (Firefox and WebKit word JSON errors differently).

## Observations

- **O-1:** In dev, every load fetches `latest.json` twice because `StrictMode` runs effects twice. This is expected dev behaviour, but any automated AC-6 check ("exactly one request") must run against a production build (`vite preview` or the deployed app), not the dev `webServer`.
- **O-2:** The dev server returns `index.html` with 200 for any missing file under `data/`. A missing `previous.json` therefore shows up in dev as an invalid-JSON error instead of a 404, so APP-06's "no previous snapshot → No market data available" path (AC-10) can't be reproduced in dev without stubbing a 404.
- **O-3:** `history.json` failures on the coin page are handled separately. The chart area shows "Couldn't load price history / 404 Not Found / Retry", and the rest of the page still renders. This is fine, but it's outside APP-03's wording.
- **O-4:** Every route, including unknown ones, shows the loading and error states, because `NotFoundPage` is only rendered once data is ready. A user with a bad URL sees "Couldn't load market data" rather than "Page not found" while the data is failing.
- **O-5:** After a failure, focus isn't moved to the alert or the Retry button. The panel has `role="alert"`, so screen readers announce it, but keyboard users have to Tab to Retry (7 stops on Markets).

## Questions for the product owner

- **Q-1:** Is the reason meant to be user-facing text, or the raw technical error? (F-1, F-5) If user-facing, should network and corrupt-data failures get friendly wording, e.g. "Network error", "The data file is damaged"?
- **Q-2:** Is `coins: []` a valid snapshot? Today it renders "$0" totals and "top 0". It should probably count as corrupt (AC-7) or as "No market data available" (APP-06/AC-10).
- **Q-3:** How strict should AC-7 be about fields? Should it check the whole document's shape (every coin, every field type), or reject only on fields that would crash rendering? Should one bad coin reject the whole snapshot, as APP-06 does for prices?
- **Q-4:** Is `history.json` part of "market data" for AC-6? It's refetched every time a coin page mounts, including Back/Forward.
- **Q-5:** For an unknown route while data is loading or has failed, should "Page not found" win over the data error? (O-4)
- **Q-6:** Should Retry move focus to the loaded content, or announce success, for assistive tech?

## Gaps in the story and test coverage

- The known-gaps note should be widened to cover F-2's AC-5 impact (nav, theme and footer disappear), F-3 (per-coin field faults), and F-4 (wrong types render silently).
- AC-2's example "404 Not Found" can't be met on the actual host (F-1).
- AC-6 doesn't say whether a browser reload is a new "visit". The current behaviour (reload refetches) seems intended.
- AC-1 doesn't say whether the placeholder should appear immediately or after a delay. It currently appears immediately, which can flash on fast loads.
- No timeout is defined: a request that never responds keeps the placeholder up forever, with no Retry. *Resolved: the product owner set a 30-second timeout (AC-2).*
- No `.test.md` cases or specs exist for APP-03 yet (see the risk matrix). Suggested automation: AC-1 to AC-5 in a `coinboard` spec with `page.route` stubs, AC-6 with a request counter against a production build, and AC-7 as a parameterised spec over the payloads above. The currently failing rows would be marked `test.fail` until fixed.

## Follow-up fixes (2026-10-21)

After the first round of fixes, a second review against the updated story found five more issues. All five were fixed, the story was updated (AC-2 reworded, AC-9 and AC-10 added), and each fix was re-tested.

| # | Issue | Fix | Verified |
|---|-------|-----|----------|
| 1 | Each file had its own 30 s timeout, so the fallback to `previous.json` (APP-06) could keep the placeholder up for about 60 s | One 30 s limit for the whole load (`useLoad` in `MarketData.tsx`) | `latest.json` with a price of 0 arriving after 20 s, then `previous.json` hanging: error at 30.6 s |
| 2 | The snapshot script didn't check the shape, so a malformed CoinMarketCap response could be published and break the app for everyone | `scripts/snapshot-listings.ts` runs `snapshotProblem` and rejects the snapshot like an invalid price | Stubbed API with a null coin name: rejected, nothing written. A valid stub was accepted |
| 3 | No error boundary: any other error while drawing a section blanked the whole app | `ErrorBoundary` around the routes shows "Something went wrong" with Retry, keeps the header and footer, and clears on navigation | Forced a render error: panel shown, chrome kept, navigation cleared it, Retry refetched and redrew |
| 4 | Status codes missing from the map showed only the number | Falls back to "Error" | 520 with no status text: "520 Error" |
| 5 | Leaving a coin page left its history request running | `useLoad` aborts its request when the page closes or the key changes | `history.json` request aborted (`net::ERR_ABORTED`) after moving to Markets |

## Corrupt-data fallback and value checks (2026-10-21)

The product owner decided that a corrupt `latest.json` falls back to `previous.json`, like a snapshot with an invalid price (APP-06/AC-8 to AC-10), and that impossible values count as corrupt. AC-2 and AC-7 of APP-03 and AC-8 of APP-06 were updated.

- **Value checks added to `snapshotProblem`:**
  - an id or rank that isn't a positive whole number;
  - an empty name, symbol or slug;
  - a date added that isn't a date;
  - a negative supply, market cap or volume;
  - a market dominance outside 0–100%;
  - duplicate ids, slugs or ranks.
- **Deliberately not checked:**
  - Duplicate symbols, which CoinMarketCap allows.
  - Total supply below circulating supply, which real data has (STX in the committed fixture).
  - Prices, which are APP-06's job.
- The snapshot script uses the same check, so it now also rejects these values (APP-03/AC-10).

| `latest.json` | `previous.json` | Shown (on `#/coin/bitcoin`) |
|---------------|-----------------|------------------------------|
| `{}` | valid | Previous snapshot, with `previous-history.json` for the chart; console says "latest.json is corrupt; showing the previous snapshot instead" |
| Not valid JSON | valid | Previous snapshot, as above |
| Duplicate slug | valid | Previous snapshot, as above |
| `{}` | 404 | "No market data available" |
| `{}` | corrupt (`[]`) | "Couldn't load market data / The market data file is invalid / Retry" |
| valid | (not requested) | Latest snapshot with `history.json` |
| 404 | (not requested) | "Couldn't load market data / 404 Not Found / Retry". HTTP and network failures don't fall back |

The committed fixture passes every check. Duplicate symbols, total supply below circulating supply, and a price of 0 are still accepted by the shape check.
