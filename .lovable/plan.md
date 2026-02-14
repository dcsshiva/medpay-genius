

## Add "Submit To" Admin Selection in Complaint Form

### What Changes

A new required "Submit To" dropdown will be added to the complaint submission form, allowing staff to choose which administrator or manager should receive their complaint. This ensures complaints are directed to the right person.

### Database Change

A new column `submitted_to` (uuid, nullable) will be added to the `complaints` table, referencing a staff member (admin/manager).

```sql
ALTER TABLE complaints ADD COLUMN submitted_to uuid;
```

### Form Changes (ComplaintManagement.tsx)

1. **New required field**: "Submit To" dropdown showing only staff with admin or manager roles, placed prominently in the "Who and When" section (above the existing "Staff Member" field)
2. **Form state**: Add `submitted_to` to `formData` and `resetForm`
3. **Validation**: Block submission if `submitted_to` is empty -- show a toast error
4. **Insert logic**: Include `submitted_to` in the Supabase insert call
5. **Complaint card display**: Show "Submitted To: [Name]" in complaint cards so users can see who received the complaint

### Dropdown Behavior

The "Submit To" dropdown will filter `staffList` to only show staff with roles `admin` or `manager`:

```
staffList.filter(s => ['admin', 'manager'].includes(s.role))
```

### Visual Layout

The "Who and When" section will have:
- **Submit To** (required, with a red asterisk) -- admin/manager list only
- **Complaint Against** (optional) -- all staff
- **Incident Date / Time** (optional, side-by-side)

### Files to Modify

| File | Change |
|------|--------|
| New migration | Add `submitted_to` column to `complaints` table |
| `src/components/ComplaintManagement.tsx` | Add "Submit To" field, validation, display in cards |
| `src/integrations/supabase/types.ts` | Auto-updated with new column |

### What Does NOT Change
- Stats cards, filters, status update logic
- Admin response dialog
- RLS policies (new column inherits existing table policies)
- Report generation columns (will add submitted_to to report)

