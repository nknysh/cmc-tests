# PRT-02: Portfolio items can be edited

**As a** user
**I want** to change the amount of a holding
**so that** my portfolio matches what I actually own after I buy or sell.

## Acceptance criteria

- Each holding has an "Edit" action, announced as "Edit <coin name>". `AC-1`
- Edit opens a dialog titled "Edit <coin name>" with an Amount prefilled with the holding's current amount. `AC-2`
- "Save" with an Amount greater than 0 replaces the holding's amount with the new one (it doesn't add to it), closes the dialog, and updates the holding's value and the totals (PRT-04, PRT-05). `AC-3`
- "Save" with an empty Amount, 0, or a negative Amount keeps the dialog open, changes nothing, shows "Enter an amount greater than 0." and marks Amount as invalid. `AC-4`
- "Cancel" or the Escape key closes the dialog without changing the holding. `AC-5`
- Reopening the dialog shows the holding's current amount and no error, even if the previous attempt was cancelled with an error showing. `AC-6`
- The holding keeps its position in the list after editing. `AC-7`
- The edited amount is kept on this device (PRT-01/AC-10). `AC-8`
- A holding whose coin isn't in the snapshot (PRT-04/AC-5) can be edited; its dialog is titled "Edit holding". `AC-9`

## Open questions

- Adding to an existing holding (PRT-01/AC-6) uses floating-point addition, so `0.1` then `0.2` is stored as `0.30000000000000004`. The holdings list shows `0.3` (8 significant digits), but the edit dialog prefills the stored value in full. Should the prefill be rounded the same way as the list, or should amounts be stored with fixed precision?
