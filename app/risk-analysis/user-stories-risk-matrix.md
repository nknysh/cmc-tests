# CoinBoard user stories: risk matrix

Risk analysis of the 38 user stories in [`app/user-stories/`](../user-stories/README.md), done on 2026-10-21.

- **Impact (1–5):** how badly a bug in the story would hurt the main flow: load the data → browse the coin list → open a coin → convert or track holdings. Wrong prices, totals or values, and anything that blocks the coin list, score highest.
- **Probability of failure (1–5):** how complex the story's logic is (calculations, state kept in the URL or browser storage, input parsing, time rules), the edge cases its open questions raise, and its "Known gaps" (behavior that doesn't meet the ACs yet). Only CMP-01 to CMP-03, CNV-01 and CNV-02 have test cases and automated specs, which lowers their probability a little.
- **Risk score:** Impact × Probability. 🔴 marks a score of 16 or more.
- ✅ marks a story that's already automated (has a spec in `tests/coinboard/specs/`).

## Risk matrix

| Impact ↓ / Probability → | **1 – Rare** | **2 – Unlikely** | **3 – Possible** | **4 – Likely** | **5 – Highly likely** |
|---|---|---|---|---|---|
| **1 – Minimal** | APP-05, COIN-04, COIN-05 | | | | |
| **2 – Low** | | APP-04, ✅ CMP-03, ✅ CNV-02, MKT-02, MKT-07, MKT-12, MKT-13, COIN-03 | MKT-03, MKT-08, MKT-11, MKT-16 | MKT-09 | |
| **3 – Medium** | | ✅ CMP-01, ✅ CMP-02, PRT-03 | MKT-01, MKT-05, MKT-10, PRT-02 | APP-02 | COIN-02 |
| **4 – High** | APP-01 | COIN-01, PRT-04 | ✅ CNV-01, MKT-06, MKT-14, MKT-17, PRT-01 | 🔴 PRT-05 | 🔴 MKT-15 |
| **5 – Critical** | | MKT-04 | | 🔴 APP-06 | 🔴 APP-03 |

## Ratings

