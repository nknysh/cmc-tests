<!-- suite
tags: compare, CMP-01
-->

# CMP-01: Two coins can be compared

Covers [CMP-01](CMP-01-two-coins-can-be-compared.md): the Compare page shows two coin choices and a side-by-side comparison of the chosen pair.

Preconditions for all tests:

- The app runs at the Playwright `baseURL`. Paths below are relative to it.
- Every test serves the committed fixture `app/public/data/latest.json` (taken 2026-10-15T15:12 UTC, 100 coins) by routing `**/data/latest.json` to that file with `page.route`, so results don't depend on the snapshot the app is deployed with.
- In the fixture the top four coins are: 1 Bitcoin (BTC, slug `bitcoin`), 2 Ethereum (ETH, `ethereum`), 3 Tether USDt (USDT, `tether`), 4 BNB (BNB, `bnb`). Rank 100, the last entry, is Bitcoin SV (BSV).
- Tests with a "Stubbed snapshot" precondition route `**/data/latest.json` to a modified copy of the fixture instead, built exactly as the test describes. The app lists coins in the order of the `coins` array, not by their `rank` field, so a stub that changes the ranking changes both. Every price in a stub stays above 0, so APP-06 doesn't reject it.

Conventions:

- "Select X in **First coin**" selects the option labelled X in the select labelled **First coin**. "**First coin** shows X" means the selected option's label is X.
- "The comparison table" is the table named "Coin comparison". The left and right coin columns are its second and third header cells. "The Rank row shows V in the C column" means the cell in the row headed Rank, under the column headed C, has the text V.
- "Shown as an alert" means an element with role `alert` has exactly that text.

<!-- test
labels: Severity: blocker
-->

# User sees the Compare coins page with First coin and Second coin choices

Covers AC-1.

## Steps

- Open `/#/compare`
  *Expected*: The level-1 heading is "Compare coins"
  *Expected*: A select labelled **First coin** is visible
  *Expected*: A select labelled **Second coin** is visible
  *Expected*: The comparison table is visible

<!-- test
labels: Severity: normal
-->

# Coin choices offer every snapshot coin as name and symbol without US Dollar

Covers the content part of AC-2. Both choices offer the same 100 coins, and neither offers US dollars (unlike the Converter).

## Steps

- Open `/#/compare`
  *Expected*: The comparison table is visible
- Read the option labels of **First coin**
  *Expected*: There are exactly 100 options
  *Expected*: Each label equals "<name> (<symbol>)" of the fixture entry at the same position, for example "Bitcoin (BTC)" and "Tether USDt (USDT)"
  *Expected*: No label is "US Dollar (USD)"
- Read the option labels of **Second coin**
  *Expected*: The labels equal those of **First coin**, in the same order

<!-- test
labels: Severity: normal
-->

# Coin choices list coins in rank order

Covers the ordering part of AC-2.

## Steps

- Open `/#/compare`
  *Expected*: The comparison table is visible
- Read the option labels of **First coin**
  *Expected*: The first four labels are "Bitcoin (BTC)", "Ethereum (ETH)", "Tether USDt (USDT)", "BNB (BNB)"
  *Expected*: The last label is "Bitcoin SV (BSV)"
- Read the option labels of **Second coin**
  *Expected*: The labels are in the same order as in **First coin**

<!-- test
labels: Severity: critical
-->

# User sees the top two ranked coins compared by default

Covers AC-3 with the fixture, where the top two coins are Bitcoin and Ethereum.

## Steps

- Open `/#/compare`
  *Expected*: **First coin** shows "Bitcoin (BTC)"
  *Expected*: **Second coin** shows "Ethereum (ETH)"
  *Expected*: The left coin column is headed "Bitcoin" and the right one "Ethereum"

<!-- test
labels: Severity: normal
-->

# Default pair follows the ranking when Ethereum is ranked above Bitcoin

Covers AC-3 "whichever coins those are".

Preconditions:

- Stubbed snapshot: the fixture with its first two `coins` entries swapped, Ethereum's `rank` set to 1 and Bitcoin's `rank` set to 2.

## Steps

- Open `/#/compare`
  *Expected*: **First coin** shows "Ethereum (ETH)"
  *Expected*: **Second coin** shows "Bitcoin (BTC)"
  *Expected*: The left coin column is headed "Ethereum"

<!-- test
labels: Severity: normal
-->

# Default pair follows the ranking when Bitcoin is not in the snapshot

Covers AC-3 when the usual top coin has left the snapshot.

Preconditions:

- Stubbed snapshot: the fixture with the Bitcoin entry (slug `bitcoin`) removed and every remaining `rank` lowered by 1, so Ethereum is rank 1 and Tether USDt rank 2.

## Steps

- Open `/#/compare`
  *Expected*: **First coin** shows "Ethereum (ETH)"
  *Expected*: **Second coin** shows "Tether USDt (USDT)"
  *Expected*: The left coin column is headed "Ethereum" and the right one "Tether USDt"
  *Expected*: No alert is shown

<!-- test
labels: Severity: critical
-->

# User can change the First coin and see the comparison update at once

Covers AC-4 for the First coin. There is no submit button: the table changes as soon as a coin is picked.

## Steps

