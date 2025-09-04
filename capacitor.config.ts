import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e77a21f11fd24c69b43dd3af7c8a046d',
  appName: 'visitpay-doctor-manage',
  webDir: 'dist',
  server: {
    url: 'https://e77a21f1-1fd2-4c69-b43d-d3af7c8a046d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      showSpinner: false
    }
  }
};

export default config;