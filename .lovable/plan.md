

## Fix: Connectivity Check Reports False Negative

### Problem
The DNS connectivity check (`checkSupabaseReachable()`) uses `res.ok` to determine if Supabase is reachable. However, the health endpoint (`/auth/v1/health`) returns HTTP **401** (no API key), which is not in the 200-299 range. This means `res.ok` is `false`, causing the app to incorrectly show the Emergency Login UI even though Supabase is fully reachable.

### Root Cause
```text
fetch(/auth/v1/health) --> HTTP 401 --> res.ok = false --> dnsBlocked = true (WRONG)
```
A real DNS block would cause a **network error** (caught by the `catch` block), not an HTTP 401 response.

### Fix
Change the reachability check: **any HTTP response = reachable**. Only a network error or timeout = unreachable.

### File Change

**`src/lib/connectivityCheck.ts`** (line 17)
- Change `return res.ok;` to `return true;`
- If `fetch` succeeds at all (any HTTP status), the server is reachable
- DNS failures and timeouts are already handled by the `catch` block returning `false`

### Result
- Normal login (Email OTP + Mobile OTP) will work again immediately
- Emergency Login UI will only appear during actual DNS outages
- No other files need changes

