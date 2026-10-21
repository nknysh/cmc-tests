<!-- suite
tags: app-shell, APP-03
-->

# APP-03: Market data load failure can be retried

Covers [APP-03](APP-03-market-data-load-failure-can-be-retried.md): the app shows a loading placeholder while market data loads, a reason and a Retry action when it fails, falls back to the previous snapshot when the latest one is corrupt, and never leaves a blank page.

Preconditions for all tests:

- The app runs at the Playwright `baseURL`. Paths below are relative to it.
- Unless a test says otherwise, `**/data/latest.json` is routed with `page.route` to the committed fixture `app/public/data/latest.json` (taken 2026-10-15T15:12 UTC, 100 coins, Bitcoin first), and `**/data/history.json` to `app/public/data/history.json`.
- "Held" means the route handler doesn't answer until the test releases it. "Never answers" means it never does.
- "Returns N" means the route fulfills with HTTP status N and an empty body.
- "Until switched" means the route keeps that behaviour until a step switches it. Don't count on "the first request": the dev server runs React in StrictMode, which requests `latest.json` twice on every load.
- "Previous snapshot stub" means `**/data/previous.json` is routed to the fixture with Bitcoin's `name` set to `Bitcoin (previous)`, and `**/data/previous-history.json` to `app/public/data/history.json`. The coin page heading then tells which snapshot is shown.
- Each test starts in a fresh page, so market data hasn't been loaded yet.

Conventions:

- "The placeholder" is the element with role `status` and accessible name "Loading market data".
- "The error panel" is the element with role `alert`. "The error panel reads A / B / C" means its heading is A, its text below is B, and its button is C.
- "The chrome" is the **CoinBoard** brand link, the four links in the navigation named "Main" (Markets, Converter, Compare, Portfolio), the theme switch button (named "Switch to dark theme" or "Switch to light theme") and the footer.
- Pages are told apart by their level-1 heading: Markets "Cryptocurrency prices by market cap", Converter "Converter", Compare "Compare coins", Portfolio "Portfolio", coin page "Bitcoin BTC", unknown address "Page not found".

<!-- test
labels: Severity: critical
-->

# User sees a loading placeholder while market data loads

**Severity:** critical

Covers AC-1.

Preconditions:

- `latest.json` is held.

## Steps

- Open `/`
  *Expected*: The placeholder is visible
  *Expected*: The placeholder has `aria-busy="true"`
  *Expected*: No level-1 heading is shown
  *Expected*: The freshness badge (`data-testid="freshness"`) isn't shown
- Release `latest.json`
  *Expected*: The placeholder disappears
  *Expected*: The level-1 heading is "Cryptocurrency prices by market cap"

<!-- test
labels: Severity: normal
-->

# User can navigate and switch the theme while market data loads

**Severity:** normal

Covers AC-5 while loading. Moving to another section during the load shows that section once the data arrives.

Preconditions:

- `latest.json` is held.
- The page's color scheme is light, with no saved theme.

## Steps

- Open `/`
  *Expected*: The placeholder is visible
  *Expected*: The chrome is visible
- Click **Converter** in the main navigation
  *Expected*: The address is `/#/converter`
  *Expected*: The placeholder is still visible
- Click **Switch to dark theme**
  *Expected*: The `<html>` element has `data-theme="dark"`
  *Expected*: The button is now named "Switch to light theme"
- Release `latest.json`
  *Expected*: The level-1 heading is "Converter"

<!-- test
labels: Severity: minor
-->

# Unknown address shows the placeholder until market data loads, then Page not found

**Severity:** minor

Covers AC-8. "Page not found" depends on loaded data, so it isn't shown while the data is loading.

Preconditions:

- `latest.json` is held.

## Steps

- Open `/#/does-not-exist`
  *Expected*: The placeholder is visible
  *Expected*: No "Page not found" heading is shown
- Release `latest.json`
  *Expected*: The level-1 heading is "Page not found"

<!-- test
labels: Severity: blocker
-->

# User sees Couldn't load market data with the reason and Retry on every address when latest.json is missing

**Severity:** blocker

