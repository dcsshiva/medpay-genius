import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isCheckingForUpdates: boolean;
  lastUpdateCheck: Date | null;
}

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    isCheckingForUpdates: false,
    lastUpdateCheck: null
  });

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    setState(prev => ({ ...prev, isInstalled: isStandalone }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));
    };

    // Listen for online/offline
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwRegistration(registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, isUpdateAvailable: true }));
              }
            });
          }
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setState(prev => ({ ...prev, isInstallable: false }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isCheckingForUpdates: true }));
    
    try {
      if (swRegistration) {
        await swRegistration.update();
        setState(prev => ({ 
          ...prev, 
          isCheckingForUpdates: false,
          lastUpdateCheck: new Date()
        }));
        
        // Check if there's a waiting worker (update available)
        if (swRegistration.waiting) {
          setState(prev => ({ ...prev, isUpdateAvailable: true }));
          return true;
        }
        return false;
      } else if ('serviceWorker' in navigator) {
        // Try to get registration if not already set
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          setSwRegistration(registration);
          setState(prev => ({ 
            ...prev, 
            isCheckingForUpdates: false,
            lastUpdateCheck: new Date()
          }));
          
          if (registration.waiting) {
            setState(prev => ({ ...prev, isUpdateAvailable: true }));
            return true;
          }
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        isCheckingForUpdates: false,
        lastUpdateCheck: new Date()
      }));
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      setState(prev => ({ ...prev, isCheckingForUpdates: false }));
      return false;
    }
  }, [swRegistration]);

  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    } else {
      // No waiting worker, just reload
      window.location.reload();
    }
  }, [swRegistration]);

  return {
    ...state,
    installApp,
    checkForUpdates,
    applyUpdate
  };
};
