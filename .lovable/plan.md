# Overview attendance chart labels and unit colours

## Requested changes
- Show the selected pay-cycle name and full start/end dates above **Daily attendance %**.
- Show a readable date below **every bar**, not only when pointing at it.
- Use **one combined bar per date**, with a distinct coloured section for each unit.
- Add a reference row **below the chart** showing each unit name beside its matching colour.

## Chart behaviour
- Keep the current daily attendance percentage as the total bar height. Each coloured section represents that unit’s contribution to the overall attendance percentage; do not add unit percentages together.
- Keep the existing attendance rules: only `P` counts as present; weekly offs and holidays are excluded, and missing attendance records are not counted.
- Preserve the unit selector: **All units** shows the combined coloured bars; selecting a unit shows that unit’s attendance and colour.
- Keep unit colours consistent when the cycle or unit selection changes.
- Include the date, cycle and unit breakdown when inspecting a bar; preserve the existing action that opens that date’s attendance details.
- Distinguish no attendance data from a recorded 0% day.
- Give every date enough space and allow sideways scrolling instead of hiding dates or letting labels overlap. Keep the unit-colour reference below the scrollable chart.

## Technical approach
- Update the source prototype or its asserted patches in `scripts/port_prototype.py`, then regenerate `src/hrms/prototype.ts`; never hand-edit the generated file.
- Add an attendance-specific stacked chart renderer so other charts remain unchanged.
- Use the existing cycle label, Staff Master unit assignments and unit names; define chart colours as semantic tokens in the HRMS styles.
- No database changes, attendance import changes or salary-visibility changes.

## Verification
- Test a concrete two-unit example: with 2 present out of 4 eligible staff in one unit and 1 present out of 2 in another, the combined bar remains **50%**, not 100%, with contributions of 33⅓ and 16⅔ percentage points.
- Check excluded weekly offs/holidays, missing records, 0% attendance, and selected-unit filtering.
- Verify the Overview with actual signed-in attendance data: cycle/date labels, coloured sections, the reference row, sideways scrolling and opening daily details. If sign-in cannot be obtained, report that check as unverified.