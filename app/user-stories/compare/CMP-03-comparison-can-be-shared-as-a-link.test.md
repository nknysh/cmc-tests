<!-- suite
tags: compare, CMP-03
-->

# CMP-03: Comparison can be shared as a link

Covers [CMP-03](CMP-03-comparison-can-be-shared-as-a-link.md): the page address holds the compared pair as `#/compare?a=<first slug>&b=<second slug>`, so the pair can be bookmarked or shared.

Preconditions for all tests:

- The app runs at the Playwright `baseURL`. Paths below are relative to it.
- Every test serves the committed fixture `app/public/data/latest.json` (taken 2026-10-15T15:12 UTC, 100 coins) by routing `**/data/latest.json` to that file with `page.route`, so results don't depend on the snapshot the app is deployed with.
- In the fixture the top four coins are: 1 Bitcoin (BTC, slug `bitcoin`), 2 Ethereum (ETH, `ethereum`), 3 Tether USDt (USDT, `tether`), 4 BNB (BNB, `bnb`). No coin has the slug `not-a-coin` or `BNB`.
- Tests with a "Stubbed snapshot" precondition route `**/data/latest.json` to a modified copy of the fixture instead, built exactly as the test describes. The app lists coins in the order of the `coins` array, not by their `rank` field, so a stub that changes the ranking changes both. Every price in a stub stays above 0, so APP-06 doesn't reject it.

Conventions:

- The app uses hash routing. "The address is `#/compare` with `a=X`, `b=Y`" means the route in the URL hash is `/compare` and its query has exactly those parameters, in any order. "With no query" means the hash is exactly `#/compare`.
- "Select X in **First coin**" selects the option labelled X in the select labelled **First coin**. "**First coin** shows X" means the selected option's label is X.
- "The comparison table" is the table named "Coin comparison". "The comparison shows A and B" means its left coin column is headed A and its right one B.
- "Shown as an alert" means an element with role `alert` has exactly that text.

<!-- test
labels: Severity: critical
-->

# Choosing a First coin puts both coins' slugs in the address

Covers AC-1. The untouched Second coin's slug is written too, not only the changed one.

## Steps

- Open `/#/compare`
  *Expected*: The address is `#/compare` with no query
- Select "BNB (BNB)" in **First coin**
  *Expected*: The address is `#/compare` with `a=bnb`, `b=ethereum`

<!-- test
labels: Severity: normal
-->

# Choosing only a Second coin keeps the default First coin's slug in the address

Covers AC-1 when only the Second coin changes.

## Steps

- Open `/#/compare`
  *Expected*: The comparison shows Bitcoin and Ethereum
- Select "Tether USDt (USDT)" in **Second coin**
  *Expected*: The address is `#/compare` with `a=bitcoin`, `b=tether`

<!-- test
labels: Severity: critical
-->

# User opening a shared address sees that pair with a as First coin

Covers AC-2. The pair is neither the default nor in rank order, so the result can only come from the address.

## Steps

- Open `/#/compare?a=bnb&b=tether`
  *Expected*: **First coin** shows "BNB (BNB)"
  *Expected*: **Second coin** shows "Tether USDt (USDT)"
  *Expected*: The comparison shows BNB and Tether USDt

<!-- test
labels: Severity: normal
-->

# Reloading the page keeps the chosen pair

Covers AC-1 and AC-2 together: a pair chosen in the UI survives a reload, as it would when bookmarked.

## Steps

- Open `/#/compare`
  *Expected*: The comparison table is visible
- Select "BNB (BNB)" in **First coin**
  *Expected*: The address is `#/compare` with `a=bnb`, `b=ethereum`
- Reload the page
  *Expected*: **First coin** shows "BNB (BNB)"
  *Expected*: **Second coin** shows "Ethereum (ETH)"
  *Expected*: The comparison shows BNB and Ethereum

<!-- test
labels: Severity: normal
-->

# Address without a uses the top-ranked coin as First coin

Covers AC-3 for a missing `a` with the fixture ranking; the stubbed test below checks a different ranking.

## Steps

- Open `/#/compare?b=bnb`
  *Expected*: **First coin** shows "Bitcoin (BTC)"
  *Expected*: **Second coin** shows "BNB (BNB)"
  *Expected*: The comparison shows Bitcoin and BNB

<!-- test
labels: Severity: normal
-->

# Address without b uses the second-ranked coin as Second coin

Covers AC-3 for a missing `b` with the fixture ranking; the stubbed test below checks a different ranking.

## Steps

- Open `/#/compare?a=tether`
  *Expected*: **First coin** shows "Tether USDt (USDT)"
  *Expected*: **Second coin** shows "Ethereum (ETH)"
  *Expected*: The comparison shows Tether USDt and Ethereum

<!-- test
labels: Severity: normal
-->

