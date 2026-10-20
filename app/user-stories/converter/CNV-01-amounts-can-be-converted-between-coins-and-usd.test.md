<!-- suite
tags: converter, CNV-01
-->

# CNV-01: Amounts can be converted between coins and USD

Covers [CNV-01](CNV-01-amounts-can-be-converted-between-coins-and-usd.md): the Converter page converts an Amount from one currency to another, with US dollars and every snapshot coin on offer.

Preconditions for all tests:

- The app runs at the Playwright `baseURL`. Paths below are relative to it.
- Every test serves the committed fixture `app/public/data/latest.json` (taken 2026-10-15T15:12 UTC, 100 coins) by routing `**/data/latest.json` to that file with `page.route`, so results don't depend on the snapshot the app is deployed with.
- In the fixture the top four coins are: 1 Bitcoin (BTC, slug `bitcoin`), 2 Ethereum (ETH, `ethereum`), 3 Tether USDt (USDT, `tether`), 4 BNB (BNB, `bnb`). Rank 50 is Pepe (PEPE, `pepe`). Rank 100, the last entry, is Bitcoin SV (BSV).
- Tests with a "Stubbed snapshot" precondition route `**/data/latest.json` to a modified copy of the fixture instead, built exactly as the test describes. The app lists coins in the order of the `coins` array, not by their `rank` field, so a stub that changes the ranking changes both. Every price in a stub stays above 0, so APP-06 doesn't reject it.

Conventions:

- "**Amount**" is the text box labelled Amount. "Type X in **Amount**" clears it first, then types X key by key, with focus left in it. "Fill **Amount** with X" sets its value to X in one step.
- "Select X in **From**" selects the option labelled X in the select labelled **From**; likewise **To**. "**From** shows X" means the selected option's label is X.
- "The result" is the `output` element after the form (`data-testid="conversion-result"`). "The result reads X" means its text is exactly X.
- "The empty error" is "Enter an amount of 0 or more."; "the max error" is "Enter an amount up to 1,000,000,000.". "Shown as an alert" means an element with role `alert` has exactly that text. "**Amount** is marked invalid" means it has `aria-invalid="true"` and its `aria-describedby` points to the alert; "marked valid" means `aria-invalid="false"`.

Formats:

```
Amount         up to 8 significant digits, thousands separators, plain digits (never 1e+21 or 1e-8):
               123,456,790   2.5   0.000012184033
Converted      Amount × From's USD price ÷ To's USD price, USD's price being 1, same format as Amount
```

Fixture results used below, as the app shows them:

| Pair | Amount | Result |
| --- | --- | --- |
| BTC → USD | 1 | `1 BTC = 82,074.628 USD` |
| BTC → USD | 2.5 | `2.5 BTC = 205,186.57 USD` |
| BTC → USD | 3 | `3 BTC = 246,223.88 USD` |
| BTC → USD | 5 | `5 BTC = 410,373.14 USD` |
| BTC → USD | 123456789 | `123,456,790 BTC = 10,132,670,000,000 USD` |
| BTC → USD | 1000000000 | `1,000,000,000 BTC = 82,074,628,000,000 USD` |
| USD → BTC | 1 | `1 USD = 0.000012184033 BTC` |
| BTC → ETH | 1 | `1 BTC = 33.954283 ETH` |
| BTC → ETH | 5 | `5 BTC = 169.77141 ETH` |
| BNB → ETH | 5 | `5 BNB = 1.51045 ETH` |
| ETH → USD | 1 | `1 ETH = 2,417.2099 USD` |
| ETH → USDT | 1 | `1 ETH = 2,419.6858 USDT` |
| PEPE → USD | 0.00000001 | `0.00000001 PEPE = 0.000000000000040990829 USD` |
| USD → PEPE | 1000000000 | `1,000,000,000 USD = 243,957,010,000,000 PEPE` |

<!-- test
labels: Severity: blocker
-->

# User sees the Converter page with Amount, From and To

Covers AC-1.

## Steps

- Open `/#/converter`
  *Expected*: The level-1 heading is "Converter"
  *Expected*: A text box labelled **Amount** is visible
  *Expected*: A select labelled **From** is visible
  *Expected*: A select labelled **To** is visible
  *Expected*: The result is visible

<!-- test
labels: Severity: critical
-->

# User sees 1 Bitcoin converted to US dollars by default

Covers AC-2 with the fixture, where the top-ranked coin is Bitcoin, and the result format of AC-4.

## Steps

