

## Remove Appraisal Reason & Replace Period Start/End with Month-Year Selector

### What
1. Remove the **Appraisal Reason** dropdown from the Create Performance Appraisal form
2. Replace **Period Start** and **Period End** date inputs with a single **Appraisal Month** selector (e.g., "January 2026")
3. Keep the **Next Review Date** field as-is

### Changes

**File: `src/components/StaffAppraisalManagement.tsx`**

**State changes:**
- Remove `selectedAppraisalReasonId` and `appraisalReasons` state variables
- Remove `appraisalPeriodStart` and `appraisalPeriodEnd` state variables
- Add `appraisalMonth` (string, e.g. "2026-01") state variable
- Remove `fetchAppraisalReasons` function and its call in the `useEffect` Promise.all

**Form UI changes (lines ~594-614):**
- Remove the Appraisal Reason `<Select>` block (lines 594-606)
- Replace Period Start and Period End inputs with a single **Appraisal Month** selector using two side-by-side `<Select>` dropdowns:
  - Month selector (January-December)
  - Year selector (current year and next year)

**Submit logic (`handleSubmitAppraisal`):**
- Derive `appraisal_period_start` (first day of selected month) and `appraisal_period_end` (last day of selected month) from `appraisalMonth`
- Remove `appraisal_reason_id` from the insert payload
- Update validation to check `appraisalMonth` instead of start/end dates

**Reset logic (after successful save):**
- Replace clearing `appraisalPeriodStart`, `appraisalPeriodEnd`, `selectedAppraisalReasonId` with clearing `appraisalMonth`

