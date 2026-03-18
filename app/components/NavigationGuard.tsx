'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * NavigationGuard — mounted in the root layout, always present.
 * 
 * Detects when the user navigates AWAY from /redeem without completing
 * the redemption, then immediately:
 *  1. Calls cancel-activation to revert the DB status to 'created'
 *  2. Restores the offer to pending_offers so the home page shows it
 *  3. Clears the pending_cancel flag
 * 
 * This fires regardless of which tab the user taps (Home, Profile,
 * Scan, History) because it lives at the layout level.
 */
export default function NavigationGuard() {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // Only act when navigating AWAY from /redeem
    if (prev !== '/redeem' || pathname === '/redeem') return;

    const pendingCancelRaw = localStorage.getItem('pending_cancel');
    if (!pendingCancelRaw) return;

    try {
      const pc = JSON.parse(pendingCancelRaw);
      const userToken = localStorage.getItem('pf_user_token');

      if (pc.campaign_id && userToken) {
        // Call cancel-activation immediately — status reverts to Created in the DB
        fetch(
          `https://perkfinity-backend.vercel.app/api/v1/campaigns/${pc.campaign_id}/cancel-activation`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userToken}` },
          }
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
      }
    } catch { /* ignore bad JSON */ }

    // Always clear the flag once processed
    localStorage.removeItem('pending_cancel');
  }, [pathname]);

  return null; // renders nothing
}
