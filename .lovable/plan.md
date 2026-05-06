# Add Username/Password Login + Admin Password Reset + Switch to Canonical Supabase URL

## 1. Switch Supabase client to canonical REST URL

`src/integrations/supabase/client.ts` line 5 — change:
```ts
const SUPABASE_URL = "https://api.westmedhospital.com";
```
to:
```ts
const SUPABASE_URL = "https://chbntbekbgetbyyxapqh.supabase.co";
```
This ensures all REST/Auth/Functions calls go to `https://chbntbekbgetbyyxapqh.supabase.co/rest/v1/` and not the custom domain (which has DNS/email issues).

> Note: this overrides the Core memory rule that pinned the custom domain. Will update `mem://index.md` accordingly.

## 2. Reset admin password (DB migration)

User `drarulmani375@gmail.com` already exists (id `0397f62f-24f3-4a6c-b792-d21d91efd4ce`), already has `staff.role = admin` and `user_designations.designation = admin`. Only the password needs to be set.

```sql
UPDATE auth.users
SET encrypted_password = crypt('Westmed@2677', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'drarulmani375@gmail.com';
```

## 3. Add Username/Password login tab in `src/pages/Auth.tsx`

- Convert `TabsList` from 2-col to 3-col grid: **Email OTP | Mobile OTP | Username**
- New `TabsContent value="password"` with:
  - Identifier input (username OR email)
  - Password input with show/hide toggle
  - "Sign In" button
- Handler `handlePasswordSignIn`:
  - If identifier contains `@` → `signInWithEmail(identifier, password)`
  - Else → `signInWithUsername(identifier, password)`
  - On success: existing `useEffect([user])` redirects to `/dashboard`
  - On error: toast with the returned message
- Both `signInWithUsername` and `signInWithEmail` already exist in `src/lib/auth.tsx` and properly populate `user`, `session`, `userRole`, `userDesignation`, `userProfile`, so RLS-protected Supabase queries work post-login.

## 4. Update memory

Update `mem://index.md` Core: replace the API URL line with:
> **API URL:** Use canonical Supabase URL `https://chbntbekbgetbyyxapqh.supabase.co` (custom domain `api.westmedhospital.com` deprecated due to DNS/email issues).

## Files Touched
- `src/integrations/supabase/client.ts` — change SUPABASE_URL
- `supabase/migrations/<new>.sql` — reset admin password
- `src/pages/Auth.tsx` — add 3rd tab + handler
- `mem://index.md` — update API URL rule

## Out of Scope
- Email OTP / DNS / auth-email-hook fixes (deferred per user instruction)
