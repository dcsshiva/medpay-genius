# Sidebar cleanup + full daily digest

## 1. Remove "Doctor Payments" from the sidebar

Delete the Doctor Payments group (Paid / Unpaid / Total cards) at the bottom of the sidebar, leaving only navigation items. The payment stats remain available on the dashboard and payment screens — only the sidebar block goes away. Now-unused stats fetching, color hooks and imports in `src/components/AppSidebar.tsx` get cleaned up too.

## 2. Daily activity summary email shows everything

Today the digest caps each section at 10 rows and prints "+ N more in the app". Instead, every section lists the full day's records:

- New visits recorded
- Doctor payments created
- Manager approvals / Admin approvals
- Quick payments, staff payments, part payments/releases
- Bank advices generated
- Reversals / undo actions

Section headers keep the count and total. The "+ N more" line is removed entirely.

### Technical detail

- `supabase/functions/daily-ops-digest/index.ts`: drop `MAX_ROWS_PER_SECTION` slicing so all rows are mapped into each section.
- `supabase/functions/_shared/transactional-email-templates/daily-ops-digest.tsx`: remove the "+ N more in the app" note; keep the same green branded row styling for long lists.
- Redeploy `daily-ops-digest` after the changes.

Note: very high-volume days produce a long email; Gmail clips messages over ~102 KB. If that becomes an issue we can add a per-section cap later.