- Open `/#/converter`
  *Expected*: **Amount** has the value `1`
  *Expected*: **From** shows "Bitcoin (BTC)"
  *Expected*: **To** shows "US Dollar (USD)"
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# Default From follows the ranking when Ethereum is ranked above Bitcoin

Covers AC-2 "the top-ranked snapshot coin", whichever coin that is.

Preconditions:

- Stubbed snapshot: the fixture with its first two `coins` entries swapped, Ethereum's `rank` set to 1 and Bitcoin's `rank` set to 2.

## Steps

- Open `/#/converter`
  *Expected*: **From** shows "Ethereum (ETH)"
  *Expected*: **To** shows "US Dollar (USD)"
  *Expected*: The result reads `1 ETH = 2,417.2099 USD`

<!-- test
labels: Severity: normal
-->

# Default From falls back to the top-ranked coin when Bitcoin is not in the snapshot

Covers AC-2 and AC-15 for the From default: Bitcoin isn't shown or converted, and no error appears. The snapshot is loaded once and Converter choices aren't kept (AC-11), so a coin the user picked can't drop out of the snapshot during a session; the default From is the only reachable fallback.

Preconditions:

- Stubbed snapshot: the fixture with the Bitcoin entry (slug `bitcoin`) removed and every remaining `rank` lowered by 1, so Ethereum is rank 1.

## Steps

- Open `/#/converter`
  *Expected*: **From** shows "Ethereum (ETH)"
  *Expected*: No option of **From** or **To** is "Bitcoin (BTC)"
  *Expected*: The result reads `1 ETH = 2,417.2099 USD`
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# From and To offer US Dollar first, then every snapshot coin in rank order

Covers AC-3.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Read the option labels of **From**
  *Expected*: There are exactly 101 options
  *Expected*: The first label is "US Dollar (USD)"
  *Expected*: Labels 2 to 101 each equal "<name> (<symbol>)" of the fixture entry at the same position, for example "Bitcoin (BTC)" and "Tether USDt (USDT)"
  *Expected*: Labels 2 to 5 are "Bitcoin (BTC)", "Ethereum (ETH)", "Tether USDt (USDT)", "BNB (BNB)", and the last label is "Bitcoin SV (BSV)"
- Read the option labels of **To**
  *Expected*: The labels equal those of **From**, in the same order

<!-- test
labels: Severity: critical
-->

# User can convert between two coins

Covers AC-4 and AC-5 for a pair without USD: 82,074.6276… ÷ 2,417.2098… = 33.954283….

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Select "Ethereum (ETH)" in **To**
  *Expected*: The result reads `1 BTC = 33.954283 ETH`

<!-- test
labels: Severity: critical
-->

# User can convert a decimal amount

Covers AC-5 with a fractional Amount: 2.5 × 82,074.6276… = 205,186.569….

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type `2.5` in **Amount**
  *Expected*: The result reads `2.5 BTC = 205,186.57 USD`
  *Expected*: **Amount** is marked valid

<!-- test
labels: Severity: normal
-->

# Converting US dollars to a coin shows a small result in plain digits

Covers AC-5 with USD as From (price 1) and AC-6 for a result below 1: it keeps 8 significant digits after the leading zeros and isn't shown in scientific notation.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Select "US Dollar (USD)" in **From**
- Select "Bitcoin (BTC)" in **To**
  *Expected*: The result reads `1 USD = 0.000012184033 BTC`

<!-- test
labels: Severity: normal
-->

# Large amounts round to 8 significant digits with thousands separators

Covers AC-6 for large numbers, including the repeated Amount: `123456789` has 9 significant digits, so it reads `123,456,790`, and the converted amount above 10¹³ stays in plain digits.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type `123456789` in **Amount**
  *Expected*: The result reads `123,456,790 BTC = 10,132,670,000,000 USD`
  *Expected*: **Amount** still has the value `123456789`

<!-- test
labels: Severity: minor
-->

# Tiny amounts and results show in plain digits, not scientific notation

Covers AC-6 for very small numbers: `0.00000001` and the converted 4.0990829 × 10⁻¹⁴ both show as plain decimals.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Select "Pepe (PEPE)" in **From**
- Type `0.00000001` in **Amount**
  *Expected*: The result reads `0.00000001 PEPE = 0.000000000000040990829 USD`
  *Expected*: The result has no exponent such as `e-14` (a digit, `e` or `E`, an optional sign, a digit)

<!-- test
labels: Severity: critical
-->

# Result updates at once when Amount, From or To changes

Covers AC-7. There is no submit button: each change is reflected before the next one is made.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
  *Expected*: The page has no button named "Convert", "Submit" or "Apply"