Covers AC-2 for an HTTP error, and AC-8 for the unknown address. Run once per row, each in a fresh page.

Preconditions:

- `latest.json` returns 404.

| Address |
| --- |
| `/` |
| `/#/converter` |
| `/#/compare` |
| `/#/portfolio` |
| `/#/coin/bitcoin` |
| `/#/does-not-exist` |

## Steps

- Open the row's address
  *Expected*: The error panel reads "Couldn't load market data" / "404 Not Found" / **Retry**
  *Expected*: The placeholder isn't shown
  *Expected*: No level-1 heading is shown
  *Expected*: The chrome is visible

<!-- test
labels: Severity: normal
-->

# Error reason shows the standard status text when the server sends none

**Severity:** normal

Covers AC-2 for servers that send a status code without its text, as GitHub Pages does over HTTP/2. Playwright's `route.fulfill` always adds the standard text, so this test replaces `window.fetch` instead. Run once per row, each in a fresh page.

Preconditions:

- An init script (`page.addInitScript`) makes `window.fetch` answer any URL containing `latest.json` with `new Response('', { status: <row status>, statusText: '' })`, and pass every other URL to the real `fetch`.

| Status | Reason shown |
| --- | --- |
| 404 | `404 Not Found` |
| 503 | `503 Service Unavailable` |
| 520 | `520 Error` |

## Steps

- Open `/`
  *Expected*: The error panel reads "Couldn't load market data" / the row's reason / **Retry**

<!-- test
labels: Severity: critical
-->

# User sees Network error when the server can't be reached

**Severity:** critical

Covers AC-2 for a connection failure. The raw browser message ("Failed to fetch") isn't shown.

Preconditions:

- `latest.json` is aborted with `route.abort('failed')`.

## Steps

- Open `/`
  *Expected*: The error panel reads "Couldn't load market data" / "Network error" / **Retry**
  *Expected*: The error panel doesn't contain "Failed to fetch"

<!-- test
labels: Severity: critical
-->

# User sees a timeout error when market data doesn't arrive within 30 seconds

**Severity:** critical

Covers AC-2 for a server that never answers. The placeholder must not stay up for longer than 30 seconds.

Preconditions:

- `latest.json` never answers.

## Steps

- Open `/`
  *Expected*: The placeholder is visible
- Wait 25 seconds
  *Expected*: The placeholder is still visible
  *Expected*: The error panel isn't shown
- Wait until 35 seconds have passed since opening the page
  *Expected*: The error panel reads "Couldn't load market data" / "The server took too long to respond" / **Retry**
  *Expected*: The placeholder isn't shown

<!-- test
labels: Severity: normal
-->

# Timeout counts the fallback to the previous snapshot within the same 30 seconds

**Severity:** normal

Covers AC-2: the 30 seconds count every file the load needs, including the fallback to the previous snapshot (APP-06/AC-8). Without this, a slow fallback could keep the placeholder up for about 60 seconds.

Preconditions:

- `latest.json` answers after 20 seconds with the fixture, but with Bitcoin's `price` set to `0`.
- `previous.json` never answers.

## Steps

- Open `/`
  *Expected*: The placeholder is visible
- Wait until 35 seconds have passed since opening the page
  *Expected*: The error panel reads "Couldn't load market data" / "The server took too long to respond" / **Retry**
  *Expected*: `previous.json` was requested
  *Expected*: The error panel appeared between 29 and 33 seconds after opening the page

<!-- test
labels: Severity: critical
-->

# User can navigate and switch the theme after market data fails to load

**Severity:** critical

Covers AC-5 after a failure. Every section shows the error until the data loads.

Preconditions:

- `latest.json` returns 404.
- The page's color scheme is light, with no saved theme.

## Steps

- Open `/#/converter`
  *Expected*: The error panel is visible
  *Expected*: The chrome is visible
- Click **Compare** in the main navigation
  *Expected*: The address is `/#/compare`
  *Expected*: The error panel reads "Couldn't load market data" / "404 Not Found" / **Retry**
- Click **Switch to dark theme**
  *Expected*: The `<html>` element has `data-theme="dark"`
- Click the footer link **CoinMarketCap**
  *Expected*: The link points to `https://coinmarketcap.com/api/`

