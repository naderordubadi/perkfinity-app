'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * PushHandler — mounted in the root layout, always present.
 *
 * Registers a listener for push notification taps (when user taps the
 * notification from the lock screen or notification center).
 * On tap → navigates to the Notifications tab in History.
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

        // Called when user taps a push notification (app was in background/killed)
        const handle = await FirebaseMessaging.addListener(
          'notificationActionPerformed',
          () => {
            // Navigate to notifications tab
            router.push('/history?tab=notifications');
          }
        );

        cleanup = () => handle.remove();
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