- Type `5` in **Amount**
  *Expected*: The result reads `5 BTC = 410,373.14 USD`
- Select "Ethereum (ETH)" in **To**
  *Expected*: The result reads `5 BTC = 169.77141 ETH`
- Select "BNB (BNB)" in **From**
  *Expected*: The result reads `5 BNB = 1.51045 ETH`

<!-- test
labels: Severity: normal
-->

# Converting a currency to itself gives the same amount

Covers AC-8 for a coin and for US dollars. Run once per row, each in a fresh page.

| Amount | From | To | Result |
| --- | --- | --- | --- |
| `2.5` | Bitcoin (BTC) | Bitcoin (BTC) | `2.5 BTC = 2.5 BTC` |
| `1` | US Dollar (USD) | US Dollar (USD) | `1 USD = 1 USD` |

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type the row's Amount in **Amount**
- Select the row's From in **From** and the row's To in **To**
  *Expected*: **From** and **To** both show the row's currency
  *Expected*: The result reads the row's Result
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# Amount of zero converts to zero without an error

Covers AC-9.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type `0` in **Amount**
  *Expected*: The result reads `0 BTC = 0 USD`
  *Expected*: No alert is shown
  *Expected*: **Amount** is marked valid

<!-- test
labels: Severity: critical
-->

# Empty Amount shows an error and no result until a value is entered

Covers AC-10: the error appears as soon as Amount is emptied, without leaving the field, and clears as soon as it's valid again.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Clear **Amount**, leaving focus in it
  *Expected*: The empty error is shown as an alert
  *Expected*: **Amount** is marked invalid
  *Expected*: The result reads `—`
- Type `3` in **Amount**
  *Expected*: No alert is shown
  *Expected*: **Amount** is marked valid
  *Expected*: The result reads `3 BTC = 246,223.88 USD`

<!-- test
labels: Severity: normal
-->

# Amount and currencies reset to the defaults after leaving the page

Covers AC-11.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type `5` in **Amount**
- Select "Ethereum (ETH)" in **From** and "Tether USDt (USDT)" in **To**
  *Expected*: The result reads `5 ETH = 12,098.429 USDT`
- Click the **Markets** link in the navigation named "Main"
  *Expected*: The address is `#/`
- Click the **Converter** link in the navigation named "Main"
  *Expected*: **Amount** has the value `1`
  *Expected*: **From** shows "Bitcoin (BTC)"
  *Expected*: **To** shows "US Dollar (USD)"
  *Expected*: The result reads `1 BTC = 82,074.628 USD`

<!-- test
labels: Severity: normal
-->

# Typed characters other than digits and one decimal point are ignored

Covers AC-12 for typing. Each row types its keys one by one into an Amount of `2.5` with the caret at the end; the rejected character is dropped and the rest are kept. Run once per row, each in a fresh page.

| Keys typed | Amount after typing | Result |
| --- | --- | --- |
| `-` | `2.5` | `2.5 BTC = 205,186.57 USD` |
| `+` | `2.5` | `2.5 BTC = 205,186.57 USD` |
| `e3` | `2.53` | `2.53 BTC = 207,648.81 USD` |
| `,` | `2.5` | `2.5 BTC = 205,186.57 USD` |
| `a` | `2.5` | `2.5 BTC = 205,186.57 USD` |
| ` ` (space) | `2.5` | `2.5 BTC = 205,186.57 USD` |
| `.` | `2.5` | `2.5 BTC = 205,186.57 USD` |

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type `2.5` in **Amount**
  *Expected*: The result reads `2.5 BTC = 205,186.57 USD`
- Press the row's keys one by one in **Amount**
  *Expected*: **Amount** has the row's value
  *Expected*: The result reads the row's Result
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# Pasting text with characters other than digits and a decimal point leaves Amount unchanged

Covers AC-12 for pasting: a paste is accepted or rejected whole, never partly cleaned. Each row selects all of an Amount of `1` and pastes the row's text over it, through the clipboard (a real paste event, not a value set by script). Run once per row, each in a fresh page.

| Pasted text | Amount after pasting | Result |
| --- | --- | --- |
| `-5` | `1` | `1 BTC = 82,074.628 USD` |
| `1e3` | `1` | `1 BTC = 82,074.628 USD` |
| `1,000` | `1` | `1 BTC = 82,074.628 USD` |
| `2.5.1` | `1` | `1 BTC = 82,074.628 USD` |
| ` 2.5` | `1` | `1 BTC = 82,074.628 USD` |
| `2.5` | `2.5` | `2.5 BTC = 205,186.57 USD` |

