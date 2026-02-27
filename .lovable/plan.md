

## Department-Role-Criteria Linked Appraisal System

### Overview
Restructure the appraisal system to follow a **Department -> Role -> Criteria** hierarchy, matching the uploaded Nursing Performance Appraisal Form. Each role within a department gets its own set of appraisal criteria with Yes/No tick rating and percentage scoring (max 10 per criteria, total 100).

### Database Changes (3 new tables, 1 alter)

#### 1. `department_role_mapping` table
Maps which roles belong to which departments. Preserves existing roles by auto-mapping all current roles to all departments.

```text
id (uuid PK)
department_id (uuid FK -> departments_master)
role_id (uuid FK -> roles_master)
is_active (boolean, default true)
created_at, updated_at
UNIQUE(department_id, role_id)
```

#### 2. `role_appraisal_criteria` table (Parameter Master)
Defines appraisal criteria per role. Each criteria has a name, Yes/No tick option, and a max percentage score.

```text
id (uuid PK)
role_id (uuid FK -> roles_master)
criteria_name (text)
criteria_code (text)
max_score (numeric, default 10)
has_yes_no (boolean, default true)
display_order (integer)
is_active (boolean, default true)
created_at, updated_at
```

#### 3. `staff_appraisal_criteria_scores` table
Stores individual criteria scores for each appraisal using the new Yes/No + obtained score format.

```text
id (uuid PK)
appraisal_id (uuid FK -> staff_appraisals)
criteria_id (uuid FK -> role_appraisal_criteria)
yes_no_value (boolean, nullable)
obtained_score (numeric, default 0)
created_at
```

#### 4. Seed existing data
- Auto-insert `department_role_mapping` entries for all existing department + role combinations to preserve current data
- Migrate existing `appraisal_criteria_master` entries into `role_appraisal_criteria` for all roles

### Frontend Changes

#### 1. New Master Tab: "Role-Department Mapping" (in MasterDataManagement)
- Select a department, then assign/unassign roles to it
- Smart combobox selection for both department and roles
- Shows current mappings in a grid view

#### 2. Updated Master Tab: Rename "Appraisal Criteria" to "Parameter Master"
- First select a Role from dropdown (smart search)
- Then manage criteria for that role: criteria name, Yes/No toggle, max score (default 10%)
- Table format matching the uploaded image: S.NO | CRITERIA | MAXIMUM SCORE | YES/NO | OBTAINED SCORE

#### 3. Updated Staff Management (`StaffManagement.tsx`)
- Department dropdown comes first
- Role dropdown filters based on selected department (via `department_role_mapping`)
- Fallback: if no mapping exists, show all roles (backward compatible)
- Preserve existing department/role data on existing staff records

#### 4. Updated Staff Appraisal Form (`StaffAppraisalManagement.tsx`)
- When staff is selected, auto-detect their role
- Load criteria from `role_appraisal_criteria` based on the staff's role
- Rating grid matches the uploaded form: S.NO | CRITERIA | MAX SCORE | YES (tick) | NO (tick) | OBTAINED SCORE
- YES/NO are radio-style checkboxes (tick one)
- If YES is ticked, obtained score = max_score; if NO, obtained score = 0 (can be manually overridden)
- Total Score row at bottom showing: TOTAL SCORE (max 100) | OBTAINED SCORE (sum)
- Smart selection buttons preserved (quick fill all YES or all NO)
- Month/Year selector and staff combobox remain unchanged

### File Changes Summary

| File | Change |
|------|--------|
| New migration SQL | Create 3 new tables + seed data |
| `src/components/masters/DepartmentRoleMappingTab.tsx` | **New file** - Department-Role mapping UI |
| `src/components/masters/RoleAppraisalCriteriaTab.tsx` | **New file** - Parameter Master (criteria per role) |
| `src/components/MasterDataManagement.tsx` | Add 2 new tabs |
| `src/components/StaffManagement.tsx` | Filter roles by selected department |
| `src/components/StaffAppraisalManagement.tsx` | New Yes/No criteria grid based on staff's role |
| `src/integrations/supabase/types.ts` | Auto-updated by migration |

### Backward Compatibility
- Existing `appraisal_criteria_master` table remains untouched (legacy)
- Existing staff records with department/role values are preserved
- All current roles are mapped to all departments by default
- If a role has no criteria configured in `role_appraisal_criteria`, the system falls back to the old `appraisal_criteria_master`

