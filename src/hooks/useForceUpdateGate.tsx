import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useVersionInfo } from '@/hooks/useVersionInfo';

interface ForceUpdateInfo {
  mustUpdate: boolean;
  latestVersion: string | null;
  message: string | null;
  downloadUrl: string | null;
  isNative: boolean;
}

const compareSemver = (a: string, b: string): number => {
  const pa = a.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
};

export const useForceUpdateGate = (): ForceUpdateInfo & { recheck: () => void } => {
  const { userProfile, userRole } = useAuth();
  const currentVersion = useVersionInfo();
  const [info, setInfo] = useState<ForceUpdateInfo>({
    mustUpdate: false,
    latestVersion: null,
    message: null,
    downloadUrl: null,
    isNative: false,
  });

  const isNative = typeof (window as any).Capacitor !== 'undefined'
    && (window as any).Capacitor?.isNativePlatform?.() === true;

  const check = useCallback(async () => {
    try {
      const role = userProfile?.user_type === 'doctor' || userProfile?.role === 'doctor' || userRole === 'doctor'
        ? 'doctor'
        : (userRole || userProfile?.role || userProfile?.designation || '').toString();

      if (!role) return;

      const { data, error } = await supabase
        .from('app_downloads')
        .select('version, version_code, file_path, min_required_version, min_required_version_code, force_update_message, force_update_for_roles, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      const applies = Array.isArray(data.force_update_for_roles)
        && data.force_update_for_roles.includes(role);
      if (!applies) {
        setInfo(prev => ({ ...prev, mustUpdate: false }));
        return;
      }

      let mustUpdate = false;
      if (isNative && data.min_required_version_code != null) {
        // Can't easily read native versionCode at runtime; fall back to semver also
        mustUpdate = compareSemver(currentVersion.version, data.min_required_version || '0.0.0') < 0;
      } else if (data.min_required_version) {
        mustUpdate = compareSemver(currentVersion.version, data.min_required_version) < 0;
      }

      setInfo({
        mustUpdate,
        latestVersion: data.version || null,
        message: data.force_update_message || null,
        downloadUrl: data.file_path || null,
        isNative,
      });
    } catch (e) {
      console.error('Force-update check failed:', e);
    }
  }, [userProfile, userRole, currentVersion.version, isNative]);

  useEffect(() => {
    check();
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [check]);

  return { ...info, recheck: check };
};
