

## Make Complaint Stats Cards Clickable

### What Changes
The six stats cards (Open, Action Taken, In Progress, Solved, Resolved, Under Review) in Complaint Management will become clickable filters -- same pattern already used in Task Management.

### File to Modify

**`src/components/ComplaintManagement.tsx`** (lines 629-701)

Each of the 6 cards gets:
- `cursor-pointer` for click affordance
- `onClick` handler that toggles `statusFilter` between the card's status and `'all'`
- Active state: `ring-2` with matching color (e.g., `ring-orange-400` for Open) when that filter is active
- `transition-all hover:shadow-md` for hover feedback
- Grid adjusted to `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` for better mobile layout (2 cards per row on phone)

### Card-to-Status Mapping

| Card | Status Value | Active Ring Color |
|------|-------------|-------------------|
| Open | `open` | `ring-orange-400` |
| Action Taken | `taken` | `ring-blue-400` |
| In Progress | `in_progress` | `ring-yellow-400` |
| Solved | `solved` | `ring-green-400` |
| Resolved | `resolved` | `ring-emerald-400` |
| Under Review | `in_review` | `ring-gray-400` |

### Behavior
- Click a card: sets `statusFilter` to that status, filtering the list below
- Click same card again: resets filter to `'all'`
- The existing filter dropdown still works independently -- clicking a card will also update the dropdown value for consistency

### No Other Changes
- Complaint list rendering, dialogs, forms, and submission logic all stay the same
- Report generation and category filters untouched

