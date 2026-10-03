# Fix attendance-import staff details

## What will change

- Make the **Role** column wide enough to show the complete selected role instead of clipping its text.
- Keep the attendance-import table horizontally scrollable so all fields remain usable on smaller screens.
- Correct new-staff validation so a name already supplied by the attendance file is recognized reliably.
- For rows where the file truly has no name, keep the Name field editable and require it before import.
- Replace the generic “still need Name, Unit…” message with row-specific feedback showing the staff code and only the field(s) actually missing.
- Clear old red error marking after the affected row is corrected, then allow the import normally.

## Technical details

- Apply the change in the prototype port source and regenerate the HRMS output, rather than editing the generated file directly.
- Give the Role selector a stable minimum width consistent with the Staff Master role field.
- Normalize imported names before validation and read visible/imported names through one reliable helper.
- Validate each included new-staff row individually and identify missing Name, Unit, Department, Designation, Shift, or Gross salary precisely.

## Verification

- Preview an attendance file containing unmatched biometric codes and confirm full role names are visible.
- Fill all required fields and confirm the import proceeds without a false Name error.
- Test one genuinely blank name and confirm the message identifies that staff code and Name only.
- Confirm unchecked rows remain excluded and existing matched-staff attendance import behavior is unchanged.
