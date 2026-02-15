

## Remove Weight Column from Add/Edit Appraisal Criteria Dialog

### What
Remove the **Weight** field from the Add/Edit Appraisal Criteria dialog and the Weight column from the criteria table. A default weight of 1.0 will be used automatically when saving.

### Changes

**File: `src/components/masters/AppraisalCriteriaTab.tsx`**

1. Remove `weight` from `formData` state and its usage in the dialog form
2. Remove the Weight `<Input>` field from the dialog
3. Remove the Weight column (`<TableHead>` and `<TableCell>`) from the criteria table
4. Hard-code `weight: 1.0` when inserting/updating criteria in `handleSave`

