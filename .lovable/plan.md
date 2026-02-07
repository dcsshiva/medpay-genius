

## Add Quick Access Menu to Sidebar

### Overview
Add a "Quick Access" section at the top of the sidebar (before Dashboard), showing the top 6 most-used navigation items ranked by overall usage from the `navigation_analytics` table. The items will be dynamically fetched and filtered to only show items the current user has access to.

### Visual Layout

```text
+-----------------------------+
| WestMed Logo    [Bell]      |
+-----------------------------+
| --- Quick Access ---------- |  <-- NEW section
|  [icon] Quick Payment       |
|  [icon] Dashboard           |
|  [icon] Visit Management    |
|  [icon] Cash Payments       |
|  [icon] Cash Payments(Lite) |
|  [icon] Doctor Hub          |
+-----------------------------+
| --- Navigation ------------ |  <-- Existing section (unchanged)
|  [icon] Dashboard           |
|  [icon] User Guide          |
|  [icon] Masters             |
|  ...                        |
+-----------------------------+
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useQuickAccessItems.tsx` | **Create** | Hook to fetch top 6 navigation items from analytics |
| `src/components/AppSidebar.tsx` | **Modify** | Add Quick Access group before the main navigation |

---

### Detailed Changes

#### 1. Create `src/hooks/useQuickAccessItems.tsx`

A new hook that:
- Queries `navigation_analytics` table, grouped by `navigation_id` and `navigation_name`, ordered by count descending
- Fetches overall top items (not per-user, matching the "Overall" analytics view)
- Takes the user's available `navigationItems` as input and filters the ranked results to only include items the user has access to
- Returns the top 6 accessible items with their icons resolved from the navigation items list
- Caches the result and refreshes every 5 minutes (not too frequent since rankings are stable)
- Only fetches for admin/manager/super_admin roles (staff/doctors have few nav items, quick access is less useful for them)

```typescript
// Pseudocode
const useQuickAccessItems = (navigationItems: NavigationItem[]) => {
  const [quickItems, setQuickItems] = useState([]);

  useEffect(() => {
    // Query: SELECT navigation_id, navigation_name, COUNT(*) 
    //        FROM navigation_analytics 
    //        GROUP BY navigation_id, navigation_name 
    //        ORDER BY count DESC LIMIT 20
    
    // Filter: Only keep items present in user's navigationItems
    // Take first 6 after filtering
    // Resolve icons from navigationItems
  }, [navigationItems]);

  return quickItems;
};
```

#### 2. Modify `src/components/AppSidebar.tsx`

Add a new `SidebarGroup` with label "Quick Access" before the existing flat navigation group:

- Import the new `useQuickAccessItems` hook
- Import `Sparkles` icon from lucide-react (for the group label decoration)
- Call the hook with the resolved `navigationItems`
- Render the Quick Access group only when:
  - The user is admin/manager/super_admin (roles with many menu items)
  - There are quick access items available
- Each item uses the same `handleNavigationClick` handler (so it also tracks analytics)
- Active state highlighting works the same as regular nav items
- When sidebar is collapsed, show icons with tooltips (same behavior as regular items)

```typescript
{/* Quick Access - Before main navigation */}
{quickAccessItems.length > 0 && (
  <SidebarGroup>
    <SidebarGroupLabel className="flex items-center gap-1">
      <Sparkles className="h-3 w-3" />
      Quick Access
    </SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {quickAccessItems.map((item) => (
          <SidebarMenuItem key={`qa-${item.id}`}>
            <SidebarMenuButton
              isActive={activeTab === item.id}
              tooltip={isCollapsed ? item.label : undefined}
              onClick={() => handleNavigationClick(item)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
)}
```

### Role Visibility

| Role | Shows Quick Access? | Reason |
|------|-------------------|--------|
| Super Admin | Yes | Has 25+ nav items, benefits from shortcuts |
| Admin | Yes | Has 25+ nav items, benefits from shortcuts |
| Manager | Yes | Has 20+ nav items, benefits from shortcuts |
| Doctor | No | Only has 1 nav item (Doctor Hub) |
| Staff/Nurse | No | Only has 5-6 nav items, quick access not needed |

### Data Source

The hook queries the `navigation_analytics` table with an aggregate query:

```sql
SELECT navigation_id, navigation_name, COUNT(*) as click_count
FROM navigation_analytics
GROUP BY navigation_id, navigation_name
ORDER BY click_count DESC
LIMIT 20
```

The top 20 are fetched, then filtered against the user's accessible navigation items, and the first 6 matches are displayed.

### Current Top 6 (from live data)

| Rank | Navigation | Clicks |
|------|-----------|--------|
| #1 | Quick Payment | 146 |
| #2 | Dashboard | 119 |
| #3 | Visit Management | 117 |
| #4 | Cash Payments | 50 |
| #5 | Cash Payments (Lite) | 41 |
| #6 | Doctor Hub | 35 |

### Edge Cases

- **No analytics data yet**: Quick Access section is hidden (graceful fallback)
- **Fewer than 6 accessible items**: Show whatever is available (could be 3-5)
- **Network error on fetch**: Silently fail, Quick Access hidden
- **Collapsed sidebar**: Show icons only with tooltips (same as regular nav)

