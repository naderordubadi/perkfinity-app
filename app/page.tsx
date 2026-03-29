"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

export const dynamic = 'force-dynamic';

interface Merchant {
  id: string;
  merchant_name: string;
  discount: string;
  logo_url: string | null;
  zip_code: string | null;
  qr_code: string | null;
  offer_count?: number;
  store_address?: string;
  latest_offer_title?: string;
  latest_offer_condition?: string;
  offer_expires_at?: string;
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pendingQr, setPendingQr] = useState<string | null>(null);
  const [pendingOffers, setPendingOffers] = useState<Array<{ campaign_id: string; merchant_name: string; title: string; qr_code: string }>>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('pf_user_token');
    const hasAccount = localStorage.getItem('pf_has_account');

    // First-time user: no token AND no account history → show onboarding slides
    if (!token && !hasAccount) {
      router.push('/onboarding');
      return;
    }

    const qr = localStorage.getItem('pending_qr');
    if (qr) setPendingQr(qr);
    setIsLoggedIn(!!token);

    // ── Reliable cancel-activation fallback ──────────────────────────
    // If the user navigated away from /redeem without completing the redemption,
    // the QR page stored a 'pending_cancel' entry. Process it here so the
    // member-list status always reverts to Created when the home page loads.
    const pendingCancelRaw = localStorage.getItem('pending_cancel');
    if (pendingCancelRaw) {
      try {
        const pc = JSON.parse(pendingCancelRaw);
        const userToken = localStorage.getItem('pf_user_token');
        if (pc.campaign_id && userToken) {
          // Fire-and-forget — don't block home page loading
          fetchApi(
            `/campaigns/${pc.campaign_id}/cancel-activation`,
            { method: 'POST' }
          ).catch(() => { });
          // Restore offer to pending_offers if not already present
          const offers = JSON.parse(localStorage.getItem('pending_offers') || '[]');
          if (!offers.some((o: { campaign_id: string }) => o.campaign_id === pc.campaign_id)) {
            offers.push({ campaign_id: pc.campaign_id, merchant_name: pc.merchant_name, title: pc.title, qr_code: pc.qr_code });
            localStorage.setItem('pending_offers', JSON.stringify(offers));
          }
        }
      } catch { /* ignore */ }
      localStorage.removeItem('pending_cancel'); // always clear, even if processing failed
    }

    // Load member-specific pending offers (set by QR page after resolving campaigns)
    try {
      const stored = JSON.parse(localStorage.getItem('pending_offers') || '[]');
      setPendingOffers(stored);
    } catch { setPendingOffers([]); }

    // Fetch live participating merchants
    const pendingQrCode = localStorage.getItem('pending_qr');
    const userData = localStorage.getItem('pf_user_data');
    const userZip = userData ? JSON.parse(userData).zip_code || null : null;

    fetchApi('/consumers/campaigns')
      .then(json => {
        if (json.success && json.data) {
          const data: Merchant[] = json.data;
          // Sort: last-scanned merchant first, then zip-match, then rest
          const sorted = [...data].sort((a, b) => {
            const aIsScanned = a.qr_code === pendingQrCode ? 1 : 0;
            const bIsScanned = b.qr_code === pendingQrCode ? 1 : 0;
            if (aIsScanned !== bIsScanned) return bIsScanned - aIsScanned;
            // Merchants with active offers come next
            const aHasOffer = (a.offer_count ?? 0) > 0 ? 1 : 0;
            const bHasOffer = (b.offer_count ?? 0) > 0 ? 1 : 0;
            if (aHasOffer !== bHasOffer) return bHasOffer - aHasOffer;
            const aZipMatch = userZip && a.zip_code === userZip ? 1 : 0;
            const bZipMatch = userZip && b.zip_code === userZip ? 1 : 0;
            return bZipMatch - aZipMatch;
          });
          setMerchants(sorted);
        }
      })
      .catch(e => console.error("Failed to load merchants", e));
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('pf_user_token');
    localStorage.removeItem('pf_user_data');
    setIsLoggedIn(false);
    // Reload page or let state update handle it. Since we are on Home page,
    // state will re-render header to say "Sign in"
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Outfit, sans-serif',
      color: '#fff',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      paddingBottom: '12rem', // Increased bottom padding to clear navbar
      overflowY: 'auto'
    }}>
      {/* Header with full logo */}
      <div style={{
        padding: 'max(env(safe-area-inset-top, 44px), 44px) 1.5rem 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Plain img — next/image generates /_next/image?url= paths that Capacitor file:// can't resolve */}
        <img src="/logo.png" alt="Perkfinity" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
        {isLoggedIn ? (
          <button onClick={handleSignOut} style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '20px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}>Sign Out</button>
        ) : (
          <Link href="/auth" style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '20px',
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>Sign In</Link>
        )}
      </div>

      {/* Pending QR Banner — shown when user scanned a QR but isn't signed up yet */}
      {pendingQr && !isLoggedIn && (
        <div style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
          <Link href="/onboarding" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.2) 100%)',
              border: '1px solid rgba(251,191,36,0.35)',
              borderRadius: '20px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 20px rgba(251,191,36,0.1)',
            }}>
              <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🎁</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FDE68A', marginBottom: '2px' }}>
                  You Have a Pending Offer!
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(253,230,138,0.7)', lineHeight: 1.4 }}>
                  You scanned a merchant QR. Sign up in seconds to claim your discount.
                </div>
              </div>
              <span style={{ color: '#FDE68A', fontSize: '1.2rem', flexShrink: 0 }}>→</span>
            </div>
          </Link>
        </div>
      )}

      {/* Hero Card */}
      <div style={{ padding: '1.75rem 1.5rem 1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(107,193,122,0.1) 0%, rgba(139,92,246,0.15) 100%)',
          border: '1px solid rgba(107,193,122,0.2)',
          borderRadius: '28px',
          padding: '2rem 1.75rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          {/* Background glow blobs */}
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '120px', height: '120px',
            background: 'radial-gradient(circle, rgba(107,193,122,0.25), transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute', bottom: '-20px', left: '-20px',
            width: '100px', height: '100px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)',
            borderRadius: '50%'
          }} />

          {/* Floating discount badges */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['15% off ✂️', '20% off 🧖', '10% off 🌿'].map((badge, i) => (
              <span key={i} style={{
                padding: '4px 10px',
                background: 'rgba(107,193,122,0.15)',
                border: '1px solid rgba(107,193,122,0.3)',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#86EFAC',
                letterSpacing: '0.02em'
              }}>{badge}</span>
            ))}
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Ready to Save<br />at Local Shops?
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', margin: '0 0 1.75rem', lineHeight: 1.5, maxWidth: '260px' }}>
            Scan, claim, and instantly get discounts at your favorite local businesses — no cards needed.
          </p>

          <Link href="/onboarding" style={{
            display: 'block',
            padding: '1rem 1.5rem',
            background: 'linear-gradient(135deg, #6BC17A, #3B9A52)',
            borderRadius: '16px',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(107,193,122,0.35)',
            letterSpacing: '0.01em'
          }}>Get Started →</Link>
        </div>
      </div>

      {/* How it works strip */}
      <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[
            { icon: '📱', label: 'Scan QR', desc: 'At any store' },
            { icon: '✅', label: 'Claim', desc: 'Instant discount' },
            { icon: '🎉', label: 'Save', desc: 'Every visit' }
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1,
              padding: '1rem 0.75rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '18px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Perks (For Logged In Users with Pending QR) */}
      {/* Available Perks — logged-in user with pending offers */}
      {isLoggedIn && pendingOffers.length > 0 && (
        <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Available Perks</h3>
            <span style={{ fontSize: '0.78rem', color: '#FDE68A', fontWeight: 600 }}>{pendingOffers.length} Pending</span>
          </div>
          <div onClick={() => router.push('/activate/')} style={{ cursor: 'pointer' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.2) 100%)',
              border: '1px solid rgba(251,191,36,0.35)',
              borderRadius: '20px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(251,191,36,0.1)',
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🎁</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FDE68A', marginBottom: '2px' }}>
                  {pendingOffers.length === 1 ? pendingOffers[0].title : `${pendingOffers.length} Offers Available`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(253,230,138,0.7)', lineHeight: 1.4 }}>
                  {pendingOffers.length === 1 ? 'Tap to activate your pending offer!' : `Tap to view and activate your ${pendingOffers.length} pending offers!`}
                </div>
              </div>
              <span style={{ color: '#FDE68A', fontSize: '1.2rem', flexShrink: 0 }}>→</span>
            </div>
          </div>
        </div>
      )}

      {/* Fallback banner for unauthenticated users who scanned a QR */}

      {/* Participating merchants */}
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Participating Merchants Around You</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {merchants.length > 0 ? merchants.map((m: Merchant, i: number) => {
            // For the scanned merchant, show this user's personal pending offer count
            const isScannedMerchant = pendingQr && m.qr_code === pendingQr;
            const displayCount = isScannedMerchant && pendingOffers.length > 0
              ? pendingOffers.length
              : (m.offer_count ?? 0);
            const hasOffer = !isScannedMerchant && displayCount > 0;
            const displayLabel = displayCount > 1 ? `${displayCount} offers` : m.discount;
            const mapsUrl = m.store_address ? `maps://maps.apple.com/?q=${encodeURIComponent(m.store_address)}` : null;
            return (
              <div key={i} style={{
                minWidth: hasOffer ? '150px' : '130px',
                padding: '1rem',
                background: isScannedMerchant ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.04)',
                borderRadius: '20px',
                border: isScannedMerchant ? '1px solid rgba(251,191,36,0.4)' : hasOffer ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(139,92,246,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: hasOffer ? '0 0 20px rgba(139,92,246,0.15)' : 'none'
              }}>
                {/* NEW OFFER Ribbon */}
                {hasOffer && (
                  <div style={{
                    position: 'absolute', top: '10px', right: '-28px',
                    background: '#EF4444',
                    color: '#fff',
                    fontSize: '0.55rem',
                    fontWeight: 800,
                    padding: '3px 30px',
                    transform: 'rotate(35deg)',
                    letterSpacing: '0.5px',
                    zIndex: 2,
                    boxShadow: '0 2px 8px rgba(239,68,68,0.4)'
                  }}>NEW OFFER</div>
                )}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  background: isScannedMerchant ? 'rgba(251,191,36,0.22)' : 'rgba(139,92,246,0.22)',
                  border: isScannedMerchant ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(139,92,246,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', alignSelf: 'center'
                }}>
                  {m.logo_url ? <img src={m.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : '🏪'}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', textAlign: 'center' }}>{m.merchant_name}</div>
                <div style={{
                  fontSize: '0.7rem', fontWeight: 700,
                  color: isScannedMerchant ? '#FDE68A' : '#86EFAC',
                  background: isScannedMerchant ? 'rgba(251,191,36,0.15)' : 'rgba(107,193,122,0.12)',
                  border: isScannedMerchant ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(107,193,122,0.25)',
                  borderRadius: '8px',
                  padding: '2px 6px',
                  display: 'inline-block',
                  alignSelf: 'center'
                }}>
                  {displayLabel}
                </div>
                {/* Offer details for merchants with active offers */}
                {hasOffer && m.latest_offer_condition && (
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, textAlign: 'center' }}>
                    {m.latest_offer_condition}
                  </div>
                )}
                {/* Offer expiration */}
                {hasOffer && m.offer_expires_at && (
                  <div style={{ fontSize: '0.6rem', color: 'rgba(251,191,36,0.7)', textAlign: 'center', fontWeight: 600 }}>
                    Expires {new Date(m.offer_expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
                {/* Action text */}
                <div style={{ fontSize: '0.65rem', color: isScannedMerchant ? 'rgba(253,230,138,0.6)' : 'rgba(255,255,255,0.35)', lineHeight: 1.3, textAlign: 'center', marginTop: '2px' }}>
                  {isScannedMerchant ? 'Tap banner to activate!' : 'Scan QR in store to redeem'}
                </div>
                {/* Address at bottom — tappable to open Apple Maps */}
                {!isScannedMerchant && m.store_address && (
                  <div
                    onClick={(e) => { e.stopPropagation(); if (mapsUrl) window.open(mapsUrl, '_blank'); }}
                    style={{
                      fontSize: '0.6rem',
                      color: 'rgba(255,255,255,0.35)',
                      lineHeight: 1.3,
                      textAlign: 'center',
                      marginTop: 'auto',
                      paddingTop: '4px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      cursor: mapsUrl ? 'pointer' : 'default'
                    }}
                  >
                    📍 {m.store_address}
                  </div>
                )}
              </div>
            );
          }) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading merchants...</div>
          )}
        </div>
      </div>

      <style>{`
        body { background-color: #0F172A; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
