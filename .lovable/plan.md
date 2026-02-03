

## Add Heatmap Tracking for Sidebar Navigation

### Overview
Enhance the existing Navigation Analytics page with a visual heatmap component that shows click density on sidebar navigation items. The heatmap will use color intensity (from light green to dark red) to visualize which menu items are clicked most frequently.

---

### Current Architecture

| Component | Purpose |
|-----------|---------|
| `useNavigationTracking` | Hook that tracks navigation clicks to `navigation_analytics` table |
| `NavigationAnalytics.tsx` | Displays overall and daily stats in table format |
| `AppSidebar.tsx` | Sidebar with navigation items - already calls `trackNavigation()` |
| `getNavigationItems()` | Returns navigation items based on user role |

**Database Schema** (`navigation_analytics` table):
- `id`, `user_id`, `staff_id`, `navigation_id`, `navigation_name`, `user_role`, `clicked_at`

---

### Implementation Plan

#### 1. Create Sidebar Heatmap Visualization Component

**New File: `src/components/NavigationHeatmap.tsx`**

A visual representation of the sidebar showing click intensity:

```text
┌─────────────────────────────────────────────────┐
│  Sidebar Navigation Heatmap                     │
│  ─────────────────────────────────              │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  🏠 Dashboard            ████████ 245   │ ← High intensity (red)
│  │  📖 User Guide           ██████░░  89   │ ← Medium (orange)
│  │  🗄️ Masters              █████░░░  67   │
│  │  👥 Staff Management     ████░░░░  45   │
│  │  🩺 Doctor Hub           ███████░ 178   │ ← High (red-orange)
│  │  📅 Visit Management     ██████░░  92   │
│  │  💳 Cash Payments (Lite) ████░░░░  38   │
│  │  ⚡ Quick Payment        ███░░░░░  25   │ ← Low (green)
│  │  🏛️ Bank Advice (Beta)   ██░░░░░░  12   │ ← Very low (light green)
│  │  📊 TDS Reports          █░░░░░░░   5   │
│  │  ⚙️ Settings             ██████░░  85   │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Legend: Low ░░░ → ███ High                     │
└─────────────────────────────────────────────────┘
```

**Features:**
- Visual bars with color gradient based on click count
- Percentage of total clicks
- Sorted by click count (highest first) or original sidebar order
- Interactive: click to see detailed breakdown by role/time

---

#### 2. Add Treemap Chart View

Using Recharts `Treemap` component to show proportional area representation:

```text
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌──────────────────┬─────────────┬────────┐    │
│  │                  │             │        │    │
│  │   Dashboard      │  Doctor Hub │ Visits │    │
│  │     (245)        │   (178)     │  (92)  │    │
│  │                  │             │        │    │
│  ├──────────────────┼─────────────┴────────┤    │
│  │  User Guide (89) │  Settings (85)       │    │
│  ├──────────────────┼──────────────────────┤    │
│  │  Masters (67)    │  Staff (45)          │    │
│  └──────────────────┴──────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

#### 3. Update NavigationAnalytics.tsx

Add new tabs for heatmap visualizations:

```text
┌─────────────────────────────────────────────────┐
│  Navigation Analytics                           │
│  Track sidebar menu usage                       │
│                                                 │
│  [Date Range Picker]  [Refresh]                 │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │ Summary Cards: Total | Pages | Most Popular│ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌────────┬─────────┬──────────┬──────────┐     │
│  │Heatmap │ Treemap │ Overall  │ Daily    │ ← NEW tabs
│  └────────┴─────────┴──────────┴──────────┘     │
│                                                 │
│  [Tab Content Based on Selection]               │
└─────────────────────────────────────────────────┘
```

---

#### 4. Add Role-based Breakdown

Show clicks broken down by user role in a stacked bar chart:

```text
Navigation by Role
──────────────────

Dashboard     ████████ Admin  ███ Manager  ██ Staff
Doctor Hub    ██████ Admin    ████ Manager  █ Staff
Visits        █████ Admin     ███ Manager   ██ Staff
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/NavigationHeatmap.tsx` | Visual heatmap component with sidebar-like layout |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/NavigationAnalytics.tsx` | Add Heatmap and Treemap tabs, integrate new visualizations |

---

### Technical Implementation Details

#### Heatmap Color Scale
```typescript
// Color intensity based on percentage of max clicks
const getHeatColor = (count: number, maxCount: number): string => {
  const intensity = count / maxCount;
  if (intensity >= 0.8) return 'bg-red-500';      // Hot
  if (intensity >= 0.6) return 'bg-orange-500';   // Warm
  if (intensity >= 0.4) return 'bg-yellow-500';   // Medium
  if (intensity >= 0.2) return 'bg-lime-500';     // Cool
  return 'bg-green-300';                           // Cold
};
```

#### Treemap Configuration
```typescript
// Using Recharts Treemap
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
];

const data = overallStats.map((stat, index) => ({
  name: stat.navigation_name,
  size: stat.count,
  fill: COLORS[index % COLORS.length],
}));
```

#### Enhanced Analytics Tabs
```typescript
<Tabs defaultValue="heatmap">
  <TabsList>
    <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
    <TabsTrigger value="treemap">Treemap</TabsTrigger>
    <TabsTrigger value="overall">Overall</TabsTrigger>
    <TabsTrigger value="daily">Daily</TabsTrigger>
    <TabsTrigger value="by-role">By Role</TabsTrigger>
  </TabsList>
</Tabs>
```

---

### Data Flow

```text
User clicks sidebar item
        │
        ▼
useNavigationTracking.trackNavigation()
        │
        ▼
INSERT into navigation_analytics
        │
        ▼
NavigationAnalytics fetches data
        │
        ├──► Overall Stats (table)
        ├──► Daily Stats (table)
        ├──► Heatmap View (visual bars) ← NEW
        ├──► Treemap View (proportional areas) ← NEW
        └──► By Role View (stacked bars) ← NEW
```

---

### Component Structure

```text
NavigationAnalytics.tsx
├── Summary Cards (existing)
├── TabsList
│   ├── "Heatmap" Tab
│   │   └── <NavigationHeatmap stats={overallStats} />
│   ├── "Treemap" Tab
│   │   └── <Treemap ... /> (Recharts)
│   ├── "By Role" Tab
│   │   └── <BarChart ... /> (stacked by role)
│   ├── "Overall" Tab (existing)
│   │   └── Table view
│   └── "Daily" Tab (existing)
│       └── Table view
```

---

### Dependencies

- **recharts** (already installed) - For Treemap and BarChart visualizations
- **lucide-react** (already installed) - For navigation icons
- **Tailwind CSS** - For heatmap color classes

---

### Accessibility Considerations

- Color-blind friendly: Include text labels with click counts
- Keyboard navigation: All tabs accessible via keyboard
- Screen readers: ARIA labels for heatmap intensity descriptions
- High contrast: Text always visible on colored backgrounds

