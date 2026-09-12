import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useToast } from '@/hooks/use-toast';

interface Props {
  className?: string;
}

const CheckUpdateButton: React.FC<Props> = ({ className }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const {
    checking,
    updateAvailable,
    currentVersion,
    publishedVersion,
    downloadUrl,
    isNative,
    checkForUpdate,
    applyUpdate,
  } = useAppUpdate();

  const handleClick = async () => {
    const result = await checkForUpdate();
    if (result.error) {
      toast({
        title: 'Update check unavailable',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.updateAvailable) {
      setOpen(true);
    } else {
      toast({
        title: 'You are up to date',
        description: `Running latest published version ${currentVersion}.`,
      });
    }
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
        {updateAvailable && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {updateAvailable ? (
                <RefreshCw className="h-5 w-5 text-primary" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
              {updateAvailable ? 'Update available' : 'Up to date'}
            </DialogTitle>
            <DialogDescription>
              Use the latest published version of the application.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between rounded-md border p-3 text-sm">
            <div>
              <p className="text-muted-foreground">Your version</p>
              <p className="font-semibold">{currentVersion}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Latest version</p>
              <p className="font-semibold">{publishedVersion || '—'}</p>
            </div>
          </div>

          {isNative && downloadUrl ? (
            <Button className="w-full gap-2" onClick={applyUpdate}>
              <Download className="h-4 w-4" />
              Download latest version
            </Button>
          ) : (
            <Button className="w-full gap-2" onClick={applyUpdate}>
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
