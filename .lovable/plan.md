

## Disable Auto-Logout -- Only Manual Logout

### Problem
The session timeout system automatically logs users out after 10 minutes of inactivity. You want users to stay logged in until they manually click "Logout".

### Solution
Disable the auto-logout mechanism in `useSessionTimeout.tsx` so no automatic session expiry or warning occurs. Users will only be logged out when they click the Logout button.

### Technical Details

**File: `src/hooks/useSessionTimeout.tsx`**

- Remove the `setInterval(checkSessionStatus, 5000)` call that polls session status every 5 seconds
- Remove the activity event listeners (`mousedown`, `mousemove`, etc.) that track idle time
- Remove the `handleSessionTimeout` auto-logout logic
- Keep the hook interface intact (so `SessionTimeoutWrapper` doesn't break) but make it effectively a no-op
- The `signOut` function in `auth.tsx` (called by the Logout button) remains unchanged

**File: `src/components/SessionTimeoutWrapper.tsx`**

- Remove the dev-mode session countdown timer display (no longer relevant)

### What Stays the Same
- The Logout button in the sidebar and mobile header continues to work as before
- PWA bypass logic is no longer needed (since timeout is disabled for everyone) but won't cause issues

| File | Change |
|------|--------|
| `src/hooks/useSessionTimeout.tsx` | Disable all auto-timeout logic; keep hook as no-op |
| `src/components/SessionTimeoutWrapper.tsx` | Remove dev countdown timer |

