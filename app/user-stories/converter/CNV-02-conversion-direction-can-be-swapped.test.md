<!-- suite
tags: converter, CNV-02
-->

# CNV-02: Conversion direction can be swapped

Covers [CNV-02](CNV-02-conversion-direction-can-be-swapped.md): the "⇅ Swap" action exchanges From and To in one step and keeps the Amount.

Preconditions for all tests:

- The app runs at the Playwright `baseURL`. Paths below are relative to it.
- Every test serves the committed fixture `app/public/data/latest.json` (taken 2026-10-15T15:12 UTC, 100 coins) by routing `**/data/latest.json` to that file with `page.route`, so results don't depend on the snapshot the app is deployed with.
- In the fixture the top four coins are: 1 Bitcoin (BTC, slug `bitcoin`), 2 Ethereum (ETH, `ethereum`), 3 Tether USDt (USDT, `tether`), 4 BNB (BNB, `bnb`). Rank 50 is Pepe (PEPE, `pepe`).
- Tests with a "Stubbed snapshot" precondition route `**/data/latest.json` to a modified copy of the fixture instead, built exactly as the test describes. The app lists coins in the order of the `coins` array, not by their `rank` field, so a stub that changes the ranking changes both. Every price in a stub stays above 0, so APP-06 doesn't reject it.

Conventions:

- "**Swap**" is the button named "⇅ Swap". "Click **Swap**" clicks it once.
- "**Amount**" is the text box labelled Amount. "Type X in **Amount**" clears it first, then types X key by key, with focus left in it.
- "Select X in **From**" selects the option labelled X in the select labelled **From**; likewise **To**. "**From** shows X" means the selected option's label is X.
- "The result" is the `output` element after the form (`data-testid="conversion-result"`). "The result reads X" means its text is exactly X.
- "The empty error" is "Enter an amount of 0 or more."; "the max error" is "Enter an amount up to 1,000,000,000.". "Shown as an alert" means an element with role `alert` has exactly that text. "**Amount** is marked invalid" means it has `aria-invalid="true"`.

Fixture results used below (format as in CNV-01: up to 8 significant digits, plain digits):

| Pair | Amount | Result |
| --- | --- | --- |
| BTC → USD | 1 | `1 BTC = 82,074.628 USD` |
| USD → BTC | 1 | `1 USD = 0.000012184033 BTC` |
| BTC → USD | 12 | `12 BTC = 984,895.53 USD` |
| USD → BTC | 12 | `12 USD = 0.0001462084 BTC` |
| BNB → USDT | 1 | `1 BNB = 730.96291 USDT` |
| USDT → BNB | 1 | `1 USDT = 0.0013680585 BNB` |
| ETH → USD | 1 | `1 ETH = 2,417.2099 USD` |
| USD → ETH | 1 | `1 USD = 0.00041370011 ETH` |
| USD → PEPE | 1000000000 | `1,000,000,000 USD = 243,957,010,000,000 PEPE` |
| PEPE → USD | 1000000000 | `1,000,000,000 PEPE = 4,099.0829 USD` |

<!-- test
labels: Severity: blocker
-->

# User sees the Swap action on the Converter page

Covers AC-1.

## Steps

- Open `/#/converter`
  *Expected*: A button named "⇅ Swap" is visible and enabled
  *Expected*: It sits between **From** and **To** in the page

<!-- test
labels: Severity: critical
-->

# Swapping the default pair converts US dollars to Bitcoin

Covers AC-2 and AC-4 with the default pair, the example in AC-4.

## Steps

- Open `/#/converter`
  *Expected*: **From** shows "Bitcoin (BTC)" and **To** shows "US Dollar (USD)"
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Click **Swap**
  *Expected*: **From** shows "US Dollar (USD)"
  *Expected*: **To** shows "Bitcoin (BTC)"
  *Expected*: The result reads `1 USD = 0.000012184033 BTC`

<!-- test
labels: Severity: critical
-->

# Swapping keeps a changed Amount and converts it in the new direction

Covers AC-2, AC-3 and AC-4 with an Amount other than the default, so a reset to `1` would show.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type `12` in **Amount**
  *Expected*: The result reads `12 BTC = 984,895.53 USD`
- Click **Swap**
  *Expected*: **Amount** still has the value `12`
  *Expected*: **From** shows "US Dollar (USD)" and **To** shows "Bitcoin (BTC)"
  *Expected*: The result reads `12 USD = 0.0001462084 BTC`

<!-- test
labels: Severity: normal
-->

# Swapping two coins exchanges them

Covers AC-2 and AC-4 for a pair without USD, where both sides are chosen by the user.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Select "BNB (BNB)" in **From** and "Tether USDt (USDT)" in **To**
  *Expected*: The result reads `1 BNB = 730.96291 USDT`
- Click **Swap**
  *Expected*: **From** shows "Tether USDt (USDT)"
  *Expected*: **To** shows "BNB (BNB)"
  *Expected*: The result reads `1 USDT = 0.0013680585 BNB`

<!-- test
labels: Severity: normal
-->

# Swapping twice restores the original direction

Covers AC-5.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type `12` in **Amount**
  *Expected*: The result reads `12 BTC = 984,895.53 USD`
- Click **Swap**
  *Expected*: The result reads `12 USD = 0.0001462084 BTC`
