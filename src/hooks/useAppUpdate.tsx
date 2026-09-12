import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVersionInfo } from '@/hooks/useVersionInfo';

interface PublishedBuildInfo {
  version: string;
  timestamp?: string;
  commit?: string;
}

interface AppUpdateState {
  checking: boolean;
  updateAvailable: boolean;
  publishedVersion: string | null;
  downloadUrl: string | null;
  error: string | null;
}

const APP_CACHE_EXCLUSIONS = /firebase|onesignal/i;

const versionParts = (version: string): number[] =>
  version.replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0);

const compareVersions = (current: string, published: string): number => {
  const currentParts = versionParts(current);
  const publishedParts = versionParts(published);
  const length = Math.max(currentParts.length, publishedParts.length);

  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] || 0;
    const publishedPart = publishedParts[index] || 0;
    if (currentPart !== publishedPart) return currentPart < publishedPart ? -1 : 1;
  }
  return 0;
};

const isDifferentBuild = (
  current: ReturnType<typeof useVersionInfo>,
  published: PublishedBuildInfo,
): boolean => {
  const comparison = compareVersions(current.version, published.version);
  if (comparison < 0) return true;
  if (comparison > 0) return false;

  if (published.commit && current.gitCommit && published.commit !== 'unknown' && current.gitCommit !== 'unknown') {
    return published.commit !== current.gitCommit;
  }

  return Boolean(published.timestamp && current.buildDate && published.timestamp !== current.buildDate);
};

export const useAppUpdate = () => {
  const currentBuild = useVersionInfo();
  const [state, setState] = useState<AppUpdateState>({
    checking: false,
    updateAvailable: false,
    publishedVersion: null,
    downloadUrl: null,
    error: null,
  });

  const isNative = typeof window !== 'undefined'
    && typeof (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor !== 'undefined'
    && (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true;

  const checkForUpdate = useCallback(async (): Promise<AppUpdateState> => {
    setState((previous) => ({ ...previous, checking: true, error: null }));

    try {
      const registration = 'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration()
        : undefined;
      await registration?.update();

      const manifestResponse = await fetch(`/build-info.json?check=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!manifestResponse.ok) throw new Error('Published version information is unavailable.');

      const published = await manifestResponse.json() as PublishedBuildInfo;
      if (!published.version) throw new Error('Published version information is invalid.');

      let downloadUrl: string | null = null;
      if (isNative) {
        const { data } = await supabase
          .from('app_downloads')
          .select('file_path')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        downloadUrl = data?.file_path || null;
      }

      const nextState: AppUpdateState = {
        checking: false,
        updateAvailable: Boolean(registration?.waiting) || isDifferentBuild(currentBuild, published),
        publishedVersion: published.version.replace(/^v/i, ''),
        downloadUrl,
        error: null,
      };
      setState(nextState);
      return nextState;
    } catch (error) {
      const nextState: AppUpdateState = {
        checking: false,
        updateAvailable: false,
        publishedVersion: null,
        downloadUrl: null,
        error: error instanceof Error ? error.message : 'Unable to check for updates.',
      };
      setState(nextState);
      return nextState;
    }
  }, [currentBuild, isNative]);

  const applyUpdate = useCallback(async () => {
    if (isNative && state.downloadUrl) {
      window.open(state.downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(async (registration) => {
          const worker = registration.waiting || registration.installing || registration.active;
          const scriptUrl = worker?.scriptURL || '';
          if (APP_CACHE_EXCLUSIONS.test(scriptUrl)) return;
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          await registration.update().catch(() => undefined);
          await registration.unregister();
        }));
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.filter((name) => !APP_CACHE_EXCLUSIONS.test(name)).map((name) => caches.delete(name)),
        );
      }
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.replace(url.toString());
    }
  }, [isNative, state.downloadUrl]);

  useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  return {
    ...state,
    currentVersion: currentBuild.version,
    isNative,
    checkForUpdate,
    applyUpdate,
  };
};