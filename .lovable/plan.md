
## Add Quick Access Configuration in Settings

### Overview
Add a new configuration card in the Settings > General Settings tab that lets admins control how the Quick Access sidebar menu works. Two modes will be available:

1. **Analytics-based (current behavior)** -- automatically shows the top 6 most-clicked navigation items from the last 30 days
2. **Manual selection** -- admin picks specific navigation items (no limit) to pin in Quick Access

The chosen mode and any manually selected items will be stored in a new `quick_access_config` table in the database.

---

### How It Will Work

- A new card titled "Quick Access Menu Configuration" will appear in Settings > General Settings
- It will show two radio options:
  - "From Navigation Analytics" (default) -- current auto-ranking behavior
  - "Manual Selection" -- shows a multi-select checklist of all navigation menu items
- When "Manual Selection" is chosen, a searchable checklist appears listing all navigation items (grouped by label), with no limit on selections
- A Save button persists the choice to the database
- The sidebar reads this config and either fetches from analytics or uses the saved manual list

---

### Technical Details

#### 1. New Database Table: `quick_access_config`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Primary key |
| `mode` | text | Either `'analytics'` or `'manual'` |
| `manual_items` | jsonb | Array of navigation item labels when mode is manual (e.g., `["Dashboard", "Staff Management", "Doctor Hub"]`) |
| `is_active` | boolean | Only one active config row |
| `created_at` | timestamptz | Auto timestamp |
| `updated_at` | timestamptz | Auto timestamp |

- RLS: Allow read access to admin/manager/super_admin roles, write access to admin/super_admin only
- Default row inserted with `mode = 'analytics'` and empty `manual_items`

#### 2. New Files

**`src/hooks/useQuickAccessConfig.tsx`** -- React Query hook to read/write the config from `quick_access_config` table.

**`src/components/QuickAccessConfig.tsx`** -- Settings UI card component with:
- Radio group: "From Navigation Analytics" / "Manual Selection"
- When manual mode is selected: a scrollable checklist of all navigation items (derived from `getNavigationItems` for admin/super_admin to see the full list)
- Save button that updates the database
- Current selection count badge

#### 3. Modified Files

**`src/components/Settings.tsx`**
- Import and render `<QuickAccessConfig />` card inside the General Settings tab, between the existing cards

**`src/hooks/useQuickAccessItems.tsx`**
- Read the `quick_access_config` to determine the mode
- If mode is `'analytics'`: use current logic (fetch from `navigation_analytics`, rank by count)
- If mode is `'manual'`: return the navigation items matching the saved labels from `manual_items`, preserving the order they were saved in

#### 4. Database Migration

```sql
CREATE TABLE public.quick_access_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mode text NOT NULL DEFAULT 'analytics' CHECK (mode IN ('analytics', 'manual')),
  manual_items jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default row
INSERT INTO public.quick_access_config (mode, manual_items, is_active) 
VALUES ('analytics', '[]', true);

-- Enable RLS
ALTER TABLE public.quick_access_config ENABLE ROW LEVEL SECURITY;

-- Read policy for eligible roles
CREATE POLICY "Allow read for admin/manager roles" ON public.quick_access_config
  FOR SELECT USING (true);

-- Write policy for admin/super_admin only
CREATE POLICY "Allow write for admin roles" ON public.quick_access_config
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_access_config;
```

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create `quick_access_config` table with default row |
| `src/hooks/useQuickAccessConfig.tsx` | New -- read/write hook for config |
| `src/components/QuickAccessConfig.tsx` | New -- settings UI with radio + checklist |
| `src/components/Settings.tsx` | Add QuickAccessConfig card to General Settings tab |
| `src/hooks/useQuickAccessItems.tsx` | Read config mode; return analytics-based or manual items |
| `src/integrations/supabase/types.ts` | Will auto-update with new table type |
