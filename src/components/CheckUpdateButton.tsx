import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { useVersionInfo } from '@/hooks/useVersionInfo';
import { useToast } from '@/hooks/use-toast';

const compareSemver = (a: string, b: string): number => {
  const pa = (a || '').replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = (b || '').replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
};

interface Props {
  className?: string;
}

const CheckUpdateButton: React.FC<Props> = ({ className }) => {
  const currentVersion = useVersionInfo();
  const { toast } = useToast();
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const isNative = typeof (window as any).Capacitor !== 'undefined'
    && (window as any).Capacitor?.isNativePlatform?.() === true;

  const fetchLatest = useCallback(async () => {
    const { data } = await supabase
      .from('app_downloads')
      .select('version, file_path, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setLatestVersion(data.version || null);
      setDownloadUrl(data.file_path || null);
    }
    return data;
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const hasUpdate = latestVersion
    ? compareSemver(currentVersion.version, latestVersion) < 0
    : false;

  const handleClick = async () => {
    setChecking(true);
    const data = await fetchLatest();
    setChecking(false);
    const latest = data?.version || latestVersion;
    if (latest && compareSemver(currentVersion.version, latest) < 0) {
      setOpen(true);
    } else {
      toast({
        title: 'You are up to date',
        description: `Running latest version ${currentVersion.version}.`,
      });
    }
  };

  const handleReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.replace(url.toString());
  };

  const handleDownload = () => {
    if (downloadUrl) window.open(downloadUrl, '_blank');
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={checking}
        className={`relative gap-2 ${className || ''}`}
        title="Check for app updates"
      >
        <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">Update</span>
        {hasUpdate && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {hasUpdate ? (
                <RefreshCw className="h-5 w-5 text-primary" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
              {hasUpdate ? 'Update available' : 'Up to date'}
            </DialogTitle>
            <DialogDescription>
              Use the latest published version of the application.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between rounded-md border p-3 text-sm">
            <div>
              <p className="text-muted-foreground">Your version</p>
              <p className="font-semibold">{currentVersion.version}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Latest version</p>
              <p className="font-semibold">{latestVersion || '—'}</p>
            </div>
          </div>

          {isNative && downloadUrl ? (
            <Button className="w-full gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download latest version
            </Button>
          ) : (
            <Button className="w-full gap-2" onClick={handleReload}>
              <RefreshCw className="h-4 w-4" />
              Reload now to update
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CheckUpdateButton;