# Address without a uses the top-ranked coin when Ethereum is ranked above Bitcoin

Covers AC-3 for a missing `a` with a ranking where the top coin isn't Bitcoin.

Preconditions:

- Stubbed snapshot: the fixture with its first two `coins` entries swapped, Ethereum's `rank` set to 1 and Bitcoin's `rank` set to 2.

## Steps

- Open `/#/compare?b=bnb`
  *Expected*: **First coin** shows "Ethereum (ETH)"
  *Expected*: **Second coin** shows "BNB (BNB)"
  *Expected*: The comparison shows Ethereum and BNB

<!-- test
labels: Severity: normal
-->

# Address without b uses the second-ranked coin when Ethereum is ranked above Bitcoin

Covers AC-3 for a missing `b` with a ranking where the second coin isn't Ethereum.

Preconditions:

- Stubbed snapshot: the fixture with its first two `coins` entries swapped, Ethereum's `rank` set to 1 and Bitcoin's `rank` set to 2.

## Steps

- Open `/#/compare?a=tether`
  *Expected*: **First coin** shows "Tether USDt (USDT)"
  *Expected*: **Second coin** shows "Bitcoin (BTC)"
  *Expected*: The comparison shows Tether USDt and Bitcoin

<!-- test
labels: Severity: normal
-->

# Address naming a coin not in the snapshot falls back to that choice's default

Covers AC-5 for an unknown slug, an empty value and a slug in the wrong case (slugs are case-sensitive). Each row keeps the other coin off its default, so the result can only come from the fallback. Run once per row, each in a fresh page.

| Address | First coin shows | Second coin shows |
| --- | --- | --- |
| `/#/compare?a=not-a-coin&b=tether` | Bitcoin (BTC) | Tether USDt (USDT) |
| `/#/compare?a=tether&b=not-a-coin` | Tether USDt (USDT) | Ethereum (ETH) |
| `/#/compare?a=&b=bnb` | Bitcoin (BTC) | BNB (BNB) |
| `/#/compare?a=BNB&b=tether` | Bitcoin (BTC) | Tether USDt (USDT) |

## Steps

- Open the address
  *Expected*: **First coin** and **Second coin** show the coins in that row
  *Expected*: The comparison shows the same two coins, by name
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# Choosing a coin after a fallback replaces the unknown slug in the address

Covers AC-5 together with AC-1: once a coin is chosen, the address holds the coins shown, not the unknown slug.

## Steps

- Open `/#/compare?a=not-a-coin&b=tether`
  *Expected*: **First coin** shows "Bitcoin (BTC)"
- Select "BNB (BNB)" in **Second coin**
  *Expected*: The address is `#/compare` with `a=bitcoin`, `b=bnb`
  *Expected*: The comparison shows Bitcoin and BNB

<!-- test
labels: Severity: normal
-->

# Address naming the same coin twice shows the pick-two-different-coins message

Covers AC-6 through the address. CMP-01 covers the same message when the coins are chosen in the selects.

## Steps

- Open `/#/compare?a=bnb&b=bnb`
  *Expected*: "Pick two different coins to compare." is shown as an alert
  *Expected*: The comparison table is not in the page
  *Expected*: **First coin** and **Second coin** both show "BNB (BNB)"

<!-- test
labels: Severity: normal
-->

# Back leaves the Compare page after several coin changes

Covers AC-4. Coin changes replace the current history entry instead of adding new ones, so one Back goes to the page before Compare.

## Steps

- Open `/#/`
  *Expected*: The address is `#/`
- Click the **Compare** link in the navigation named "Main"
  *Expected*: The level-1 heading is "Compare coins"
- Select "BNB (BNB)" in **First coin**
  *Expected*: The address is `#/compare` with `a=bnb`, `b=ethereum`
- Select "Tether USDt (USDT)" in **Second coin**
  *Expected*: The address is `#/compare` with `a=bnb`, `b=tether`
- Select "Ethereum (ETH)" in **First coin**
  *Expected*: The address is `#/compare` with `a=ethereum`, `b=tether`
- Go back once in browser history
  *Expected*: The address is `#/`
  *Expected*: The heading "Compare coins" is not in the page

<!-- test
labels: Severity: normal
-->

# Compare link in the main navigation opens the default pair

Covers AC-7. The link carries no pair, so it opens the default pair (CMP-01/AC-3).

## Steps

- Open `/#/`
  *Expected*: The address is `#/`
- Read the `href` of the **Compare** link in the navigation named "Main"
  *Expected*: It is exactly `#/compare`
- Click the **Compare** link
  *Expected*: The address is `#/compare` with no query
  *Expected*: **First coin** shows "Bitcoin (BTC)"
  *Expected*: **Second coin** shows "Ethereum (ETH)"