<!-- test
labels: Severity: blocker
-->

# User can retry a failed load and sees the section they asked for

**Severity:** blocker

Covers AC-3. The section shown after the retry is the one the user moved to while the error was showing.

Preconditions:

- `latest.json` returns 404 until switched.

## Steps

- Open `/`
  *Expected*: The error panel reads "Couldn't load market data" / "404 Not Found" / **Retry**
- Click **Compare** in the main navigation
  *Expected*: The error panel is still visible
- Switch `latest.json` to held, answering with the fixture on release
  *Expected*: The error panel is still visible
- Click **Retry**
  *Expected*: The placeholder is visible
  *Expected*: The error panel isn't shown
  *Expected*: `latest.json` was requested once more
- Release `latest.json`
  *Expected*: The level-1 heading is "Compare coins"
  *Expected*: The freshness badge (`data-testid="freshness"`) is visible

<!-- test
labels: Severity: critical
-->

# Failed retry shows the error again with the new reason

**Severity:** critical

Covers AC-4.

Preconditions:

- `latest.json` returns 404 until switched.

## Steps

- Open `/`
  *Expected*: The error panel reads "Couldn't load market data" / "404 Not Found" / **Retry**
- Switch `latest.json` to held, returning 503 on release
  *Expected*: The error panel is still visible
- Click **Retry**
  *Expected*: The placeholder is visible
- Release `latest.json`
  *Expected*: The error panel reads "Couldn't load market data" / "503 Service Unavailable" / **Retry**
  *Expected*: The chrome is visible

<!-- test
labels: Severity: normal
-->

# Market data loads once per visit and isn't refetched when moving between sections

**Severity:** normal

Covers AC-6. Run it against a production build, either `npm run build` then `npm run preview` in `app/`, or `COINBOARD_URL` set to the deployed app. The dev server runs React in StrictMode, which fetches every file twice.

Preconditions:

- `latest.json` is served unchanged, and every request to it is counted.

## Steps

- Open `/`
  *Expected*: The level-1 heading is "Cryptocurrency prices by market cap"
  *Expected*: `latest.json` was requested 1 time
- Click **Converter**, then **Compare**, then **Portfolio**, then **Markets** in the main navigation
  *Expected*: `latest.json` was still requested 1 time
- Open the first coin in the coin list
  *Expected*: The level-1 heading is "Bitcoin BTC"
- Go back in the browser, then forward
  *Expected*: The level-1 heading is "Bitcoin BTC"
  *Expected*: `latest.json` was still requested 1 time
- Reload the page
  *Expected*: `latest.json` was requested 2 times

<!-- test
labels: Severity: critical
-->

# Corrupt latest snapshot falls back to the previous snapshot and its price history

**Severity:** critical

Covers AC-7: each kind of corrupt data is handled like a snapshot with an invalid price (APP-06/AC-8). Run once per row, each in a fresh page.

Preconditions:

- `latest.json` returns 200 with the row's content.
- Previous snapshot stub.

| `latest.json` content |
| --- |
| `{"updatedAt": "2026` (not valid JSON) |
| empty body |
| `{}` |
| the fixture with `coins` set to `[]` |
| the fixture with Bitcoin's `name` set to `123` |
| the fixture with `updatedAt` set to `March 7` |
| the fixture with Bitcoin's `marketCap` set to `-1` |
| the fixture with Ethereum's `slug` set to `bitcoin` |

## Steps

- Open `/#/coin/bitcoin`
  *Expected*: The level-1 heading is "Bitcoin (previous) BTC"
  *Expected*: The error panel isn't shown
  *Expected*: The price chart (`data-testid="price-chart"`) is visible
  *Expected*: `previous-history.json` was requested
  *Expected*: `history.json` wasn't requested
  *Expected*: The browser console has a warning containing "latest.json is corrupt; showing the previous snapshot instead"

<!-- test
labels: Severity: normal
-->

# Corrupt latest snapshot with no previous snapshot shows No market data available

**Severity:** normal

Covers AC-7, with APP-06/AC-10. There's nothing valid to show, so no data or Retry is offered.

