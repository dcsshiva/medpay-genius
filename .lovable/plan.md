

## Sidebar Menu Visibility Management

### Overview
Add a new "Menu Visibility" tab in Settings where admins can toggle which navigation items appear in the sidebar. Hidden items are not deleted -- they're just not shown. All existing logic, data, and routing remain untouched.

### How It Works

1. A new `sidebar_menu_config` database table stores which menu item IDs are hidden
2. The sidebar reads this config and filters out hidden items before rendering
3. Admins manage visibility from a new Settings tab with simple toggle switches

### Database

**New table: `sidebar_menu_config`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| menu_item_id | text (unique) | The navigation item ID (e.g. "bank-advice-generation") |
| is_visible | boolean (default true) | Whether the item appears in the sidebar |
| display_order | integer | Optional custom sort order |
| updated_by | uuid | User who last changed it |
| updated_at | timestamptz | Last modification time |

RLS: Admins/super_admins can read and write. All authenticated users can read (they need to know which items to show).

### UI Changes

**Settings page (`src/components/Settings.tsx`)**
- Add a 4th tab: "Menu Visibility" (with Eye icon)
- Only visible to admin and super_admin roles

**New component: `src/components/MenuVisibilitySettings.tsx`**
- Lists all navigation items (from the super_admin list) with:
  - Icon + label for each item
  - Toggle switch (visible/hidden)
  - Items grouped into categories: Core, Payments, Reports, Management, System
- "Dashboard" and "Settings" are always visible (cannot be hidden)
- Bulk actions: "Show All" / "Hide All"
- Save button to persist changes
- Search/filter bar to find items quickly

**Sidebar (`src/components/AppSidebar.tsx`)**
- Fetch the `sidebar_menu_config` table on mount
- Filter `navigationItems` to exclude items where `is_visible = false`
- Items not in the config table default to visible (backward compatible)

**Navigation items (`src/lib/navigationItems.ts`)**
- No changes -- the full list remains as-is. Filtering happens in the sidebar.

### Menu Grouping in the Settings UI

To make the long list manageable, items will be grouped:

- **Core**: Dashboard, User Guide, Masters
- **People**: Staff Management, Doctor Management, Doctor Hub
- **Visits**: Visit Management
- **Payments**: Cash Payments (Lite), Insurance Payments (Lite), Cash Payments, Insurance Payments, Quick Payment
- **Bank Advice**: Bank Advice (Beta), Bank Advice (Legacy), Bank Advice Hub, Bank Advice Records, BA Payment Report, Quick Payment BA Report
- **Reports**: TDS Reports, Login Reports, Navigation Analytics
- **Collaboration**: Task Management, Staff Appraisals, Leave Approvals, Complaint Management, Team Chat
- **System**: Version Management, Website Settings, AI Knowledge Base, Settings

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/xxx_sidebar_menu_config.sql` | Create | New table with RLS policies |
| `src/components/MenuVisibilitySettings.tsx` | Create | Admin UI for toggling menu visibility |
| `src/hooks/useMenuVisibility.tsx` | Create | Hook to fetch and cache menu visibility config |
| `src/components/Settings.tsx` | Modify | Add "Menu Visibility" tab |
| `src/components/AppSidebar.tsx` | Modify | Filter items based on visibility config |
| `src/integrations/supabase/types.ts` | Update | Add new table types |

### What Does NOT Change
- All navigation routing and component rendering in `Index.tsx`
- The `navigationItems.ts` definitions (role-based logic stays intact)
- Quick Access configuration
- Any existing data or business logic
- Staff/doctor/manager menu restrictions (role-based filtering still applies first, then visibility filtering on top)

