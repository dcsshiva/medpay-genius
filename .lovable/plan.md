# Smart Doctor Search for Payment Advice

## Goal
Replace the doctor dropdown in every shared **Create/Edit Payment Advice** popup with a searchable dropdown that treats `Dr.`, `Dr`, and similar title punctuation as a title rather than part of the doctor's searchable name.

## Changes
- Reuse and strengthen the existing doctor search dropdown instead of introducing a second search pattern.
- Normalize both the typed search and stored doctor names by removing a leading `Dr.`, `Dr`, or equivalent spacing/case before matching.
- Match doctors by the remaining name text or doctor code, case-insensitively.
- Keep the dropdown list available before typing, then narrow it as the user enters the doctor's actual name; selecting a result continues to load that doctor's eligible visits.
- Avoid displaying a duplicated title when the saved name already starts with `Dr.` or `Dr`.
- Apply the control to the shared payment-advice popup, which currently serves Cash Payment Management, Insurance Payment Management, and the general Payment Management screen.
- Preserve edit-mode selection, payment-type restrictions, and the existing mobile/desktop popup layout.

## Verification
- Test searches using `Dr. Aru`, `Dr Aru`, and `Aru`, confirming they return the same doctor.
- Test doctor-code search, selection, eligible-visit loading, form editing, and clearing/reselecting a doctor.
- Check the popup on mobile and desktop and run the relevant project checks.

## Technical details
- Update the reusable doctor combobox normalization so it compares normalized input against normalized stored names.
- Replace the basic `Select` doctor field in `PaymentManagement` with that reusable combobox while retaining the current selection callback.
