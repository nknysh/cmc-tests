# PRT-03: Portfolio items can be removed

**As a** user
**I want** to remove a holding I no longer own
**so that** my portfolio only shows what I hold.

## Acceptance criteria

- Each holding has a "Remove" action, announced as "Remove <coin name>". `AC-1`
- Remove asks for confirmation in a dialog titled "Remove <coin name>?" with the text "This removes it from your portfolio on this device." `AC-2`
- Confirming with "Remove" deletes the holding, closes the dialog, and updates the totals (PRT-05). `AC-3`
- "Cancel" or the Escape key closes the dialog and keeps the holding. `AC-4`
- Removing the last holding shows the empty state (PRT-01/AC-11). `AC-5`
- The removal is kept on this device (PRT-01/AC-10). `AC-6`
- A holding whose coin isn't in the snapshot (PRT-04/AC-5) can be removed; its dialog is titled "Remove holding?". `AC-7`
