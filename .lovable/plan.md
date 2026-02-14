

## Fix: "complaints_category_check" Constraint Violation

### Problem

The `complaints` table has a hardcoded CHECK constraint that only allows these category values:
`general`, `equipment`, `facility`, `workload`, `policy`, `safety`, `other`

But the complaint categories are now managed dynamically through the `complaint_categories` master table, which has different codes like `service_quality`, `staff_behavior`, `billing_issues`, `medical_care`. When a user selects one of these, the insert fails.

### Fix

Run a single database migration to drop the outdated check constraint:

```sql
ALTER TABLE complaints DROP CONSTRAINT complaints_category_check;
```

No code changes needed -- the form already correctly uses `category_code` from the master table.

### Files to Modify

| File | Change |
|------|--------|
| New migration | Drop `complaints_category_check` constraint |

