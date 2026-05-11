import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.perkfinity.app',
  appName: 'Perkfinity',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    // 'https' scheme = secure context → getUserMedia (camera) works on Android.
    // In dev, setMixedContentMode in MainActivity allows HTTP API calls from this HTTPS context.
    hostname: 'perkfinity.net',
    androidScheme: 'https',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '694850202109-2t65brhnd8ce819s1rosqjvcc53ik1jn.apps.googleusercontent.com',
      iosClientId: '694850202109-s20crmd2atktq14hr6ji0uh11utuf4bj.apps.googleusercontent.com',
      androidClientId: '694850202109-2t65brhnd8ce819s1rosqjvcc53ik1jn.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