| Story | Impact | Probability | Score | Why |
|---|---|---|---|---|
| APP-03 Market data load failure can be retried | 5 | 5 | 25 | Every section depends on the data load. The AC-7 gap (valid JSON that isn't a snapshot left the page blank) was fixed on 2026-10-21. |
| APP-06 Snapshots with invalid prices are rejected | 5 | 4 | 20 | A bug puts wrong prices into every section and chart. The fallback chain spans the deploy script and the app: previous snapshot, red marking, "no data". |
| MKT-15 Market view can be shared as a link | 4 | 5 | 20 | All Markets state (search, sort, filters, page) lives in the URL, so one bug breaks all of it. Fallback rules for bad values, back/forward handling, React Router transitions (a checkbox revert already had to be worked around), open question on sort direction. |
| PRT-05 Portfolio total and 24h change are correct | 4 | 4 | 16 | Shows the user's money. The 24h value is worked out backwards by dividing by (1 + change), with special cases for zero sums and the sign. |
| COIN-02 Coin price history can be viewed | 3 | 5 | 15 | Known gap: price history that is valid JSON but the wrong shape can break the chart (AC-11). Also UTC formatting and the snapshot-relative range. |
| APP-02 Data freshness is shown | 3 | 4 | 12 | Time thresholds, the 26h stale rule, a 30s timer, future timestamps, caching (AC-8). A bug lets users act on stale prices. |
| CNV-01 Amounts can be converted between coins and USD | 4 | 3 | 12 | Wrong conversions are financial misinformation. 18 ACs of input validation, 8-significant-digit formatting and fallbacks. Automated. |
| MKT-06 Coins can be filtered by name or symbol | 4 | 3 | 12 | The main way to find a coin. 250 ms debounce, trimming, reset to page 1. |
| MKT-14 Coin list can be paged | 4 | 3 | 12 | If it breaks, 75 of 100 coins can't be reached. Page clamping and reset to page 1 interact with every filter. |
| MKT-17 Coin list is usable on narrow screens | 4 | 3 | 12 | Phone users see only cards, a separate rendering path that must follow the same filters and sort. |
| PRT-01 Portfolio items can be added | 4 | 3 | 12 | The way into the portfolio. Merging into an existing holding uses floating-point addition. Kept in browser storage, where malformed data blanks the page. |
| MKT-04 Coin list shows market data | 5 | 2 | 10 | The core page and the way into coin details. Mostly display formatting. |
| MKT-01 Market summary shows correct data | 3 | 3 | 9 | Total market cap is derived, not reported (rounding is an open question). Headline figures. |
| MKT-05 Coins can be sorted | 3 | 3 | 9 | Default direction per column, rank tie-breaks in both directions, collation, reset to page 1. |
| MKT-10 Coins can be added to the watchlist | 3 | 3 | 9 | Kept in browser storage, where malformed data blanks the page. Must stay in sync between the list and the details page. |
| PRT-02 Portfolio items can be edited | 3 | 3 | 9 | Float prefill open question (`0.30000000000000004`), dialog state, coins missing from the snapshot. |
| COIN-01 Coin details show price and changes | 4 | 2 | 8 | Where the main flow ends up. Mostly display. |
| PRT-04 Holdings show current value | 4 | 2 | 8 | A wrong value of the user's money. Simple multiplication plus the "Not in current data" case. |
| MKT-09 Coins can be filtered by market cap range | 2 | 4 | 8 | Free-text number parsing (`1e3` and `0x10` accepted, `1,5` rejected), two error states, invalid values kept in the URL. |
| CMP-01 Two coins can be compared | 3 | 2 | 6 | Secondary section with a fallback for unknown coins. Automated. |
| CMP-02 Comparison shows correct metrics | 3 | 2 | 6 | Formatting of ten metrics. Automated. |
| PRT-03 Portfolio items can be removed | 3 | 2 | 6 | Simple delete behind a confirmation dialog. |
| MKT-03 Top losers show correct data | 2 | 3 | 6 | Ties are ordered the opposite way to top gainers (open question). |
| MKT-08 Coins can be filtered by tags | 2 | 3 | 6 | OR logic, counts over the whole snapshot, unknown tag slugs from links. |
| MKT-11 Coins can be filtered to the watchlist | 2 | 3 | 6 | Coins that dropped out of the snapshot give the wrong empty-state message (open question). |
| MKT-16 Coins can be exported to CSV | 2 | 3 | 6 | Quoting and escaping, LF line endings with no BOM, possible formula injection. |
| APP-01 Sections can be reached from the main navigation | 4 | 1 | 4 | Blocks reaching sections if broken, but static and simple. |
| APP-04 Theme can be switched | 2 | 2 | 4 | Kept in browser storage; no flash of the other theme on load. |
| CMP-03 Comparison can be shared as a link | 2 | 2 | 4 | URL parsing with fallbacks. Automated. |
| CNV-02 Conversion direction can be swapped | 2 | 2 | 4 | Narrow behavior on top of CNV-01. Automated. |
| MKT-02 Top gainers show correct data | 2 | 2 | 4 | Filter, sort and tie-break over the snapshot. |
| MKT-07 Coins can be filtered by 24h movement | 2 | 2 | 4 | Three options; exactly 0% only under All. |
| MKT-12 Filters can be reset | 2 | 2 | 4 | Clears filters and keeps sort, rows per page and columns. |
| MKT-13 Coin list columns can be configured | 2 | 2 | 4 | Kept in browser storage; hiding the sort column is an open question. |
| COIN-03 Coin statistics show market and supply data | 2 | 2 | 4 | Formatting plus the supply share capped at 100%. |
| APP-05 Unknown address shows not found | 1 | 1 | 1 | Static page. |
| COIN-04 Coin tags can be expanded | 1 | 1 | 1 | Display only, with a show more/fewer toggle. |
| COIN-05 Unknown coin shows not found | 1 | 1 | 1 | Static page. |

## Takeaways

- The riskiest stories have no tests. Automated coverage (CMP-01 to CMP-03, CNV-01, CNV-02) sits in the medium and low zones, while APP-06, MKT-15, PRT-05 and COIN-02 have neither test cases nor specs. APP-03 has test cases (2026-10-21) but no spec yet.
- COIN-02/AC-11 is still open: price history that is valid JSON but the wrong shape isn't caught. APP-03/AC-7 had the same problem for the market snapshot and was fixed with a shape check (`app/src/data/snapshotShape.ts`). The same approach would fit the price history.
- Malformed data in browser storage blanks the page (cross-cutting open question in the user stories README). It affects APP-04, MKT-10, MKT-13 and PRT-01 to PRT-03, so one shared test would cover all of them.
- Suggested order for new test cases and automation: APP-03 → APP-06 → MKT-15 → PRT-05 → COIN-02 → MKT-04 and MKT-14.
