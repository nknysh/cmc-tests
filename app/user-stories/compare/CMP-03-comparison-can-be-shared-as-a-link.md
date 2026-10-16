# CMP-03: Comparison can be shared as a link

**As a** user
**I want** the page address to capture the pair I'm comparing
**so that** I can bookmark or share that comparison.

## Acceptance criteria

- After a coin is chosen, the Compare page address holds both coins' slugs, e.g. `#/compare?a=bitcoin&b=solana`. `AC-1`
- Opening such an address shows that pair, `a` as First coin and `b` as Second coin. `AC-2`
- An address missing `a` uses the top-ranked coin as First coin; one missing `b` uses the second-ranked coin as Second coin (CMP-01/AC-3). `AC-3`
- Changing a coin updates the address without adding browser history entries, so Back leaves the Compare page instead of undoing each choice. `AC-4`
- An `a` or `b` that names no snapshot coin, including an empty one (`?a=`) or a slug in the wrong case (`?a=BNB`), is treated as missing: AC-3 applies (CMP-01/AC-7, CMP-01/AC-8). Once a coin is chosen, the address holds the slugs of the coins shown, so the unknown slug is gone. `AC-5`
- An address naming the same coin twice shows the CMP-01/AC-6 message. `AC-6`
- The plain Compare link in the main navigation has no pair in it, so it opens the default pair (CMP-01/AC-3). `AC-7`
