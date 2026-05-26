import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { useForceUpdateGate } from '@/hooks/useForceUpdateGate';
import { useVersionInfo } from '@/hooks/useVersionInfo';

const ForceUpdateGate: React.FC = () => {
  const { mustUpdate, latestVersion, message, downloadUrl, isNative } = useForceUpdateGate();
  const currentVersion = useVersionInfo();

  if (!mustUpdate) return null;

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
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Update Required
          </DialogTitle>
          <DialogDescription>
            A newer version of the app is available and required to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between rounded-md border p-3">
            <div>
              <p className="text-muted-foreground">Your version</p>
              <p className="font-semibold">{currentVersion.version}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Latest version</p>
              <p className="font-semibold">{latestVersion}</p>
            </div>
          </div>
          {message && (
            <p className="rounded-md bg-muted p-3 text-muted-foreground whitespace-pre-wrap">
              {message}
            </p>
          )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForceUpdateGate;
