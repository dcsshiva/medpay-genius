import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const wasDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('pwa-prompt-dismissed');
      } else {
        setDismissed(true);
      }
    }
  }, []);

  useEffect(() => {
    // Show prompt after 3 seconds if installable and not dismissed
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      toast.success('App installed successfully!');
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm">Install WestMed Payroll</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2 -mt-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            Install for faster access and offline support
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            onClick={handleInstall}
            className="w-full"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const OfflineIndicator = () => {
  const { isOnline } = usePWA();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
    } else {
      // Delay hiding to allow for animation
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${isOnline ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You are offline. Some features may be limited.</span>
      </div>
    </div>
  );
};