- Click **Swap**
  *Expected*: **From** shows "Bitcoin (BTC)" and **To** shows "US Dollar (USD)"
  *Expected*: **Amount** has the value `12`
  *Expected*: The result reads `12 BTC = 984,895.53 USD`

<!-- test
labels: Severity: normal
-->

# Swapping with an invalid Amount swaps the currencies and keeps the error

Covers AC-6 for each kind of invalid Amount (CNV-01/AC-10, AC-13, AC-14). For the incomplete row, clicking **Swap** is what moves focus out of Amount, so the error shows from that click on. Run once per row, each in a fresh page.

| Amount | Error after the swap |
| --- | --- |
| empty (cleared) | the empty error |
| `1000000001` | the max error |
| `2.` | the empty error |

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type the row's Amount in **Amount** (for the empty row, clear it)
  *Expected*: The result reads `—`
- Click **Swap**
  *Expected*: **From** shows "US Dollar (USD)" and **To** shows "Bitcoin (BTC)"
  *Expected*: **Amount** still has the row's Amount
  *Expected*: The row's error is shown as an alert
  *Expected*: **Amount** is marked invalid
  *Expected*: The result reads `—`

<!-- test
labels: Severity: minor
-->

# Swapping the same currency on both sides changes nothing

Covers AC-7 (CNV-01/AC-8).

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Select "Bitcoin (BTC)" in **To**
  *Expected*: The result reads `1 BTC = 1 BTC`
- Click **Swap**
  *Expected*: **From** and **To** both show "Bitcoin (BTC)"
  *Expected*: The result reads `1 BTC = 1 BTC`
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# Swapping after From fell back to the top-ranked coin swaps the coin shown

Covers AC-8: with Bitcoin missing, From shows and converts Ethereum, and Swap moves Ethereum, not the missing coin, to To. As in CNV-01, the default From is the only reachable fallback.

Preconditions:

- Stubbed snapshot: the fixture with the Bitcoin entry (slug `bitcoin`) removed and every remaining `rank` lowered by 1, so Ethereum is rank 1.

## Steps

- Open `/#/converter`
  *Expected*: **From** shows "Ethereum (ETH)"
  *Expected*: The result reads `1 ETH = 2,417.2099 USD`
- Click **Swap**
  *Expected*: **From** shows "US Dollar (USD)"
  *Expected*: **To** shows "Ethereum (ETH)"
  *Expected*: The result reads `1 USD = 0.00041370011 ETH`
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# Swap works with Enter and Space and keeps focus

Covers AC-9. Each key press is one swap. Tab order is Amount, From, Swap, To.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Focus **From** and press Tab
  *Expected*: **Swap** has focus
- Press Enter
  *Expected*: **From** shows "US Dollar (USD)" and **To** shows "Bitcoin (BTC)"
  *Expected*: The result reads `1 USD = 0.000012184033 BTC`
  *Expected*: **Swap** still has focus
- Press Space
  *Expected*: **From** shows "Bitcoin (BTC)" and **To** shows "US Dollar (USD)"
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
  *Expected*: **Swap** still has focus

<!-- test
labels: Severity: minor
-->

# Result after a swap is in a polite live region

Covers AC-10. Screen reader output itself isn't checked: the test checks that the updated result is in the live region a screen reader announces.

## Steps

- Open `/#/converter`
  *Expected*: The result is an `output` element with `aria-live="polite"`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Click **Swap**
  *Expected*: The same live region now reads `1 USD = 0.000012184033 BTC`

<!-- test
labels: Severity: minor
-->

# Double-clicking Swap swaps twice and leaves the direction unchanged

Covers AC-11.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Double-click **Swap**
  *Expected*: **From** shows "Bitcoin (BTC)" and **To** shows "US Dollar (USD)"
  *Expected*: The result reads `1 BTC = 82,074.628 USD`

<!-- test
labels: Severity: normal
-->

# Swapping doesn't change the address and Back leaves the Converter

Covers AC-12.

## Steps

- Open `/#/`
  *Expected*: The address is `#/`
- Click the **Converter** link in the navigation named "Main"
  *Expected*: The address is `#/converter`
- Click **Swap** three times
  *Expected*: The address is still `#/converter`, with no query
  *Expected*: The result reads `1 USD = 0.000012184033 BTC`
- Go back once in browser history
  *Expected*: The address is `#/`
  *Expected*: The heading "Converter" is not in the page

<!-- test
labels: Severity: minor
-->

# Result fits within the page on a narrow screen in both directions

Covers AC-13 (CNV-01/AC-16) before and after a swap, with the longest result the fixture can give.

Preconditions:

- Viewport 375 × 812 px.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Select "US Dollar (USD)" in **From** and "Pepe (PEPE)" in **To**
- Type `1000000000` in **Amount**
  *Expected*: The result reads `1,000,000,000 USD = 243,957,010,000,000 PEPE`
  *Expected*: The result's bounding box lies within the viewport width
  *Expected*: `document.documentElement.scrollWidth` is not greater than `clientWidth`
- Click **Swap**
  *Expected*: The result reads `1,000,000,000 PEPE = 4,099.0829 USD`
  *Expected*: The result's bounding box lies within the viewport width
  *Expected*: `document.documentElement.scrollWidth` is not greater than `clientWidth`
