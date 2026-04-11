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

        const clearBadgeSafely = async () => {
          try {
            const status = await FirebaseMessaging.checkPermissions();
            if (status.receive === 'granted') {
              await Badge.clear();
            }
          } catch { /* ignore */ }
        };

        // Clear badge immediately when app launches
        await clearBadgeSafely();

        // Called when user taps a push notification (app was in background/killed)
        const pushHandle = await FirebaseMessaging.addListener(
          'notificationActionPerformed',
          async () => {
            // Clear badge when user taps a push notification
            await clearBadgeSafely();
            router.push('/history?tab=notifications');
          }
        );

        // Clear badge when app returns to foreground
        const { App } = await import('@capacitor/app');
        const resumeHandle = await App.addListener('resume', async () => {
          await clearBadgeSafely();
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
