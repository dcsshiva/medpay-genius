# Header "Check for updates" button + fix Doctor unpaid RPC

## 1. Header "Check for updates" button

Reuse the existing `CheckUpdateButton` component (already implements the exact update+reload flow — polls `app_downloads`, shows red dot when new version, reloads with SW/cache cleanup).

**`src/components/Layout.tsx`** — Import `CheckUpdateButton` and mount it in the desktop header (in the right-side action cluster, next to the color picker / Logout button).

**`src/components/MobileHeader.tsx`** — Add the same `CheckUpdateButton` to the mobile top bar so phone users can also trigger it (the doctor-only button on DoctorHubMobile stays as-is).

No new logic — same component reused everywhere.

## 2. Fix "Failed to load unpaid visits (PGRST202)" error

Root cause: `DoctorHub.tsx` calls `supabase.rpc('get_doctor_unpaid_visits', ...)` and `get_doctor_paid_payments`, but these RPCs were never created in the database (PGRST202 = function not found in schema cache).

**New migration** — create both SECURITY DEFINER RPCs so doctors on the custom-session (OTP fallback) path can load their own paid/unpaid data:

```sql
-- get_doctor_unpaid_visits(_doctor_id uuid, _start date, _end date)
-- Returns: id, visit_code, visit_date, patient_name, visit_payment,
--          payment_type, is_processed, payment_status
-- Source: public.visits WHERE doctor_id = _doctor_id
--   AND (payment released flag is false / not fully paid)
--   AND optional date range on visit_date

-- get_doctor_paid_payments(_doctor_id uuid, _start date, _end date)
-- Returns paid payment rows for the doctor (id, payment_date, gross, tds,
--   net, payment_mode, reference_no, period_start, period_end, patients_count)
-- Source: public.payments joined per existing paid-tab query shape

GRANT EXECUTE ON FUNCTION public.get_doctor_unpaid_visits(uuid, date, date)
  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_doctor_paid_payments(uuid, date, date)
  TO authenticated, anon;
```

Both functions run as `SECURITY DEFINER` with `SET search_path = public`, and internally scope by `_doctor_id` — matching the pattern in `mem://features/doctor-dashboard-accessibility` (inactive doctors keep historical access; no `is_active` filter).

Before writing the SQL I'll read the current `visits` and `payments` column shapes to keep the return signatures 1:1 with what `DoctorHub.tsx` already consumes, so no frontend changes are needed for the fix.

## Files touched

- `src/components/Layout.tsx` — mount `CheckUpdateButton` in desktop header
- `src/components/MobileHeader.tsx` — mount `CheckUpdateButton` in mobile header
- New SQL migration — create `get_doctor_unpaid_visits` and `get_doctor_paid_payments` with grants
