

## Add DNS Troubleshooting Banner on Login Page

### Problem
Supabase has a confirmed incident: ISP DNS providers in India cannot resolve Supabase domains. This causes "Failed to fetch" on all auth calls. The fix is on users' devices (change DNS settings), not in app code.

### What we'll build
A lightweight connectivity check + help banner on the Auth page that:
1. On mount, pings Supabase (`/auth/v1/health` or similar) with a short timeout
2. If unreachable, shows a prominent banner with DNS change instructions
3. Includes step-by-step guides for Android, iPhone, and Windows
4. Disappears automatically once connectivity is restored

### Implementation

#### 1. Create connectivity check utility
**New file:** `src/lib/connectivityCheck.ts`
- Export an `async checkSupabaseReachable(): Promise<boolean>` function
- Fetches the Supabase project URL with a 5-second timeout
- Returns `true`/`false`

#### 2. Add DNS help banner component
**New file:** `src/components/DNSHelpBanner.tsx`
- Uses the connectivity check on mount and on retry
- Shows a collapsible card with:
  - "Connection issue detected" heading
  - Recommended DNS servers (Cloudflare 1.1.1.1, Google 8.8.8.8)
  - Expandable sections for Android / iPhone / Windows DNS change steps
  - A "Retry Connection" button
- Styled with existing UI components (Alert, Accordion, Button)

#### 3. Integrate into Auth page
**Modified file:** `src/pages/Auth.tsx`
- Render `<DNSHelpBanner />` above the login card
- No changes to login logic itself

### Technical notes
- No new dependencies needed
- The banner is purely informational and client-side
- Once the ISP/Supabase issue resolves, the banner auto-hides (connectivity check passes)
- Zero impact on existing auth flow or other pages
