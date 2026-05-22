import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.perkfinity.app',
  appName: 'Perkfinity',
  webDir: 'out',
  server: {
    // 'https' scheme = secure context → getUserMedia (camera) works on Android.
    // In dev, setMixedContentMode in MainActivity allows HTTP API calls from this HTTPS context.
    hostname: 'perkfinity.net',
    androidScheme: 'https',
  },
  plugins: {
    // SocialLogin: configure which providers to include in native builds.
    // 'compileOnly' = SDK excluded from the binary (no Facebook/Twitter tracking frameworks).
    SocialLogin: {
      providers: {
        google: 'implementation',
        apple: 'implementation',
        facebook: 'compileOnly',
        twitter: 'compileOnly',
      },
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
