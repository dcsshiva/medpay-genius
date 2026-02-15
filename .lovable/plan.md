

## Remove Extra Seeded Appraisal Criteria

### What
Delete the 9 extra seeded criteria from `appraisal_criteria_master`, keeping only **Punctuality** and **Work Quality**. You can then add your own criteria using the "Add Criteria" button.

### How
Run a single SQL migration to delete all rows except `punctuality` and `work_quality`:

```sql
DELETE FROM public.appraisal_criteria_master
WHERE criteria_code NOT IN ('punctuality', 'work_quality');
```

### Criteria Being Removed
- Teamwork
- Communication
- Professionalism
- Patient Care Quality
- Infection Control Compliance
- Documentation Accuracy
- Attendance Reliability
- Initiative
- Training Participation

### No Code Changes Needed
The UI (`AppraisalCriteriaTab.tsx` and `StaffAppraisalManagement.tsx`) already fetches criteria dynamically from the database, so removing rows is all that is needed.

