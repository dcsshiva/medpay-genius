import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

export const initializeMobileFeatures = async () => {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#e8f3eb' });
  } catch (e) {
    console.log('StatusBar not available');
  }

  if (getPlatform() === 'android') {
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  }

  Network.addListener('networkStatusChange', status => {
    console.log('Network status changed', status.connected);
    window.dispatchEvent(new CustomEvent('networkStatus', { 
      detail: { online: status.connected } 
    }));
  });
};

export const setupDeepLinks = () => {
  if (!isNativePlatform()) return;

  App.addListener('appUrlOpen', (data) => {
    console.log('App opened with URL:', data.url);
    const url = new URL(data.url);
    if (url.pathname === '/auth') {
      window.location.href = '/auth' + url.search;
    }
  });
};

export const checkNetwork = async (): Promise<boolean> => {
  if (isNativePlatform()) {
    const status = await Network.getStatus();
    return status.connected;
  }
  return navigator.onLine;
};
