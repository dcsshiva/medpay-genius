

## Fix Version Display and Check Updates Functionality

### Problem Analysis

There are two core issues causing the version to show "1.0.0-dev" and build as "local":

1. **Vite `define` vs `window` mismatch**: The `vite.config.ts` uses `define: { '__BUILD_INFO__': JSON.stringify(buildInfo) }` which replaces bare `__BUILD_INFO__` references at compile time. But `useVersionInfo.tsx` reads it as `(window as any).__BUILD_INFO__` -- Vite's define plugin does NOT replace property accesses on `window`, so it's always `undefined`, falling through to the "1.0.0-dev / local" fallback.

2. **No version in build info**: The `getBuildInfo()` in `vite.config.ts` doesn't include the `version` from `package.json`, and the `package.json` version is `"0.0.0"`.

3. **Check Updates only checks PWA service worker**: It doesn't force-fetch the latest app assets or reload the page to get the newest deployed version.

---

### Implementation Plan

#### 1. Update `package.json` -- Set Meaningful Version

Change `"version": "0.0.0"` to `"1.0.0"` to reflect the actual release version.

---

#### 2. Update `vite.config.ts` -- Include Version in Build Info

Read `package.json` version and include it in the build-time define:

```typescript
import pkg from './package.json';

const getBuildInfo = () => {
  // ... existing git logic ...
  return {
    version: pkg.version,     // NEW: include version
    timestamp: new Date().toISOString(),
    commit: gitCommit,
    branch: gitBranch,
    environment: process.env.NODE_ENV || 'development'
  };
};
```

---

#### 3. Fix `src/hooks/useVersionInfo.tsx` -- Read Build Info Correctly

The key fix: access `__BUILD_INFO__` directly (not via `window`) so Vite's define plugin replaces it at compile time:

```typescript
// Declare the global constant that Vite replaces at build time
declare const __BUILD_INFO__: BuildInfo | undefined;

export const useVersionInfo = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>(() => {
    // Read build info injected by Vite define at compile time
    try {
      const buildInfo = __BUILD_INFO__;
      if (buildInfo) {
        return {
          version: buildInfo.version || '1.0.0',
          buildDate: buildInfo.timestamp,
          gitCommit: buildInfo.commit,
          environment: buildInfo.environment,
          branch: buildInfo.branch
        };
      }
    } catch (e) {
      // Fallback
    }
    return {
      version: '1.0.0-dev',
      buildDate: toISOStringIST(),
      gitCommit: 'local',
      environment: 'development',
      branch: 'local'
    };
  });

  return versionInfo;
};
```

This removes the unnecessary `useEffect` and reads the compile-time constant directly in state initialization.

---

#### 4. Enhance `src/hooks/usePWA.tsx` -- Force Refresh on Check Updates

Update `checkForUpdates` to also clear caches and force reload when updates are found. Add a new `forceRefresh` method:

```typescript
const checkForUpdates = useCallback(async (): Promise<boolean> => {
  setState(prev => ({ ...prev, isCheckingForUpdates: true }));
  
  try {
    // Check service worker for cached updates
    if (swRegistration) {
      await swRegistration.update();
    }
    
    // Fetch latest build info from server (cache-busted)
    const response = await fetch(`/?_t=${Date.now()}`, { 
      cache: 'no-store',
      method: 'HEAD' 
    });
    
    // If service worker has a waiting update, flag it
    if (swRegistration?.waiting) {
      setState(prev => ({ ...prev, isUpdateAvailable: true, isCheckingForUpdates: false }));
      return true;
    }

    setState(prev => ({ ...prev, isCheckingForUpdates: false, lastUpdateCheck: new Date() }));
    return false;
  } catch (error) {
    // ...
  }
}, [swRegistration]);

const applyUpdate = useCallback(() => {
  // Clear all caches then reload
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    }).finally(() => {
      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
}, [swRegistration]);
```

---

#### 5. Update `src/pages/Auth.tsx` -- Improved Check Updates Behavior

Make "Check Updates" clear caches and hard-reload so the user always gets the latest deployed version:

```typescript
onClick={async () => {
  const hasUpdate = await checkForUpdates();
  if (hasUpdate) {
    toast({ title: "Update Available!", description: "Click 'Apply Update' to install." });
  } else {
    // No service worker update, but offer hard refresh anyway
    toast({
      title: "You're up to date!",
      description: "Running the latest version. Refreshing...",
    });
    // Force reload to ensure latest assets
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }
}}
```

Also update the version display section to always show the build info (not conditionally based on environment):

```typescript
<div className="text-center text-white/60 text-xs">
  <p>Version {versionInfo.version}</p>
  <p className="text-white/40">Build: {versionInfo.gitCommit.slice(0, 7)}</p>
</div>
```

---

#### 6. Update `src/components/Settings.tsx` -- Same Check Updates Enhancement

Apply the same improved check-and-reload behavior to the Settings page update check button.

---

### Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Set version to `"1.0.0"` |
| `vite.config.ts` | Include `version` from package.json in `__BUILD_INFO__` |
| `src/hooks/useVersionInfo.tsx` | Read `__BUILD_INFO__` directly (not from window), add type declaration |
| `src/hooks/usePWA.tsx` | Enhance `checkForUpdates` and `applyUpdate` to clear caches and force reload |
| `src/pages/Auth.tsx` | Update Check Updates click handler to force refresh, always show build info |
| `src/components/Settings.tsx` | Update Check Updates click handler to force refresh |

---

### Expected Result After Fix

**Before:**
- Version: 1.0.0-dev
- Build: local

**After:**
- Version: 1.0.0
- Build: abc1234 (actual build timestamp hash)

**Check Updates behavior:**
- Checks for service worker updates (PWA)
- If update found: shows "Apply Update" button
- If no update: refreshes the page to ensure latest assets are loaded
- Apply Update: clears all caches and reloads with the newest build

