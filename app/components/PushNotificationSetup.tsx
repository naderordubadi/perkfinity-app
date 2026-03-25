'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://perkfinity-backend.vercel.app/api/v1';

export default function PushNotificationSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function registerPush() {
      try {
        // Request permission
        const { receive } = await FirebaseMessaging.requestPermissions();
        if (receive !== 'granted') return;

        // Get the FCM token for this device
        const { token } = await FirebaseMessaging.getToken();
        if (!token) return;

        // Register the token with our backend (requires the user to be logged in)
        // The app stores the JWT under 'pf_user_token' (set in lib/user.ts)
        const authToken = localStorage.getItem('pf_user_token');
        if (!authToken) return;

        await fetch(`${API_BASE}/consumers/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token }),
        });
      } catch (err) {
        console.error('[Push] Registration failed:', err);
      }
    }

    // First attempt after 2s; retry at 5s in case auth state hasn't settled yet
    const t1 = setTimeout(registerPush, 2000);
    const t2 = setTimeout(registerPush, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return null; // Invisible component
}
