import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.westmed.hospitaladmin',
  appName: 'westmed',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#e8f3eb',
      showSpinner: false
    }
  }
};

export default config;
