

## Add Branch Master to Masters Page

### What This Adds
A new "Branches" tab in the Masters page to manage hospital branch/location data with fields: Branch Name, Branch ID (code), Branch Location, Contact Number, and Contact Email.

### Database

**New table: `branches_master`**

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| branch_name | text | No | - |
| branch_code | text | No | - |
| branch_location | text | No | - |
| contact_number | text | Yes | - |
| contact_email | text | Yes | - |
| description | text | Yes | - |
| is_active | boolean | No | true |
| display_order | integer | No | 0 |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**Unique constraint** on `branch_code`.

**RLS Policies** (same pattern as other master tables):
- Admins can manage (ALL)
- Managers can manage (ALL)
- Anyone authenticated can view active branches (SELECT where is_active = true)

### New File: `src/components/masters/BranchesTab.tsx`

Follows the exact same pattern as `DepartmentsTab.tsx`:
- Table grid showing all branches (Name, Code, Location, Contact Number, Contact Email, Status, Actions)
- Add/Edit dialog with form fields for all columns
- Delete, toggle active/inactive, reorder functionality
- Contact number validated to 10 digits; email validated for format

### Modified Files

| File | Change |
|------|--------|
| `src/components/MasterDataManagement.tsx` | Import `BranchesTab`, add "Branches" tab trigger and content |

### Tab Order in Masters
Roles, Departments, **Branches**, Leave Reasons, Permission Reasons, Visit Reasons, Insurance, Appraisals, Complaints, Quick Pay, Vendors
