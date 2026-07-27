## Issue
Admin (`shivanss@gmail.com`) logs in and lands on **Doctor Hub** instead of the main **Dashboard**. The URL confirms it: `/dashboard?view=doctor-hub`.

## Root cause (verified)
`src/pages/Auth.tsx` line 167-168 — the post-login `navigateByRole` helper sends admin / manager / super_admin to `/dashboard?view=doctor-hub`:

```ts
} else if (role && ["admin", "manager", "super_admin"].includes(role)) {
  navigate("/dashboard?view=doctor-hub");
}
```

`src/pages/Index.tsx` then honours that query param (lines 72-78) and forces `activeTab = 'doctor-hub'`, overriding the earlier fix that made admins land on Dashboard.

There is also a dead branch in `Index.tsx` (line 76) — `else if (view === 'admin' || view === 'manager' || view === 'staff')` — the `'staff'` case is unreachable (already handled above) and the admin/manager cases shouldn't force `doctor-hub` either.

## Fix (frontend only, 2 small edits)

1. **`src/pages/Auth.tsx`** — in `navigateByRole`, send admin / manager / super_admin to plain `/dashboard`:
   ```ts
   } else if (role && ["admin", "manager", "super_admin"].includes(role)) {
     navigate("/dashboard");
   }
   ```
   Keep doctor → `?view=doctor-hub` and mobile-staff → `?view=staff` unchanged.

2. **`src/pages/Index.tsx`** — remove the stale `else if (view === 'admin' || view === 'manager' || view === 'staff')` block that re-routes admins to `doctor-hub`. Keep the explicit `view=doctor-hub` and `view=staff` handling so links from elsewhere (notifications, deep links) still work.

## Result
- Admin / manager / super_admin login → Dashboard (main KPIs), matching the earlier requested behaviour.
- Doctors still land on Doctor Hub.
- Mobile staff still land on Staff Dashboard.
- Deep links like `/dashboard?view=doctor-hub` continue to work when explicitly used (e.g. from Notification Center).
