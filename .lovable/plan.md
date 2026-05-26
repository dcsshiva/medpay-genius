## Goal

Two related improvements for doctors using the app:

1. **Mandatory update gate** — when a new app version is released, doctors are blocked at login until they reload (PWA) or install the latest APK (Android).
2. **Live Paid tab** — when an admin reverts a bank advice, the doctor's Doctor Hub updates without a manual refresh, so the reverted payment moves from Paid → Unpaid automatically.

---

## Part 1 — Force update for doctors

### Database
- Add columns to `app_downloads`:
  - `min_required_version` (text) — semver string, e.g. `"1.4.0"`
  - `min_required_version_code` (integer) — for Android APK comparison
  - `force_update_message` (text, nullable) — shown in the blocking modal
  - `force_update_for_roles` (text[], default `'{doctor}'`) — which roles must update; defaults to doctors only so other staff aren't impacted today
- Only admins can update these fields (existing RLS already restricts writes).
- A public read-only view `latest_required_version` (or just query the active row) so any authenticated user can read the threshold.

### Admin UI
- In **Version Manager** (`src/components/VersionManager.tsx`), add fields next to the existing version inputs:
  - "Minimum required version" + "Minimum required version code"
  - "Force update message" (textarea)
  - Multi-select chips for "Force update applies to" (default Doctor)

### Frontend gate
- New hook `useForceUpdateGate()`:
  - Reads current running version from the existing build-info constants (already injected via Vite define).
  - Fetches the latest active `app_downloads` row.
  - Compares running version vs `min_required_version` (and `version_code` when running inside Capacitor).
  - Returns `{ mustUpdate, message, downloadUrl, isAndroid }`.
- New blocking component `ForceUpdateGate.tsx` rendered at the top of `src/pages/Index.tsx` (and the doctor mobile entry) — when `mustUpdate && userIsDoctor`, render a full-screen modal that:
  - Shows the message + new version number
  - PWA: "Reload now" button → `window.location.reload()` with cache-bust + unregister SW
  - Android (Capacitor): "Download update" button → opens APK from `app_downloads.file_path`
  - No dismiss / no close — the modal blocks the rest of the UI
- Gate runs at login and again whenever the tab regains focus.

### Notes
- Only doctors are gated initially (configurable). Admin/manager/staff continue to see the existing non-blocking update prompt.
- The check is read-only and cheap (one row); cached for 60 s.

---

## Part 2 — Realtime Paid tab on doctor dashboard

### Approach
Use Supabase Postgres realtime on the `payments` table, scoped to the doctor's own rows.

### Changes in `src/components/DoctorHub.tsx`
- When `filterDoctorId` is set, subscribe to a channel on `payments` filtered by `doctor_id=eq.{filterDoctorId}` listening for `UPDATE` events.
- On any update where `bank_advice_generated` changed (or `is_fully_paid`, `status`), call `fetchDoctorSummaries()` and, if a tab is expanded, re-fetch its detail (`handleDoctorClick(doctorId, expandedTab)`).
- Tear down the channel on unmount.
- Add a small toast: "Payment status updated by admin" when an update arrives while the doctor is viewing.

### Migration
- Ensure `payments` is added to the `supabase_realtime` publication (one-line `ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;` if not already).
- RLS already restricts doctors to their own rows, so the subscription is safe.

### Behavior after revert
- Admin reverts → `revert_bank_advice` RPC flips `bank_advice_generated = false` on the payment.
- Doctor's open Doctor Hub receives the realtime UPDATE → Paid total drops, Unpaid total rises, payment row moves between lists automatically — no manual reload needed.

---

## Files

**New**
- `src/hooks/useForceUpdateGate.tsx`
- `src/components/ForceUpdateGate.tsx`
- migration: add columns to `app_downloads`, add `payments` to realtime publication

**Edited**
- `src/components/VersionManager.tsx` — admin inputs for min required version + message + roles
- `src/pages/Index.tsx` — mount `<ForceUpdateGate />`
- `src/components/DoctorHub.tsx` — realtime subscription when `filterDoctorId` is set

No changes to existing payment/revert logic.
