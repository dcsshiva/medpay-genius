

## Department-Role-Criteria Linked Appraisal System — IMPLEMENTED

### What was done

1. **Database**: Created 3 new tables (`department_role_mapping`, `role_appraisal_criteria`, `staff_appraisal_criteria_scores`) with RLS policies. Seeded all existing roles into all departments.

2. **Masters**:
   - New "Dept-Role Mapping" tab — assign roles to departments with smart search
   - New "Parameter Master" tab — configure criteria per role (name, Yes/No toggle, max %)

3. **Staff Management**: Department dropdown comes first; role dropdown filters based on department mapping (falls back to all roles if no mapping).

4. **Staff Appraisal**: When staff is selected, auto-loads role-specific criteria. Grid shows S.No | Criteria | Max Score | YES | NO | Obtained Score with quick-fill All YES/NO buttons. Falls back to legacy percentage grid if no role criteria configured.
