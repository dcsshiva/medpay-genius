import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.westmed.hospitaladmin'
',
  appName: 'westmed',
  webDir: 'dist',
  server: {
    url: 'https://e77a21f1-1fd2-4c69-b43d-d3af7c8a046d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#e8f3eb',
      showSpinner: false
    }
  }
};

export default config;
