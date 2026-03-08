

# Master Pages UI/UX Standardization Plan

## Current Issues

After reviewing all 13 master tab components and the parent `MasterDataManagement.tsx`:

1. **Tab bar overflow** -- 13 tabs wrap awkwardly; no horizontal scroll on mobile
2. **No search** on most tabs (only Vendor has none built-in either, all lack a filter input)
3. **Tables not scrollable** horizontally on mobile -- columns get crushed
4. **Inconsistent loading states** -- some show "Loading..." text, others a spinner, none use skeleton loaders
5. **Inconsistent status controls** -- some tabs use clickable Badge, some use Switch, some use both Badge AND Switch in the same row
6. **Inconsistent action buttons** -- some tabs have Trash2 delete buttons, some only soft-delete via Switch; no tooltips anywhere
7. **No record counts** visible
8. **No empty state icons** -- just plain text

## Plan

### 1. Redesign MasterDataManagement.tsx (parent)
- Replace the wrapping `TabsList` with a horizontally scrollable container using `ScrollArea` with `orientation="horizontal"`
- Add a search input above/beside the tabs that filters the active tab's data (pass `searchTerm` as prop to each tab)
- Show active record count badge on each tab trigger
- Clean up page header with proper spacing

### 2. Standardize all 13 tab components with consistent patterns

**Files to update** (all in `src/components/masters/`):
- RolesTab, DepartmentsTab, BranchesTab, LeaveReasonsTab, PermissionReasonsTab
- VisitReasonsTab, InsuranceCompaniesTab, AppraisalCriteriaTab, AppraisalReasonsTab
- ComplaintCategoriesTab, QuickPaymentTypesTab, VendorDetailsTab
- DepartmentRoleMappingTab, RoleAppraisalCriteriaTab

**Consistent pattern per tab:**

a. **Search input** at top of each tab (local filter) with Search icon  
b. **Table wrapped in `ScrollArea`** for horizontal scrolling on narrow screens  
c. **Skeleton loading** -- use `Skeleton` component (already exists) instead of text/spinner  
d. **Standardize status** -- use `Switch` for toggle (remove clickable Badge pattern); show Badge for display only  
e. **Standardize actions** -- icon buttons with `Tooltip` wrappers for Edit, Delete/Deactivate, Reorder  
f. **Empty state** -- centered icon + text + CTA button  
g. **Record count** in CardHeader as a small Badge  
h. **Consistent Card wrapper** on all tabs (some currently lack it)

### 3. Specific changes per component group

**Simple CRUD tabs** (Roles, Departments, Branches, LeaveReasons, PermissionReasons):
- Add search input, ScrollArea table wrapper, skeleton loading, tooltip actions, consistent Switch toggle
- These are nearly identical -- apply the same pattern

**Medium complexity tabs** (VisitReasons, InsuranceCompanies, AppraisalCriteria, AppraisalReasons, ComplaintCategories, QuickPaymentTypes):
- Same as above, plus remove dual Badge+Switch and keep only Switch

**Complex tabs** (VendorDetailsTab):
- Add search input (filter by vendor name/code/contact)
- Wrap table in ScrollArea (10 columns need horizontal scroll)
- Skeleton loading, consistent actions

**Special tabs** (DepartmentRoleMappingTab, RoleAppraisalCriteriaTab):
- These have unique layouts (not simple tables) -- keep their structure but add consistent Card styling, loading skeletons, and search where applicable

### Technical approach
- All logic, database queries, and form handling remain **completely unchanged**
- Only the JSX rendering layer is updated
- Add `searchTerm` state + filter logic to each tab locally
- Import `ScrollArea` from `@/components/ui/scroll-area`, `Skeleton` from `@/components/ui/skeleton`, `Tooltip` from `@/components/ui/tooltip`

### Summary of files changed
| File | Changes |
|------|---------|
| `MasterDataManagement.tsx` | Scrollable tabs, cleaner header |
| All 13 tab components | Search, ScrollArea tables, Skeleton loading, Tooltip actions, consistent Switch/Badge, empty states, record count |

No database or logic changes. Pure UI/UX layer update.

