# MKT-08: Coins can be filtered by tags

**As a** user
**I want** to filter the coin list by category tags
**so that** I can see only coins of the kinds I'm interested in (e.g. DeFi or stablecoins).

## Acceptance criteria

- The Markets page has a "Tags" filter titled "Show coins with any of these tags". `AC-1`
- The filter offers only these categories, in this order: Layer 1, Layer 2, Smart contracts, DeFi, Stablecoins, Payments, Mineable, Memes, AI & big data, Real-world assets, Gaming. `AC-2`
- A category is offered only when at least one coin in the snapshot has it. `AC-3`
- Each category shows how many snapshot coins have it, e.g. "DeFi (12)". The count covers the whole snapshot, not the currently filtered list. `AC-4`
- The user can select any number of categories. With none selected, tags don't filter the list. `AC-5`
- With one or more selected, the list shows coins that have **any** of the selected categories (OR, not AND). `AC-6`
- While categories are selected, the filter's title shows how many, e.g. "Tags (2)". `AC-7`
- "Clear tags" deselects every category; it's unavailable when none is selected. `AC-8`
- The tag filter combines with every other filter, and changing it returns the list to page 1. `AC-9`
- The selected categories are part of the shareable view (MKT-15). `AC-10`

## Open questions

- Coins' other tags (exchange listings, investor portfolios) aren't offered as filters by design. A shared link can still carry any tag slug (MKT-15). Should unknown slugs in a link be ignored instead of filtering the list?
