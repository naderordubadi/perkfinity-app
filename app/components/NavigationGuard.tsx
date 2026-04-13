'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { fetchApi } from '@/lib/api';

/**
 * NavigationGuard — mounted in the root layout, always present.
 *
 * Single responsibility: Redemption cancel guard.
 *
 * When a user activates an offer and gets to /redeem, we set a
 * `pending_cancel` flag in localStorage. If the user leaves /redeem
 * without completing the redemption (by tapping any nav tab), we
 * need to call cancel-activation to revert the DB status to 'created'.
 *
 * NOTE: Profile + permission gating is handled exclusively in auth/page.tsx
 * via getPostLoginRoute(). Per product spec, already-logged-in users who
 * simply reopen the app are NOT re-checked. The gate only fires on sign-in
 * and sign-up flows.
 */
export default function NavigationGuard() {
  const pathname = usePathname();

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

  return null;
}
