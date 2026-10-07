'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function parseDeepLink(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    let pathname = '';
    let search = '';
    if (rawUrl.includes('://')) {
      const parsed = new URL(rawUrl);
      pathname = parsed.pathname || '';
      search = parsed.search || '';
    } else {
      const parts = rawUrl.split('?');
      pathname = parts[0] || '';
      search = parts[1] ? '?' + parts[1] : '';
    }

    // Check query params (?m=..., ?code=..., ?merchant=...)
    const params = new URLSearchParams(search);
    const mParam = params.get('m') || params.get('code') || params.get('merchant');
    if (mParam) {
      return `/qr/${encodeURIComponent(mParam)}`;
    }

    // Check pathname for /qr/..., /join/...
    const qrMatch = pathname.match(/\/(qr|join)\/([^/?#]+)/i);
    if (qrMatch && qrMatch[2]) {
      return `/qr/${encodeURIComponent(qrMatch[2])}`;
    }

    // Check pathname for /perk/...
    const perkMatch = pathname.match(/\/perk\/([^/?#]+)/i);
    if (perkMatch && perkMatch[1]) {
      return `/perk/${encodeURIComponent(perkMatch[1])}`;
    }

    // Check for other standard routes
    if (pathname.includes('/history')) return '/history';
    if (pathname.includes('/profile')) return '/profile';
    if (pathname.includes('/scan')) return '/scan';

    return null;
  } catch (err) {
    console.error('[PushHandler] Error parsing deep link:', err);
    return null;
  }
}

/**
 * PushHandler — mounted in the root layout, always present.
 *
 * 1. Listens for universal / deep links (appUrlOpen) → navigates to specific business / perk.
 * 2. Listens for push notification taps → navigates to targeted card or Notifications tab.
 * 3. Clears app icon badge when app launches or comes to foreground.
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
        const { App } = await import('@capacitor/app');

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
          async (action) => {
            await clearBadgeSafely();
            const data = (action as any)?.notification?.data;
            if (data) {
              if (data.merchant_code) {
                router.push(`/qr/${encodeURIComponent(data.merchant_code)}`);
                return;
              }
              if (data.url) {
                const targetRoute = parseDeepLink(data.url) || data.url;
                router.push(targetRoute);
                return;
              }
            }
            router.push('/history?tab=notifications');
          }
        );

        // Called when app is opened via deep link / universal link (Safari, email, etc.)
        const urlHandle = await App.addListener('appUrlOpen', async (data) => {
          if (data?.url) {
            const targetRoute = parseDeepLink(data.url);
            if (targetRoute) {
              router.push(targetRoute);
            }
          }
        });

        // Clear badge when app returns to foreground
        const resumeHandle = await App.addListener('resume', async () => {
          await clearBadgeSafely();
        });

        cleanup = () => {
          pushHandle.remove();
          urlHandle.remove();
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

