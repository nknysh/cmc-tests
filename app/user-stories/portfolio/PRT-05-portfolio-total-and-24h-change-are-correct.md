# PRT-05: Portfolio total and 24h change are correct

**As a** user
**I want** to see my portfolio's total value and how it changed in 24 hours
**so that** I know how my holdings are doing overall.

## Acceptance criteria

- With at least one holding, the Portfolio page shows "Total value" and "24h change". `AC-1`
- Total value is the sum of all holdings' values (PRT-04/AC-4), in price format. `AC-2`
- A holding's value 24 hours ago is its current value ÷ (1 + its coin's 24h change / 100). `AC-3`
- The 24h change amount is total value minus the sum of all holdings' values 24 hours ago. `AC-4`
- The 24h change percent is the change amount ÷ the sum of values 24 hours ago × 100; it's `0.00%` when that sum is 0. `AC-5`
- 24h change reads "+<amount> (<percent>)" when the change is 0 or more and "-<amount> (<percent>)" when it's negative, the amount in price format without its own sign and the percent in percent change format, e.g. "+$1,234.56 (+2.10%)". `AC-6`
- 24h change shows as up when positive, down when negative, flat when 0. `AC-7`
- Holdings whose coin isn't in the snapshot add 0 to every figure. `AC-8`
- Both figures update at once when a holding is added, edited or removed. `AC-9`
