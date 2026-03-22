"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { fetchApi } from "@/lib/api";

// Inner component that uses useSearchParams — must be wrapped in <Suspense> by the parent
function RedeemContent() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes max
  const [cache, setCache] = useState<any>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [expired, setExpired] = useState(false);
  const router = useRouter();

  // Refs so the unmount cleanup always has the latest values
  const redeemSuccessRef = useRef(false);
  const cacheRef = useRef<any>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    const dataString = localStorage.getItem('active_token_cache');
    if (!dataString) {
      router.push('/');
      return;
    }
    try {
      const data = JSON.parse(dataString);
      setCache(data);

      // Only set pending_cancel once we actually arrive on the redeem page
      // This prevents race conditions where NavigationGuard cancels the offer
      // while still transitioning away from the activate page.
      localStorage.setItem('pending_cancel', JSON.stringify({
        campaign_id: data.campaign.id,
        merchant_name: data.merchant.business_name,
        title: data.campaign.title,
        qr_code: localStorage.getItem('pending_qr') || '',
      }));

      // Synchronize timer with server
      const expiresAt = new Date(data.redemption.expires_at).getTime();
      const now = new Date().getTime();
      const diffSecs = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diffSecs);

      // If already redeemed according to cache, show success state immediately 
      // (This handles page reloads after successful redemption)
      if (data.redemption.redeemed) {
        setRedeemSuccess(true);
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  // Keep refs in sync with state (needed for cleanup closure)
  useEffect(() => { redeemSuccessRef.current = redeemSuccess; }, [redeemSuccess]);
  useEffect(() => { cacheRef.current = cache; }, [cache]);

  // Auto-cancel when user navigates away without redeeming AND not expired
  // If expired, expire API was already called — do NOT call cancel-activation
  useEffect(() => {
    return () => {
      const c = cacheRef.current;
      if (redeemSuccessRef.current || expiredRef.current || !c) return;

      const campaignId = c.campaign.id;

      // keepalive:true keeps the request going even after the page navigates away
      fetchApi(
        `/campaigns/${campaignId}/cancel-activation`,
        { method: 'POST', keepalive: true }
      ).catch(() => { });

      // Restore offer to pending_offers immediately (localStorage is synchronous)
      try {
        const offers = JSON.parse(localStorage.getItem('pending_offers') || '[]');
        if (!offers.some((o: { campaign_id: string }) => o.campaign_id === campaignId)) {
          offers.push({
            campaign_id: campaignId,
            merchant_name: c.merchant.business_name,
            title: c.campaign.title,
            qr_code: localStorage.getItem('pending_qr') || '',
          });
          localStorage.setItem('pending_offers', JSON.stringify(offers));
        }
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps — intentionally runs cleanup on unmount only

  // Auto-cancel when app is backgrounded (user swipes home, opens another app)
  // In Capacitor WebView, the page stays mounted when backgrounded, so the
  // unmount cleanup above won't fire. This listener handles that case.
  const cancelledByBackgroundRef = useRef(false);
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // App went to background — treat as Done/Cancel
        const c = cacheRef.current;
        if (redeemSuccessRef.current || expiredRef.current || !c) return;

        cancelledByBackgroundRef.current = true;
        // Prevent unmount cleanup from also firing cancel
        expiredRef.current = true;

        // Call cancel-activation
        fetchApi(
          `/campaigns/${c.campaign.id}/cancel-activation`,
          { method: 'POST', keepalive: true }
        ).catch(() => {});

        // Restore offer to pending_offers
        try {
          const offers = JSON.parse(localStorage.getItem('pending_offers') || '[]');
          if (!offers.some((o: { campaign_id: string }) => o.campaign_id === c.campaign.id)) {
            offers.push({
              campaign_id: c.campaign.id,
              merchant_name: c.merchant.business_name,
              title: c.campaign.title,
              qr_code: localStorage.getItem('pending_qr') || '',
            });
            localStorage.setItem('pending_offers', JSON.stringify(offers));
          }
        } catch { /* ignore */ }

        localStorage.removeItem('pending_cancel');
      }

      if (document.visibilityState === 'visible' && cancelledByBackgroundRef.current) {
        // User came back after backgrounding — redirect to home
        router.push('/');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (timeLeft <= 0) {
      // Timer just hit zero — mark as expired
      if (cache && !redeemSuccess && !expired) {
        // Set ref SYNCHRONOUSLY first — prevents unmount cleanup race
        // (useEffect-based sync only updates after render; this is immediate)
        expiredRef.current = true;
        setExpired(true);
        // 1. Tell the backend to set status → 'expired'
        fetchApi(
          `/campaigns/${cache.campaign.id}/expire`,
          { method: 'POST' }
        ).catch(() => { });

        // 2. Remove from pending_offers so banner count drops
        try {
          const offers = JSON.parse(localStorage.getItem('pending_offers') || '[]');
          const updated = offers.filter((o: { campaign_id: string }) => o.campaign_id !== cache.campaign.id);
          localStorage.setItem('pending_offers', JSON.stringify(updated));
        } catch { /* ignore */ }

        // 3. Clear pending_cancel since we explicitly expired it
        localStorage.removeItem('pending_cancel');
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev: number) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, cache, redeemSuccess, expired]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualRedeem = async () => {
    if (redeeming || timeLeft <= 0 || !cache) return;
    try {
      setRedeeming(true);
      const res = await fetchApi('/campaigns/redeem', {
        method: 'POST',
        body: JSON.stringify({ token: cache.redemption.token })
      });
      const json = res;
      if (json.success) {
        setRedeemSuccess(true);
        setTimeLeft(0); // Stop the countdown timer
        localStorage.removeItem('pending_qr'); // Clear the Pending Perk banner from home page
        localStorage.removeItem('pending_cancel'); // Redeemed — no auto-cancel needed
        // Update local cache to show redeemed state if they reload
        const updatedCache = { ...cache, redemption: { ...cache.redemption, redeemed: true } };
        localStorage.setItem('active_token_cache', JSON.stringify(updatedCache));
      } else {
        alert(json.error || 'Failed to redeem');
      }
    } catch (err) {
      console.error(err);
      alert('Network error during redemption');
    } finally {
      setRedeeming(false);
    }
  };

  if (!cache) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1rem 8rem 1rem', // Added 8rem bottom padding for navbar clearance
      color: '#fff',
      fontFamily: 'Outfit, sans-serif',
      textAlign: 'center',
      alignItems: 'center',
      overflowY: 'auto'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '2rem', paddingBottom: '4rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: 'rgba(255,255,255,0.8)', fontSize: '1.25rem' }}>{cache.merchant.business_name}</h2>
        <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>SHOW THIS TO CASHIER</h2>

        {/* Large Timer — hidden after successful redemption */}
        {!redeemSuccess && (
          <div style={{
            fontSize: '4rem',
            fontWeight: 800,
            margin: '0.5rem 0 1rem',
            color: timeLeft < 60 ? '#EF4444' : '#fff',
            fontVariantNumeric: 'tabular-nums',
            textShadow: timeLeft <= 0 ? 'none' : '0 0 20px rgba(139,92,246,0.5)'
          }}>
            {timeLeft <= 0 ? "EXPIRED" : formatTime(timeLeft)}
          </div>
        )}

        {/* Promo Perk Visibility */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem 1rem',
          background: timeLeft <= 0 ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.15)',
          border: `1px solid ${timeLeft <= 0 ? 'rgba(255,255,255,0.1)' : 'rgba(139,92,246,0.3)'}`,
          borderRadius: '16px',
          opacity: timeLeft <= 0 ? 0.5 : 1
        }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, color: timeLeft <= 0 ? '#aaa' : '#A78BFA', lineHeight: 1.2 }}>
            {cache.campaign.title}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
            {cache.campaign.terms}
          </p>
        </div>

        {/* Dynamic QR Code Canvas */}
        <div style={{
          width: '240px',
          height: '240px',
          background: '#fff',
          margin: '0 auto',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          opacity: timeLeft <= 0 ? 0.2 : 1,
          filter: timeLeft <= 0 ? 'grayscale(100%) blur(4px)' : 'none',
          transition: 'all 0.5s ease'
        }}>
          <QRCodeSVG
            value={`perkfinity://redeem?campaign=${cache.campaign.id}&token=${cache.redemption.token}`}
            size={192}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"H"}
            imageSettings={{
              src: cache.merchant.logo_url || "/app-icon.png",
              x: undefined, y: undefined,
              height: 48, width: 48,
              excavate: true,
            }}
          />
        </div>

        {/* Letter Word Code */}
        <div style={{
          marginTop: '2.5rem',
          padding: '1rem 2rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          border: '1px dotted rgba(255,255,255,0.2)',
          display: 'inline-block',
          opacity: timeLeft <= 0 ? 0.3 : 1
        }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '8px' }}>
            {cache.redemption.token.match(/.{1,3}/g).join('-')}
          </span>
        </div>

        {/* Manual Redeem Button for Merchant Verification (Cashier push it instead of scanning) */}
        {!redeemSuccess ? (
          <button
            onClick={handleManualRedeem}
            disabled={redeeming || timeLeft <= 0}
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: (redeeming || timeLeft <= 0) ? 'not-allowed' : 'pointer',
              opacity: (redeeming || timeLeft <= 0) ? 0.5 : 1
            }}
          >
            {redeeming ? 'Redeeming...' : 'Cashier: Mark as Redeemed'}
          </button>
        ) : (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.4)',
            color: '#10B981',
            borderRadius: '16px',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            ✅ Successfully Redeemed!
          </div>
        )}
      </div>

      <button
        onClick={async () => {
          // If expired, just go home — the expire API was already called
          // If not redeemed and not expired, revert status back to 'created'
          if (!redeemSuccess && !expired && cache) {
            // 1. Tell the backend to revert status: pending → created
            try {
              await fetchApi(
                `/campaigns/${cache.campaign.id}/cancel-activation`,
                { method: 'POST' }
              );
            } catch { /* best-effort — proceed even if network fails */ }

            // 2. Restore offer to pending_offers so it reappears on home page
            try {
              const existing: Array<{ campaign_id: string; merchant_name: string; title: string; qr_code: string }> =
                JSON.parse(localStorage.getItem('pending_offers') || '[]');
              const alreadyThere = existing.some(o => o.campaign_id === cache.campaign.id);
              if (!alreadyThere) {
                existing.push({
                  campaign_id: cache.campaign.id,
                  merchant_name: cache.merchant.business_name,
                  title: cache.campaign.title,
                  qr_code: localStorage.getItem('pending_qr') || '',
                });
                localStorage.setItem('pending_offers', JSON.stringify(existing));
              }
            } catch { /* ignore */ }
          }
          localStorage.removeItem('pending_cancel'); // explicit cancel already handled above
          router.push('/');
        }}
        style={{
          width: '100%',
          padding: '1rem',
          color: 'rgba(255,255,255,0.4)',
          background: 'none',
          border: 'none',
          marginBottom: '2rem'
        }}
      >
        Done / Cancel
      </button>
    </div>
  );
}

// Required: useSearchParams() in RedeemContent needs a Suspense boundary (Next.js 14 requirement)
export default function RedeemPage() {
  return (
    <Suspense fallback={
      <div style={{
        height: '100vh',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Outfit, sans-serif'
      }}>
        Loading...
      </div>
    }>
      <RedeemContent />
    </Suspense>
  );
}
