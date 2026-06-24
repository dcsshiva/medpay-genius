import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useVersionInfo } from '@/hooks/useVersionInfo';
import { formatFullDateTimeIST } from '@/lib/dateUtils';

/**
 * Shows a one-time toast after login confirming the HMS version and build time
 * so every user can verify they're on the latest bundle.
 */
export const useVersionLoginToast = (userId?: string | null) => {
  const versionInfo = useVersionInfo();
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const tag = `${userId}|${versionInfo.version}|${versionInfo.buildDate}`;
    if (shownFor.current === tag) return;

    // Only once per session per build per user.
    const sessionKey = `hms_version_toast_${tag}`;
    if (sessionStorage.getItem(sessionKey)) {
      shownFor.current = tag;
      return;
    }

    toast.success(`HMS v${versionInfo.version}`, {
      description: `Build: ${formatFullDateTimeIST(versionInfo.buildDate)}`,
      duration: 6000,
    });

    sessionStorage.setItem(sessionKey, '1');
    shownFor.current = tag;
  }, [userId, versionInfo.version, versionInfo.buildDate]);
};
