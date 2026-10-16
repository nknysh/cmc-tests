# MKT-16: Coins can be exported to CSV

**As a** user
**I want** to download the coins I'm looking at as a CSV file
**so that** I can analyse them in a spreadsheet.

## Acceptance criteria

- The Markets page has an "Export CSV" action that downloads a file named `coinboard-markets.csv`. `AC-1`
- The file contains every coin matching the current search and filters, across all pages, in the current sort order. `AC-2`
- The file always has these columns, whatever the column configuration: Rank, Name, Symbol, Price (USD), 1h %, 24h %, 7d %, Market cap (USD), Volume 24h (USD). `AC-3`
- The first line is the header; each following line is one coin. `AC-4`
- Values are raw numbers, not formatted: no currency symbol, thousands separator, compact suffix, percent sign or rounding. `AC-5`
- A value containing a comma, double quote or line break is wrapped in double quotes, with inner double quotes doubled. `AC-6`
- The file ends with a line break. `AC-7`
- "Export CSV" is unavailable when no coin matches the filters. `AC-8`

## Open questions

- Lines end with LF, not the CRLF that RFC 4180 specifies, and the file has no UTF-8 byte-order mark, so Excel may misread non-ASCII coin names. Which spreadsheet apps must open the file correctly?
- Coin names come from a third party and aren't guarded against spreadsheet formula injection (a value starting with `=`, `+`, `-` or `@`). Is that a risk worth handling? A naive guard would also alter negative numbers, which start with `-`.
