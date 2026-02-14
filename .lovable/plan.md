

## Complaint Form -- UI/UX Polish + New Features

### What Changes

#### 1. Include Administrators in Staff Dropdown
Currently, the "Staff Member" dropdown filters out admins with `.filter(staff => staff.role !== 'admin')`. This filter will be removed so all active staff (including administrators) appear in the selection list.

#### 2. Add Incident Date and Time Fields (Optional)
Two new columns will be added to the `complaints` table:
- `incident_date` (date, nullable)
- `incident_time` (time without time zone, nullable)

These will appear in the form as optional fields in a new "When did it happen?" section.

#### 3. UI/UX Polish for the Submit Form
Based on the screenshot, the form has too much vertical spacing and lacks visual grouping. Changes:
- **Section cards**: Group fields into bordered sections -- "What Happened" (title + description), "Who and When" (staff member + incident date/time), "Classification" (category + priority)
- **Compact spacing**: Reduce `space-y-4` to `space-y-3` within sections, `space-y-5` between sections
- **Incident date/time**: Side-by-side layout on a single row
- **Better textarea**: Reduce rows to 3 on mobile for less scroll
- **Full-width submit button on mobile**: Sticky at bottom for easy reach
- **Touch targets**: Ensure all inputs have `min-h-[44px]`

### Database Migration
```sql
ALTER TABLE complaints 
  ADD COLUMN incident_date date,
  ADD COLUMN incident_time time without time zone;
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/ComplaintManagement.tsx` | Remove admin filter from staff dropdown, add incident_date/incident_time to form state and submission, restructure form into card sections, improve mobile layout |
| New migration | Add `incident_date` and `incident_time` columns to `complaints` table |

### What Does NOT Change
- All complaint listing, filtering, status update logic
- RLS policies (new columns inherit existing table policies)
- Stats cards clickable behavior (just implemented)
- Admin response dialog
- Report generation

