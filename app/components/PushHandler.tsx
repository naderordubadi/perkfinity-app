'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * PushHandler — mounted in the root layout, always present.
 *
 * 1. Listens for push notification taps → navigates to Notifications tab.
 * 2. Clears app icon badge when app comes to foreground.
 */
export default function PushHandler() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const { Badge } = await import('@capawesome/capacitor-badge');

        // Clear badge immediately when app launches
        try { await Badge.clear(); } catch { /* ignore */ }

        // Called when user taps a push notification (app was in background/killed)
        const pushHandle = await FirebaseMessaging.addListener(
          'notificationActionPerformed',
          async () => {
            // Clear badge when user taps a push notification
            try { await Badge.clear(); } catch { /* ignore */ }
            router.push('/history?tab=notifications');
          }
        );

        // Clear badge when app returns to foreground
        const { App } = await import('@capacitor/app');
        const resumeHandle = await App.addListener('resume', async () => {
          try { await Badge.clear(); } catch { /* ignore */ }
        });

        cleanup = () => {
          pushHandle.remove();
          resumeHandle.remove();
        };
      } catch (err) {
        console.error('[PushHandler] Setup failed:', err);
      }
    }

    setup();

    return () => {
      if (cleanup) cleanup();
    };
  }, [router]);

  return null;
}
