# APP-02: Data freshness is shown

**As a** user
**I want** to see how old the market data is
**so that** I don't act on stale prices.

## Acceptance criteria

- Once market data has loaded, the header shows how long ago the snapshot was taken. `AC-1`
- Under 1 minute it reads "Updated just now"; under 1 hour "Updated N min ago"; under 24 hours "Updated N h ago"; otherwise "Updated N d ago", N rounded down. `AC-2`
- When the snapshot is more than 26 hours old, it reads "Data is <age> old and may be stale" (e.g. "Data is 2 d old and may be stale") and is marked as stale. `AC-3`
- The text refreshes every 30 seconds without a reload. `AC-4`
- Hovering it shows the snapshot's exact time in UTC. `AC-5`
- A snapshot time in the future reads "Updated just now". `AC-6`
- Nothing is shown while market data is loading or has failed to load. `AC-7`
- Reloading the page picks up a newer published snapshot without a forced (cache-bypassing) reload. `AC-8`
