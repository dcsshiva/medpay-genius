

## Disable Appraisal Reasons Tab in Masters

### What
Remove the "Appraisals" tab from the Masters page. The "Appraisal Reasons" tab is no longer needed since the system now uses dynamic criteria. Only "Appraisal Criteria" will remain.

### Changes

**File: `src/components/MasterDataManagement.tsx`**
- Remove the `<TabsTrigger value="appraisal-reasons">` element
- Remove the `<TabsContent value="appraisal-reasons">` block
- Remove the `AppraisalReasonsTab` import

No other files need changes -- the `AppraisalReasonsTab.tsx` file can stay in the codebase (unused) to avoid breaking anything if referenced elsewhere.