## Steps

- Open `/#/converter`
  *Expected*: **Amount** has the value `1`
- Select all text in **Amount** and paste the row's text
  *Expected*: **Amount** has the row's value
  *Expected*: The result reads the row's Result
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# Amount above one billion shows the max error

Covers AC-13 at its boundary. `1000000000` is the largest valid Amount; anything above it, even by a fraction, is invalid. Run once per row, each in a fresh page.

| Amount | Error | Result |
| --- | --- | --- |
| `1000000000` | none | `1,000,000,000 BTC = 82,074,628,000,000 USD` |
| `1000000000.0` | none | `1,000,000,000 BTC = 82,074,628,000,000 USD` |
| `1000000000.00000001` | the max error | `—` |
| `1000000001` | the max error | `—` |
| `99999999999` | the max error | `—` |

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type the row's Amount in **Amount**
  *Expected*: The result reads the row's Result
  *Expected*: For a row with no error, no alert is shown and **Amount** is marked valid
  *Expected*: For a row with the max error, it is shown as an alert and **Amount** is marked invalid

<!-- test
labels: Severity: normal
-->

# Incomplete Amount shows no result while typing and the error once focus leaves

Covers AC-14 for an Amount ending in `.` and a lone `.`. Run once per row, each in a fresh page.

| Incomplete Amount | Completed Amount | Result when completed |
| --- | --- | --- |
| `2.` | `2.5` | `2.5 BTC = 205,186.57 USD` |
| `.` | `.5` | `0.5 BTC = 41,037.314 USD` |

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type the row's Incomplete Amount in **Amount**
  *Expected*: The result reads `—`
  *Expected*: No alert is shown
  *Expected*: **Amount** is marked valid
- Move focus out of **Amount** by pressing Tab
  *Expected*: The empty error is shown as an alert
  *Expected*: **Amount** is marked invalid
  *Expected*: The result reads `—`
- Focus **Amount**, press End, then press `5`
  *Expected*: **Amount** has the row's Completed Amount
  *Expected*: No alert is shown
  *Expected*: The result reads the row's Result when completed

<!-- test
labels: Severity: minor
-->

# Long result wraps within the page on a narrow screen

Covers AC-16 with the longest result the fixture can give (44 characters). The page's own sideways scroll isn't checked: at this width the header's navigation can overflow by itself, depending on the platform's fonts, which says nothing about the result.

Preconditions:

- Viewport 375 × 812 px.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Select "US Dollar (USD)" in **From** and "Pepe (PEPE)" in **To**
- Type `1000000000` in **Amount**
  *Expected*: The result reads `1,000,000,000 USD = 243,957,010,000,000 PEPE`
  *Expected*: The result is fully in view, and every line of its text lies within the viewport width
  *Expected*: The result is taller than one line of its text, so it has wrapped

<!-- test
labels: Severity: normal
-->

# Converter can be used from the keyboard and announces changes

Covers AC-17. Tab order is Amount, From, Swap, To. Selects are changed by type-ahead (typing an option's first letter selects the next option starting with it), which works the same on every platform. Screen reader output itself isn't checked: the test checks the roles that make it announce.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
  *Expected*: The result is an `output` element with `aria-live="polite"`
- Focus **Amount**, press End, then Backspace
  *Expected*: The empty error is shown as an alert (role `alert`)
- Type `1` in **Amount**
  *Expected*: No alert is shown
- Press Tab
  *Expected*: **From** has focus
- Press `E`
  *Expected*: **From** shows "Ethereum (ETH)"
  *Expected*: The result reads `1 ETH = 2,417.2099 USD`
- Press Tab twice
  *Expected*: **To** has focus
- Press `T`
  *Expected*: **To** shows "Tether USDt (USDT)"
  *Expected*: The result reads `1 ETH = 2,419.6858 USDT`

<!-- test
labels: Severity: normal
-->

# Pressing Enter in Amount keeps the Converter open

Covers AC-18. The Amount sits in a form, so this checks that its submit doesn't reload or navigate.

## Steps

- Open `/#/converter`
  *Expected*: The result reads `1 BTC = 82,074.628 USD`
- Type `2.5` in **Amount**
  *Expected*: The result reads `2.5 BTC = 205,186.57 USD`
- Press Enter in **Amount**
  *Expected*: The address is still `#/converter`, with no query
  *Expected*: The page didn't reload (no new `load` event and no new request for `data/latest.json`)
  *Expected*: **Amount** still has the value `2.5`
  *Expected*: The result still reads `2.5 BTC = 205,186.57 USD`