Preconditions:

- `latest.json` returns 200 with `{}`.
- `previous.json` returns 404.

## Steps

- Open `/`
  *Expected*: The heading "No market data available" is visible
  *Expected*: The error panel isn't shown
  *Expected*: No level-1 heading is shown
  *Expected*: The chrome is visible

<!-- test
labels: Severity: critical
-->

# Corrupt latest and corrupt previous snapshots show The market data file is invalid

**Severity:** critical

Covers AC-7 and AC-2: a corrupt previous snapshot counts as a failure. The page isn't left blank, and the chrome stays (AC-5).

Preconditions:

- `latest.json` returns 200 with `{}`.
- `previous.json` returns 200 with `[]`.

## Steps

- Open `/`
  *Expected*: The error panel reads "Couldn't load market data" / "The market data file is invalid" / **Retry**
  *Expected*: The chrome is visible
  *Expected*: The error panel doesn't contain "Cannot read properties"

<!-- test
labels: Severity: normal
-->

# Snapshot with values that real data has isn't treated as corrupt

**Severity:** normal

Covers the limits of AC-7: coins may share a symbol, total supply may be below circulating supply (as STX's is in the fixture), and max supply may be empty. Run once per row, each in a fresh page.

Preconditions:

- `latest.json` returns 200 with the row's content.
- `previous.json` is counted but never answered.

| `latest.json` content |
| --- |
| the fixture with Ethereum's `symbol` set to `BTC` |
| the fixture with Bitcoin's `totalSupply` set to `1` |
| the fixture with Bitcoin's `maxSupply` set to `null` |

## Steps

- Open `/#/coin/bitcoin`
  *Expected*: The level-1 heading is "Bitcoin BTC"
  *Expected*: The error panel isn't shown
  *Expected*: `previous.json` wasn't requested

<!-- test
labels: Severity: normal
-->

# Section that fails to draw shows Something went wrong and keeps the chrome

**Severity:** normal

Covers AC-9. Valid data never makes a section fail, so the test forces one: Markets formats its percentages with `toFixed`, and the init script makes it throw on demand.

Preconditions:

- An init script replaces `Number.prototype.toFixed` with a version that throws `new Error('forced')` while `window.__crash` is `true`, and sets `window.__crash = true`.
- Every request to `latest.json` is counted.

## Steps

- Open `/`
  *Expected*: The error panel reads "Something went wrong" / "This page couldn't be shown." / **Retry**
  *Expected*: The chrome is visible
- Set `window.__crash` to `false` in the page
  *Expected*: The error panel is still shown
- Click **Converter** in the main navigation
  *Expected*: The level-1 heading is "Converter"
  *Expected*: The error panel isn't shown
- Set `window.__crash` to `true` in the page
  *Expected*: The level-1 heading is still "Converter"
- Click **Markets** in the main navigation
  *Expected*: The error panel reads "Something went wrong" / "This page couldn't be shown." / **Retry**
- Set `window.__crash` to `false` in the page
  *Expected*: The error panel is still shown
- Click **Retry**
  *Expected*: The level-1 heading is "Cryptocurrency prices by market cap"
  *Expected*: `latest.json` was requested once more

<!-- test
labels: Severity: critical
-->

# Daily update doesn't publish a malformed snapshot

**Severity:** critical

Covers AC-10. The snapshot script runs offline against a stubbed CoinMarketCap response, so it makes no live call.

Preconditions:

- A module `fetch-stub.mjs` sets `globalThis.fetch` to return status 200 with a listings/latest body of two coins. Each coin has every field the client reads, with a `USD` quote and a price of `10`. The second coin's `name` is `null`.
- `out/` doesn't exist.

## Steps

- Run `GITHUB_OUTPUT=out.txt CMC_API_KEY=dummy npx tsx --import ./fetch-stub.mjs scripts/snapshot-listings.ts out`
  *Expected*: The command exits with code 0
  *Expected*: The output contains "rejected the snapshot"
  *Expected*: The output contains "coin 2 has a name that is not a string"
  *Expected*: `out/` doesn't exist
  *Expected*: `out.txt` contains `accepted=false`
