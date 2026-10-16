# COIN-04: Coin tags can be expanded

**As a** user
**I want** to see the tags a coin has
**so that** I can learn what kind of project it is.

## Acceptance criteria

- The coin's details page has a "Tags" section listing the coin's tags. `AC-1`
- The section is hidden for a coin with no tags. `AC-2`
- For a coin with 8 tags or fewer, all are shown and there's no expand action. `AC-3`
- For a coin with more than 8 tags, the first 8 are shown with a "Show all N tags" action, N being the total number of tags. `AC-4`
- "Show all N tags" shows every tag and changes to "Show fewer", which goes back to the first 8. `AC-5`
- Tags are shown in the order the data source lists them. `AC-6`

## Open questions

- Tags are shown as raw slugs (e.g. `layer-1`), not the labels used in the tag filter (e.g. "Layer 1", MKT-08). Should they use the same labels?
