"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { App } from '@capacitor/app';
import { useTheme } from "@/app/components/ThemeProvider";

// Inner component — must be wrapped in <Suspense> by the parent
function RedeemContent() {
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
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

  // Auto-cancel when user navigates away without redeeming.
  // Fires on unmount — covers: timer auto-redirect, Done/Cancel button, back navigation.
  // Restores status to 'created' or 'claimed' so the user can reactivate later.
  // Skipped only when: already redeemed (redeemSuccessRef) or app was backgrounded (expiredRef, handled separately).
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
  // unmount cleanup above won't fire. We use the native Capacitor App plugin
  // because visibilitychange does NOT reliably fire in iOS WKWebView.
  const cancelledByBackgroundRef = useRef(false);
  useEffect(() => {
    let pauseListener: { remove: () => void } | null = null;
    let resumeListener: { remove: () => void } | null = null;

    const setup = async () => {
      pauseListener = await App.addListener('pause', () => {
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
      });

      resumeListener = await App.addListener('resume', () => {
        if (cancelledByBackgroundRef.current) {
          // User came back after backgrounding — redirect to home
          router.push('/');
        }
      });
    };

    setup();

    return () => {
      pauseListener?.remove();
      resumeListener?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (timeLeft <= 0) {
      // Timer hit zero — auto-redirect home so the user doesn't get stuck.
      // cancel-activation fires on unmount and restores the offer for future reuse.
      // Offers only truly expire via the campaign's end date set by the merchant.
      if (cache && !redeemSuccess && !expired) {
        setExpired(true);
        localStorage.removeItem('pending_cancel'); // prevent home page re-cancel attempt
        setTimeout(() => router.push('/'), 2500);
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev: number) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, cache, redeemSuccess, expired, router]);

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
        setTimeLeft(0);
        localStorage.removeItem('pending_qr');
        localStorage.removeItem('pending_cancel');
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

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  if (!cache) return null;

  // Determine the code to display:
  const displayCode = cache.campaign?.promo_code
    ? cache.campaign.promo_code.toUpperCase()
    : (cache.redemption?.token?.match(/.{1,3}/g) || []).join('-');
  const hasPromoCode = !!cache.campaign?.promo_code;
  // Scale font down for longer codes so they never wrap in the box (max 18 chars)
  const codeFontSize = displayCode.length <= 8 ? '2rem' : displayCode.length <= 13 ? '1.5rem' : '1.1rem';
  const codeLetterSpacing = displayCode.length <= 8 ? '5px' : displayCode.length <= 13 ? '3px' : '2px';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1.5rem 1.25rem 7rem',
      color: 'var(--text-main)',
      fontFamily: 'Outfit, sans-serif',
      overflowY: 'auto'
    }}>
      <div style={{ width: '100%', maxWidth: '420px', paddingTop: '1.5rem' }}>

        {/* ── Merchant Identity ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem', marginBottom: '1.1rem' }}>
          {cache.merchant?.logo_url ? (
            <img
              src={cache.merchant.logo_url}
              alt=""
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'contain', border: isLight ? '2px solid rgba(15,23,42,0.15)' : '2px solid rgba(255,255,255,0.15)', boxShadow: isLight ? '0 8px 24px rgba(15,23,42,0.08)' : '0 8px 24px rgba(0,0,0,0.4)' }}
            />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: isLight ? '#F3E8FF' : 'rgba(139,92,246,0.2)', border: isLight ? '2px solid #D8B4FE' : '2px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🏪</div>
          )}
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: isLight ? '#0F172A' : '#fff', textAlign: 'center' }}>
            {cache.merchant?.business_name}
          </h2>
        </div>

        {/* ── Countdown Timer (smaller, subtle) ── */}
        {!redeemSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.1rem' }}>
            <span style={{ fontSize: '0.78rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>⏱ Offer active for</span>
            <span style={{
              fontSize: '1.05rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: timeLeft <= 0 ? '#DC2626' : timeLeft < 60 ? '#B45309' : (isLight ? '#6D28D9' : '#A78BFA')
            }}>
              {timeLeft <= 0 ? '⏱ Returning home...' : formatTime(timeLeft)}
            </span>
          </div>
        )}

        {/* ── Offer Card ── */}
        <div style={{
          background: timeLeft <= 0 ? (isLight ? '#F1F5F9' : 'rgba(255,255,255,0.04)') : (isLight ? '#F3E8FF' : 'rgba(139,92,246,0.15)'),
          border: `1px solid ${timeLeft <= 0 ? (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.08)') : (isLight ? '#D8B4FE' : 'rgba(139,92,246,0.35)')}`,
          borderRadius: '20px', padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem', textAlign: 'center',
          opacity: timeLeft <= 0 ? 0.5 : 1, transition: 'all 0.5s ease'
        }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '2rem', fontWeight: 800, color: timeLeft <= 0 ? '#64748B' : (isLight ? '#6D28D9' : '#A78BFA'), lineHeight: 1.1 }}>
            {cache.campaign?.title}
          </h3>
          {cache.campaign?.terms && (
            <p style={{ margin: 0, fontSize: '0.88rem', color: isLight ? '#334155' : 'rgba(255,255,255,0.75)', lineHeight: 1.5, fontWeight: 500 }}>
              {cache.campaign.terms}
            </p>
          )}
        </div>

        {/* ── 3-Step Instruction Flow ── */}
        <div style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.25rem 1.25rem 1rem', marginBottom: '1.25rem', boxShadow: isLight ? '0 4px 16px rgba(15,23,42,0.05)' : 'none' }}>

          {/* Step 1 */}
          <div style={{ display: 'flex', gap: '0.875rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isLight ? '#F3E8FF' : 'rgba(139,92,246,0.25)', border: isLight ? '1.5px solid #D8B4FE' : '1.5px solid rgba(139,92,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: isLight ? '#6D28D9' : '#A78BFA' }}>1</div>
              <div style={{ width: '2px', flex: 1, minHeight: '16px', background: isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            </div>
            <div style={{ paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isLight ? '#0F172A' : '#fff', marginBottom: '0.15rem' }}>👋 Show this screen to the cashier</div>
              <div style={{ fontSize: '0.78rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Present your phone at the register</div>
            </div>
          </div>

          {/* Code Box (between Step 1 and Step 2) */}
          <div style={{ display: 'flex', gap: '0.875rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '28px' }}>
              <div style={{ width: '2px', flex: 1, background: isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)', margin: '0 0 4px' }} />
            </div>
            <div style={{ flex: 1, paddingBottom: '0.75rem' }}>
              <div style={{
                background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.3)', border: isLight ? '1.5px solid #CBD5E1' : '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: '14px', padding: '1rem 1.25rem', textAlign: 'center',
                opacity: timeLeft <= 0 ? 0.3 : 1
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isLight ? '#475569' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.5rem' }}>
                  {hasPromoCode ? 'Promo Code' : 'Reference Code'}
                </div>
                <div style={{ fontSize: codeFontSize, fontWeight: 800, letterSpacing: codeLetterSpacing, color: isLight ? '#0F172A' : '#fff', wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>
                  {displayCode}
                </div>
                {hasPromoCode && (
                  <div style={{ fontSize: '0.75rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.4)', marginTop: '0.4rem', fontWeight: 500 }}>
                    Cashier: enter this code at the register
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: '0.875rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isLight ? '#DCFCE7' : 'rgba(16,185,129,0.2)', border: isLight ? '1.5px solid #86EFAC' : '1.5px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: isLight ? '#15803D' : '#10B981' }}>2</div>
              <div style={{ width: '2px', flex: 1, minHeight: '16px', background: isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            </div>
            <div style={{ paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isLight ? '#0F172A' : '#fff', marginBottom: '0.15rem' }}>🛒 Cashier: Honor the offer</div>
              <div style={{ fontSize: '0.78rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                {hasPromoCode ? 'Apply the offer and enter the code at the register' : 'Apply the offer at checkout'}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: '0.875rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isLight ? '#FEF3C7' : 'rgba(251,191,36,0.2)', border: isLight ? '1.5px solid #FDE68A' : '1.5px solid rgba(251,191,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: isLight ? '#B45309' : '#FDE68A' }}>3</div>
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isLight ? '#0F172A' : '#fff', marginBottom: '0.15rem' }}>✅ Tap "Mark as Redeemed"</div>
              <div style={{ fontSize: '0.78rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Records this perk in your history and the merchant's dashboard</div>
            </div>
          </div>
        </div>

        {/* ── Mark as Redeemed / Success ── */}
        {!redeemSuccess ? (
          <button
            onClick={handleManualRedeem}
            disabled={redeeming || timeLeft <= 0}
            style={{
              width: '100%', padding: '1.1rem',
              background: (redeeming || timeLeft <= 0) ? (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)') : (isLight ? '#15803D' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'),
              color: (redeeming || timeLeft <= 0) ? (isLight ? '#94A3B8' : 'rgba(255,255,255,0.3)') : '#fff',
              border: 'none', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 700,
              cursor: (redeeming || timeLeft <= 0) ? 'not-allowed' : 'pointer',
              boxShadow: (redeeming || timeLeft <= 0) ? 'none' : (isLight ? '0 8px 20px rgba(21,128,61,0.25)' : '0 8px 20px rgba(16,185,129,0.3)'),
              transition: 'all 0.2s ease', marginBottom: '0.75rem'
            }}
          >
            {redeeming ? 'Marking as Redeemed...' : '✓ Mark as Redeemed'}
          </button>
        ) : (
          <div style={{
            width: '100%', padding: '1.1rem',
            background: isLight ? '#DCFCE7' : 'rgba(16,185,129,0.15)', border: isLight ? '1px solid #86EFAC' : '1px solid rgba(16,185,129,0.4)',
            color: isLight ? '#15803D' : '#10B981', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 700,
            textAlign: 'center', marginBottom: '0.75rem'
          }}>
            ✅ Offer Redeemed — Enjoy your perk!
          </div>
        )}

        {/* ── Done / Cancel ── */}
        <button
          onClick={async () => {
            if (!redeemSuccess && !expired && cache) {
              try {
                await fetchApi(`/campaigns/${cache.campaign.id}/cancel-activation`, { method: 'POST' });
              } catch { /* best-effort — proceed even if network fails */ }
              try {
                const existing: Array<{ campaign_id: string; merchant_name: string; title: string; qr_code: string }> =
                  JSON.parse(localStorage.getItem('pending_offers') || '[]');
                if (!existing.some(o => o.campaign_id === cache.campaign.id)) {
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
            localStorage.removeItem('pending_cancel');
            router.push('/');
          }}
          style={{ width: '100%', padding: '0.875rem', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          Done / Cancel
        </button>
      </div>
    </div>
  );
}

// Required: Next.js 14 requires a Suspense boundary for components using useRouter in static pages
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
