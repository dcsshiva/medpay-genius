// Ensures every user runs the latest HMS bundle. When the build's version
// (or timestamp) changes, we proactively unregister service workers, wipe
// caches, and reload once so menus / master tabs / routes refresh.

interface BuildInfo {
  version: string;
  timestamp: string;
  commit?: string;
  branch?: string;
  environment?: string;
}

declare const __BUILD_INFO__: BuildInfo | undefined;

const STORAGE_KEY = 'hms_active_build';
const RELOAD_FLAG = 'hms_build_reloaded_at';

export const runForceVersionRefresh = () => {
  if (typeof window === 'undefined') return;

  let buildInfo: BuildInfo | undefined;
  try {
    buildInfo = __BUILD_INFO__;
  } catch {
    return;
  }
  if (!buildInfo?.version) return;

  const currentTag = `${buildInfo.version}|${buildInfo.timestamp}`;
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === currentTag) return;

  // First run on this device: just record it, no reload.
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, currentTag);
    return;
  }

  // Avoid reload loops — only one forced reload per minute per build.
  const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
  if (Date.now() - lastReload < 60_000) {
    localStorage.setItem(STORAGE_KEY, currentTag);
    return;
  }

  console.info('[HMS] New build detected, refreshing service worker & caches', {
    previous: stored,
    current: currentTag,
  });

  sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  localStorage.setItem(STORAGE_KEY, currentTag);

  const cleanup = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map((r) => {
            // Don't kill push-notification workers (different scope/script).
            const script = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
            if (/firebase-messaging|onesignal/i.test(script)) return Promise.resolve(true);
            return r.update().catch(() => undefined).then(() => r.unregister());
          })
        );
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => !/firebase|onesignal/i.test(k))
            .map((k) => caches.delete(k))
        );
      }
    } catch (e) {
      console.warn('[HMS] cache cleanup failed', e);
    } finally {
      window.location.reload();
    }
  };

  void cleanup();
};

export const getCurrentBuildTag = (): { version: string; timestamp: string } | null => {
  try {
    const b = __BUILD_INFO__;
    if (b?.version) return { version: b.version, timestamp: b.timestamp };
  } catch {
    /* noop */
  }
  return null;
};