- Open `/#/compare`
  *Expected*: The left coin column is headed "Bitcoin" and the right one "Ethereum"
- Select "BNB (BNB)" in **First coin**
  *Expected*: The left coin column is headed "BNB"
  *Expected*: The right coin column is still headed "Ethereum"
  *Expected*: The Rank row shows `#4` in the BNB column
  *Expected*: The page has no button named "Submit", "Apply" or "Compare"

<!-- test
labels: Severity: critical
-->

# User can change the Second coin and see the comparison update at once

Covers AC-4 for the Second coin.

## Steps

- Open `/#/compare`
  *Expected*: The left coin column is headed "Bitcoin" and the right one "Ethereum"
- Select "Tether USDt (USDT)" in **Second coin**
  *Expected*: The right coin column is headed "Tether USDt"
  *Expected*: The left coin column is still headed "Bitcoin"
  *Expected*: The Price row shows `$0.999` in the Tether USDt column

<!-- test
labels: Severity: critical
-->

# Comparison shows one column per coin with the First coin on the left

Covers AC-5. A pair that isn't the default, and isn't in rank order, makes sure the columns follow the choices and not the ranking.

## Steps

- Open `/#/compare`
  *Expected*: The comparison table is visible
- Select "BNB (BNB)" in **First coin**
  *Expected*: The left coin column is headed "BNB"
- Select "Bitcoin (BTC)" in **Second coin**
  *Expected*: The header cells read "Metric", "BNB", "Bitcoin" from left to right, and there are no others
  *Expected*: The Rank row reads `#4` then `#1`

<!-- test
labels: Severity: normal
-->

# User sees a pick-two-different-coins message when the same coin is chosen for both

Covers AC-6.

## Steps

- Open `/#/compare`
  *Expected*: The comparison table is visible
- Select "Bitcoin (BTC)" in **Second coin**
  *Expected*: "Pick two different coins to compare." is shown as an alert
  *Expected*: The comparison table is not in the page
  *Expected*: **First coin** and **Second coin** both show "Bitcoin (BTC)"

<!-- test
labels: Severity: normal
-->

# User can get the comparison back after choosing the same coin twice

Covers AC-4 and AC-6 together: the message goes away as soon as the pair is valid again.

## Steps

- Open `/#/compare`
  *Expected*: The comparison table is visible
- Select "Ethereum (ETH)" in **First coin**
  *Expected*: "Pick two different coins to compare." is shown as an alert
- Select "BNB (BNB)" in **Second coin**
  *Expected*: No alert is shown
  *Expected*: The left coin column is headed "Ethereum" and the right one "BNB"

<!-- test
labels: Severity: critical
-->

# Missing First coin falls back to the top-ranked coin

Covers AC-7 for the First coin: a bookmarked pair whose coin dropped out of a newer snapshot. The Second coin is Tether USDt, so the result can't be mistaken for the default pair.

Preconditions:

- Stubbed snapshot: the fixture with the BNB entry (slug `bnb`) removed. Other entries are unchanged.

## Steps

- Open `/#/compare?a=bnb&b=tether`
  *Expected*: **First coin** shows "Bitcoin (BTC)"
  *Expected*: **Second coin** shows "Tether USDt (USDT)"
  *Expected*: The left coin column is headed "Bitcoin" and the right one "Tether USDt"
  *Expected*: No alert is shown

<!-- test
labels: Severity: critical
-->

# Missing Second coin falls back to the second-ranked coin

Covers AC-7 for the Second coin.

Preconditions:

- Stubbed snapshot: the fixture with the BNB entry (slug `bnb`) removed. Other entries are unchanged.

## Steps

- Open `/#/compare?a=tether&b=bnb`
  *Expected*: **First coin** shows "Tether USDt (USDT)"
  *Expected*: **Second coin** shows "Ethereum (ETH)"
  *Expected*: The left coin column is headed "Tether USDt" and the right one "Ethereum"
  *Expected*: No alert is shown

<!-- test
labels: Severity: normal
-->

# Same missing coin chosen twice falls back to the default pair

Covers AC-7 for both choices at once: each falls back to its own default, so the pair is valid and AC-6 doesn't apply.

Preconditions:

- Stubbed snapshot: the fixture with the BNB entry (slug `bnb`) removed. Other entries are unchanged.

## Steps

- Open `/#/compare?a=bnb&b=bnb`
  *Expected*: **First coin** shows "Bitcoin (BTC)"
  *Expected*: **Second coin** shows "Ethereum (ETH)"
  *Expected*: The left coin column is headed "Bitcoin" and the right one "Ethereum"
  *Expected*: No alert is shown

<!-- test
labels: Severity: minor
-->

# Fallback to the other choice's coin shows the pick-two-different-coins message

Covers AC-8: the missing First coin falls back to Bitcoin, which is already the Second coin.

Preconditions:

- Stubbed snapshot: the fixture with the BNB entry (slug `bnb`) removed. Other entries are unchanged.

## Steps

- Open `/#/compare?a=bnb&b=bitcoin`
  *Expected*: "Pick two different coins to compare." is shown as an alert
  *Expected*: The comparison table is not in the page
  *Expected*: **First coin** and **Second coin** both show "Bitcoin (BTC)"
