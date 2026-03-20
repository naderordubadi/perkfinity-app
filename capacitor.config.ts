import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.perkfinity.app',
  appName: 'Perkfinity',
  webDir: 'out',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1053337094970-c38gunb5oljfncb4avar8c6fc4jg5kjg.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
