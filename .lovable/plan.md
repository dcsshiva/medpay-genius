

## Auto-Generate and Disable Code Field in Add Appraisal Criteria Dialog

### What
When adding a new appraisal criteria, the **Code** field should be auto-generated from the **Name** field (e.g., "Patient Care" becomes "patient_care") and the Code input should be disabled/read-only so the user cannot edit it. When editing an existing criteria, the Code field remains disabled as well (already saved).

### Changes

**File: `src/components/masters/AppraisalCriteriaTab.tsx`**

1. Add a `useEffect` or inline logic in the Name field's `onChange` handler: when in "Add" mode (no `selectedCriteria`), auto-generate `criteria_code` by converting the name to lowercase, replacing spaces/special characters with underscores, and removing non-alphanumeric characters.

2. Set the Code `<Input>` to `disabled` -- always disabled in both Add and Edit modes since the code is system-generated.

### Auto-generation logic
```text
"Patient Care Quality" -> "patient_care_quality"
"Infection Control"    -> "infection_control"
"Work Quality"         -> "work_quality"
```

### Technical Detail
In the `handleAdd` and name `onChange`:
- Transform: `name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')`
- Only auto-generate when adding (not editing), so existing codes are preserved

