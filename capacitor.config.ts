import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.westmed.hospitaladmin',
  appName: 'westmed hospital',
  webDir: 'dist',
  
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#e8f3eb',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#e8f3eb'
    },
    
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
