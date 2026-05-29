'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { getUserData } from '@/lib/user';
import { getPostLoginRoute } from '@/lib/postLoginRoute';

/**
 * NavigationGuard — mounted in the root layout, always present.
 *
 * Responsibilities:
 * 1. Redemption cancel guard (reverts pending_cancel offers).
 * 2. Profile + Permission gating (ensures users can't bypass setup by restarting the app).
 */
export default function NavigationGuard() {
  const pathname = usePathname();
  const router = useRouter();

  // 1. Redemption cancel guard
  useEffect(() => {
    // We're on the redeem page — don't cancel anything
    if (pathname === '/redeem') return;

    const pendingCancelRaw = localStorage.getItem('pending_cancel');
    if (!pendingCancelRaw) return; // nothing to do

    // Clear it immediately so it only fires once even if useEffect re-runs
    localStorage.removeItem('pending_cancel');

    try {
      const pc = JSON.parse(pendingCancelRaw);
      const userToken = localStorage.getItem('pf_user_token');

      if (!pc.campaign_id || !userToken) return;

      // Revert member-list status to Created in the DB
      fetchApi(
        `/campaigns/${pc.campaign_id}/cancel-activation`,
        { method: 'POST' }
      ).catch(() => { /* best-effort */ });

      // Restore offer to pending_offers so it reappears on the home page
      try {
        const offers: Array<{ campaign_id: string; merchant_name: string; title: string; qr_code: string }> =
          JSON.parse(localStorage.getItem('pending_offers') || '[]');
        if (!offers.some(o => o.campaign_id === pc.campaign_id)) {
          offers.push({
            campaign_id: pc.campaign_id,
            merchant_name: pc.merchant_name,
            title: pc.title,
            qr_code: pc.qr_code,
          });
          localStorage.setItem('pending_offers', JSON.stringify(offers));
        }
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Failed to parse pending_cancel:', err);
    }
  }, [pathname]);

  // 2. Profile & Permission Guard (checks on every navigation)
  useEffect(() => {
    const publicRoutes = ['/onboarding', '/auth', '/download', '/privacy', '/terms'];
    // Allow public routes without a gate
    if (publicRoutes.includes(pathname)) return;

    const userToken = localStorage.getItem('pf_user_token');
    // If they have no token on a protected route, boot them to auth.
    // (There is likely another mechanism doing this, but safe to enforce here too).
    if (!userToken) {
      router.replace('/auth');
      return;
    }

    const checkGate = async () => {
      const user = getUserData();
      const pendingQr = localStorage.getItem('pending_qr');
      
      const targetRoute = await getPostLoginRoute(user, pendingQr);

      // If the gate determines they belong on /profile or /permissions,
      // and they are trying to access a core app route (like /scan), force them back.
      if (
        (targetRoute === '/profile' || targetRoute === '/permissions') &&
        pathname !== targetRoute
      ) {
        router.replace(targetRoute);
      }
    };

    checkGate();
  }, [pathname, router]);

  return null;
}
