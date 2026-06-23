## Goal
Apply the same "stale-on-reopen" edit-form fix that was applied to `DoctorManagement.tsx` to every other component that has an Edit dialog, so reopened Edit forms always show the latest DB values (not a stale React-state snapshot) and `onOpenChange` never wipes a freshly-prefilled form.

## Forms with Edit option (to be fixed)

**Main modules**
1. `src/components/StaffManagement.tsx`
2. `src/components/StaffSalaryStructure.tsx`
3. `src/components/VisitManagement.tsx`
4. `src/components/PaymentManagement.tsx`
5. `src/components/PaymentReleaseHistory.tsx`
6. `src/components/ChatbotKnowledgeBase.tsx`

**Masters tabs**
7. `src/components/masters/BranchesTab.tsx`
8. `src/components/masters/DepartmentsTab.tsx`
9. `src/components/masters/RolesTab.tsx`
10. `src/components/masters/InsuranceCompaniesTab.tsx`
11. `src/components/masters/VendorDetailsTab.tsx`
12. `src/components/masters/VisitReasonsTab.tsx`
13. `src/components/masters/LeaveReasonsTab.tsx`
14. `src/components/masters/PermissionReasonsTab.tsx`
15. `src/components/masters/ComplaintCategoriesTab.tsx`
16. `src/components/masters/AppraisalCriteriaTab.tsx`
17. `src/components/masters/AppraisalReasonsTab.tsx`
18. `src/components/masters/QuickPaymentTypesTab.tsx`

**Quick payment**
19. `src/components/quick-payment/StaffBulkPaymentTab.tsx`

**Excluded** (not classical edit-form dialogs)
- `TeamChat.tsx` — message edit (inline, not a CRUD form)
- `DoctorManagement.tsx` — already fixed

## Fix pattern (applied to each file above)

For each component that has an "Edit" dialog driven by an `editing<X>` state + shared form `Dialog`:

1. **Refetch fresh row on Edit click**  
   Convert `handleEdit(row)` to `async`. Inside, fetch the single row from Supabase by id (`.select('*').eq('id', row.id).maybeSingle()`), then populate `formData` and `setEditing<X>` from the fresh row. Fall back to the passed-in `row` on error so the dialog still opens.

2. **Stop `Dialog onOpenChange` from clobbering edit state**  
   Replace the inline `onOpenChange` that always calls `resetForm()` / `setEditing<X>(null)` when `open === true`. New behavior:
   - On open: only reset when there is no `editing<X>` yet (i.e. Add flow). When `editing<X>` is set (Edit flow opened programmatically), do nothing.
   - On close: reset form + clear `editing<X>` as before.

3. **Await refresh after save**  
   In the submit/mutation success path, `await` the list refetch (`fetchX()` / `queryClient.invalidateQueries({...})` with `await`) before closing the dialog, so the next Edit click reads from refreshed state.

4. **Return updated row from update mutation** (where applicable)  
   Append `.select().maybeSingle()` to `supabase.from('<table>').update(...)` calls so failures surface and the updated row is verifiable.

5. **DEV-only diagnostic logs**  
   Add `if (import.meta.env.DEV) console.log(...)` traces in `handleEdit`, submit success, and the fetch list function — same as `DoctorManagement`. No production logging.

## Out of scope
- No DB / RLS / migration changes.
- No layout, styling, validation, or business-rule changes.
- No changes to Add-only forms, inline edits, or read-only detail views.
- No changes to `TeamChat` message editing or `DoctorManagement` (already done).

## Verification (per file)
For each component: open Edit on a row → change a field → Save → immediately click Edit on the same row → new value appears. Refresh → still correct. Click Add → form is blank. Cancel mid-edit → reopening Edit shows current DB values.