

## Revamp Staff Appraisal System with Dynamic Criteria Master

### Overview
Replace the hardcoded appraisal rating criteria (Punctuality, Work Quality, etc.) with a dynamic **Appraisal Criteria Master** table. Revamp the appraisal creation UI to show an Excel-like grid where admin/manager selects a staff member and rates them across all active criteria using percentage (%) selection bars.

### Current State
- Rating criteria are hardcoded as individual columns in `staff_appraisals` table (punctuality_rating, work_quality_rating, etc. -- 11 total)
- The existing `appraisal_reasons` table stores appraisal TYPES (Annual Review, Probation, etc.), not rating criteria
- The form uses sliders with 1-5 scale

### Changes

#### 1. Database: New `appraisal_criteria_master` table

Create a new master table to define rating criteria dynamically:

```text
appraisal_criteria_master
  id (uuid, PK)
  criteria_name (text) -- e.g., "Punctuality", "Work Quality"
  criteria_code (text) -- e.g., "punctuality", "work_quality"
  description (text, nullable)
  max_score (integer, default 100) -- percentage-based
  weight (numeric, default 1.0) -- for weighted average
  is_active (boolean, default true)
  display_order (integer, default 0)
  created_at, updated_at (timestamps)
```

RLS: Admins/managers can manage; anyone authenticated can read active entries.

Seed with existing hardcoded criteria: Punctuality, Work Quality, Teamwork, Communication, Professionalism, Patient Care Quality, Infection Control, Documentation Accuracy, Attendance Reliability, Initiative, Training Participation.

#### 2. Database: New `staff_appraisal_scores` table

Store individual scores per criteria per appraisal:

```text
staff_appraisal_scores
  id (uuid, PK)
  appraisal_id (uuid, FK -> staff_appraisals.id)
  criteria_id (uuid, FK -> appraisal_criteria_master.id)
  score_value (numeric) -- 0-100 percentage
  created_at (timestamp)
```

RLS: Same as staff_appraisals (admins/managers manage, staff view own).

#### 3. Update AppraisalReasonsTab -> Appraisal Criteria Master

Rename the existing `AppraisalReasonsTab` in Masters to also include a **Criteria** sub-section (or add a new tab). The Criteria Master allows:
- **Add** new criteria
- **Edit** existing criteria (name, code, description, weight)
- **Suspend/Activate** via toggle (no delete button)
- **Reorder** with up/down arrows

#### 4. Revamp StaffAppraisalManagement.tsx - Appraisals Tab

Replace the current form with an Excel-like grid workflow:

**Step 1: Staff Selection**
- Admin/manager selects a staff member from a dropdown/combobox
- Select appraisal reason (Annual Review, Probation, etc.) from existing `appraisal_reasons`
- Select period start/end dates

**Step 2: Excel-like Rating Grid**
Once staff is selected, display a table/grid:

```text
| Criteria              | Score (%) | Rating Bar      |
|-----------------------|-----------|-----------------|
| Punctuality           | [75]      | [====----] 75%  |
| Work Quality          | [90]      | [========] 90%  |
| Teamwork              | [60]      | [=====---] 60%  |
| Communication         | [85]      | [=======.] 85%  |
| Patient Care Quality  | [95]      | [=========] 95% |
| ...                   |           |                 |
```

Each row shows:
- Criteria name (from master)
- A percentage input (0-100) with a visual progress/slider bar
- Smart quick-select buttons: 25%, 50%, 75%, 100%

**Step 3: Auto-calculated Summary**
- Weighted average = overall percentage
- Auto-map to overall rating (Excellent >= 90%, Good >= 75%, Satisfactory >= 60%, Needs Improvement >= 40%, Poor < 40%)
- Admin can override the auto-calculated overall rating

**Step 4: Comments Section**
- Strengths, Areas for Improvement, Manager Comments, Action Plan (unchanged)

#### 5. Appraisal List View

Display existing appraisals in a compact Excel-like table:

```text
| Staff Name (Code) | Period         | Overall | Punct. | Work Q. | Team | ... | Actions |
|-------------------|----------------|---------|--------|---------|------|-----|---------|
| Deepan (MGR100)   | Jan-Feb 2026   | Good    | 75%    | 90%     | 60%  | ... | Edit    |
```

Each criteria score is shown as a percentage in its column. Clicking a row expands to show full details.

### Technical Details

**New files:**
- `src/components/masters/AppraisalCriteriaTab.tsx` -- Criteria master CRUD (add/edit/suspend, no delete)

**Modified files:**
- `src/components/MasterDataManagement.tsx` -- Add "Appraisal Criteria" tab
- `src/components/StaffAppraisalManagement.tsx` -- Major revamp of the Appraisals tab:
  - Fetch criteria from `appraisal_criteria_master` instead of hardcoded fields
  - New Excel-like grid for score entry with % bars
  - Save scores to `staff_appraisal_scores` table
  - Keep backward compatibility: still write to legacy columns for existing reports
  - List view as a compact table with criteria as columns
- `src/components/StaffAppraisalView.tsx` -- Update staff self-view to read from dynamic scores
- `src/components/StaffMobileDashboard.tsx` -- Update to read dynamic criteria scores

**Database migrations:**
1. Create `appraisal_criteria_master` table with RLS
2. Create `staff_appraisal_scores` table with RLS and foreign keys
3. Seed initial criteria from the 11 hardcoded rating fields
4. Create helper function for weighted average calculation

