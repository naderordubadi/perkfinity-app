"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { getUserData } from "@/lib/user";
import { getPostLoginRoute } from "@/lib/postLoginRoute";
import { useTheme } from "./components/ThemeProvider";

export const dynamic = 'force-dynamic';

interface Merchant {
  id: string;
  campaign_id?: string;
  merchant_name: string;
  discount: string;
  logo_url: string | null;
  zip_code: string | null;
  qr_code: string | null;
  offer_count?: number;
  store_address?: string;
  website?: string;
  business_presence?: string;
  business_category?: string | null;
  latest_offer_title?: string;
  latest_offer_condition?: string;
  latest_offer_at?: string | null;
  offer_expires_at?: string;
  is_member?: boolean;
  promo_code?: string | null;
  review_url?: string | null;
  order_url?: string | null;
  is_fullpage_sponsored?: boolean;
  fullpage_sponsored_until?: string | null;
  cover_photo_url?: string | null;
  promo_banner_url?: string | null;
  promo_description?: string | null;
  rating_score?: string | null;
  rating_count?: string | null;
  rating_platform?: string | null;
}

interface CampaignOffer {
  campaign_id: string;
  title: string;
  discount_percentage: number | null;
  terms: string | null;
  end_at: string | null;
  campaign_type: string;
  business_presence: string;
  promo_code: string | null;
  redemption_id: string | null;
  redemption_status: string | null;
  claimed_at: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
}

export default function Home() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [mounted, setMounted] = useState(false);
  const [pendingQr, setPendingQr] = useState<string | null>(null);
  const [pendingOffers, setPendingOffers] = useState<Array<{ campaign_id: string; merchant_name: string; title: string; qr_code: string }>>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('ios');
  const [joinModal, setJoinModal] = useState<Merchant | null>(null);
  const [joinState, setJoinState] = useState<'confirm' | 'loading' | 'success' | 'error'>('confirm');
  const [joinError, setJoinError] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const [merchantCampaigns, setMerchantCampaigns] = useState<CampaignOffer[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, string>>({});
  const [copyLabels, setCopyLabels] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sponsoredMerchants, setSponsoredMerchants] = useState<Merchant[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const toggleFilter = (key: string) => {
    if (key === 'all') { setActiveFilters(new Set()); return; }
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); }
      else {
        if (key === 'joined') next.delete('notjoined');
        if (key === 'notjoined') next.delete('joined');
        next.add(key);
      }
      return next;
    });
  };


  useEffect(() => {
    const init = async () => {
      setMounted(true);
      import('@capacitor/core').then(({ Capacitor }) => {
        setPlatform(Capacitor.getPlatform() as 'ios' | 'android' | 'web');
      }).catch(() => setPlatform('web'));
      const token = localStorage.getItem('pf_user_token');
      const hasAccount = localStorage.getItem('pf_has_account');
      if (!token && !hasAccount) { router.push('/onboarding'); return; }

      // ── Setup resume gate ─────────────────────────────────────────────
      // If the user closed the app mid-onboarding (after sign-in but before
      // completing profile + permissions), resume exactly where they left off.
      if (token && !localStorage.getItem('pf_setup_complete')) {
        const userObj = getUserData();
        const dest = await getPostLoginRoute(userObj, null);
        if (dest !== '/') {
          router.push(dest);
          return;
        }
        // All gates pass — mark complete so future reopens skip this check.
        localStorage.setItem('pf_setup_complete', 'true');
      }
      // ─────────────────────────────────────────────────────────────────

      const qr = localStorage.getItem('pending_qr');
      if (qr) setPendingQr(qr);
      setIsLoggedIn(!!token);

      const pendingCancelRaw = localStorage.getItem('pending_cancel');
      if (pendingCancelRaw) {
        try {
          const pc = JSON.parse(pendingCancelRaw);
          const userToken = localStorage.getItem('pf_user_token');
          if (pc.campaign_id && userToken) {
            fetchApi(`/campaigns/${pc.campaign_id}/cancel-activation`, { method: 'POST' }).catch(() => {});
            const offers = JSON.parse(localStorage.getItem('pending_offers') || '[]');
            if (!offers.some((o: { campaign_id: string }) => o.campaign_id === pc.campaign_id)) {
              offers.push({ campaign_id: pc.campaign_id, merchant_name: pc.merchant_name, title: pc.title, qr_code: pc.qr_code });
              localStorage.setItem('pending_offers', JSON.stringify(offers));
            }
          }
        } catch { /* ignore */ }
        localStorage.removeItem('pending_cancel');
      }

      try {
        const stored = JSON.parse(localStorage.getItem('pending_offers') || '[]');
        const validStored = stored.filter((o: any) => !o.end_at || new Date(o.end_at) > new Date());
        if (validStored.length !== stored.length) {
          localStorage.setItem('pending_offers', JSON.stringify(validStored));
        }
        setPendingOffers(validStored);
      } catch { setPendingOffers([]); }

      const pendingQrCode = localStorage.getItem('pending_qr');
      const userData = localStorage.getItem('pf_user_data');
      const userZip = userData ? JSON.parse(userData).zip_code || null : null;

      fetchApi('/consumers/campaigns')
        .then(json => {
          if (json.success && json.data) {
            const data: Merchant[] = json.data;
            const sorted = [...data].sort((a, b) => {
              const aIsScanned = a.qr_code === pendingQrCode ? 1 : 0;
              const bIsScanned = b.qr_code === pendingQrCode ? 1 : 0;
              if (aIsScanned !== bIsScanned) return bIsScanned - aIsScanned;
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

      fetchApi('/merchants/sponsored?platform=app')
        .then(json => {
          if (json.success && json.data) {
            setSponsoredMerchants(json.data);
          }
        })
        .catch(e => console.error("Failed to load sponsored merchants", e));
    };
    init();
  }, []);

  useEffect(() => {
    if (sponsoredMerchants.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % (sponsoredMerchants.length + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [sponsoredMerchants.length, currentSlide]);

  const handleSignOut = () => {
    localStorage.removeItem('pf_user_token');
    localStorage.removeItem('pf_user_data');
    setIsLoggedIn(false);
  };

  const [fullPageTakeoverMerchant, setFullPageTakeoverMerchant] = useState<Merchant | null>(null);

  const handleJoin = async (merchant: Merchant) => {
    if (!isLoggedIn) { router.push('/auth?return=/'); return; }

    if (merchant.is_fullpage_sponsored && (!merchant.fullpage_sponsored_until || new Date(merchant.fullpage_sponsored_until) >= new Date())) {
      setFullPageTakeoverMerchant(merchant);
      return;
    }

    setJoinModal(merchant);
    setJoinState('confirm');
    setJoinError('');
    setRevealedCodes({});
    setCopyLabels({});
    setRevealingId(null);
    setMerchantCampaigns([]);
    setTimeout(() => { if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0; }, 50);
    if (merchant.is_member) {
      setCampaignsLoading(true);
      try {
        const json = await fetchApi(`/consumers/merchants/${merchant.id}/campaigns`);
        if (json.success) setMerchantCampaigns(json.data || []);
      } catch { /* ignore */ }
      setCampaignsLoading(false);
    }
  };

  const confirmJoin = async () => {
    if (!joinModal) return;
    setJoinState('loading');
    try {
      await fetchApi(`/qr/resolve/${joinModal.qr_code}`);
      setMerchants(prev => prev.map(m => m.id === joinModal.id ? { ...m, is_member: true } : m));
      setJoinState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setJoinError(msg);
      setJoinState('error');
    }
  };

  const handleJoinSponsored = (m: any) => {
    const isMember = merchants.find(x => x.id === m.id)?.is_member || false;
    const mappedMerchant: Merchant = {
      ...m,
      merchant_name: m.business_name,
      qr_code: m.qr_public_code || null,
      is_member: isMember,
    };
    handleJoin(mappedMerchant);
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    const total = sponsoredMerchants.length + 1;
    setCurrentSlide(prev => (prev - 1 + total) % total);
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    const total = sponsoredMerchants.length + 1;
    setCurrentSlide(prev => (prev + 1) % total);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', flexDirection: 'column', fontFamily: 'Outfit, sans-serif', color: 'var(--text-main)', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)', paddingBottom: '12rem', overflowY: 'auto' }}>

      {/* Header Spacer */}
      <div style={{ height: 'var(--safe-top, 44px)' }} />

      {/* Unified Carousel / Info Card */}
      <div style={{ padding: '0.875rem 1.5rem 1.25rem', position: 'relative' }}>
        <div style={{ position: 'relative', width: '100%', height: '170px', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.35)', boxSizing: 'border-box' }}>
          
          {/* Slide 0: Info Card */}
          {currentSlide === 0 && (
            <div style={{
              background: isLight ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' : 'linear-gradient(135deg, rgba(107,193,122,0.22) 0%, rgba(59,154,82,0.15) 100%)',
              padding: '1.25rem 1.4rem',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.35rem', lineHeight: 1.2, flexShrink: 0 }}>✨</span>
                <p style={{ margin: 0, fontSize: '0.96rem', lineHeight: 1.5, color: isLight ? '#0F172A' : 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
                  New local, mobile, and online businesses join regularly.
                  <span style={{ display: 'block', marginTop: '0.4rem', color: isLight ? '#334155' : 'rgba(255,255,255,0.72)', fontWeight: 500, fontSize: '0.88rem' }}>
                    💬 Know a spot you love? Tell them to join at{' '}
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open('https://www.perkfinity.net/merchants.html', '_system'); }}
                      style={{ background: 'none', border: 'none', padding: 0, color: isLight ? '#15803D' : '#86EFAC', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                    >perkfinity.net</button>
                  </span>
                </p>
              </div>
              <div>
                <div style={{ height: '1px', background: isLight ? 'rgba(22,163,74,0.25)' : 'rgba(107,193,122,0.35)', margin: '0.5rem 0 0.5rem' }} />
                <Link href="/onboarding" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: isLight ? '#15803D' : '#86EFAC', fontSize: '0.84rem', fontWeight: 700 }}>
                  <span style={{ fontSize: '0.9rem' }}>📖</span>
                  <span style={{ flex: 1 }}>Review App Benefits</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>→</span>
                </Link>
              </div>
            </div>
          )}

          {/* Slide 1+: Sponsored Merchants */}
          {currentSlide > 0 && sponsoredMerchants[currentSlide - 1] && (() => {
            const m = sponsoredMerchants[currentSlide - 1];
            const bannerUrl = m.promo_banner_url || m.cover_photo_url;
            const hasCover = !!bannerUrl;
            return (
              <div 
                onClick={() => handleJoinSponsored(m)}
                style={{ 
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                  backgroundImage: hasCover 
                    ? `linear-gradient(to bottom, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.65) 100%), url('${bannerUrl}')`
                    : 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '1.25rem 1.4rem'
                }}
              >
                {/* Fallback layout if no cover photo */}
                {!hasCover && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '1rem',
                    boxSizing: 'border-box'
                  }}>
                    {m.logo_url ? (
                      <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <img src={m.logo_url} style={{ width: '85%', height: '85%', objectFit: 'contain' }} alt="" />
                      </div>
                    ) : (
                      <div style={{ fontSize: '2.0rem', fontWeight: 900, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.02em', textAlign: 'center', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        {m.business_name}
                      </div>
                    )}
                  </div>
                )}

                {/* Card Info Overlay */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div>
                    <span style={{ background: '#FDE68A', color: '#1E1B4B', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SPONSORED</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>{m.business_name}</span>
                    {(m.welcome_offer_text || m.latest_offer_title) && (
                      <span style={{ background: '#8B5CF6', border: '1px solid rgba(139,92,246,0.5)', color: '#fff', padding: '3px 9px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>
                        {m.welcome_offer_text || m.latest_offer_title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Left/Right manual arrows overlay */}
          {sponsoredMerchants.length > 0 && (
            <>
              <button 
                onClick={handlePrevSlide}
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  background: 'rgba(15,23,42,0.45)', 
                  border: '1px solid rgba(255,255,255,0.12)', 
                  color: '#fff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  zIndex: 2, 
                  outline: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                ‹
              </button>
              <button 
                onClick={handleNextSlide}
                style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  background: 'rgba(15,23,42,0.45)', 
                  border: '1px solid rgba(255,255,255,0.12)', 
                  color: '#fff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  zIndex: 2, 
                  outline: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                ›
              </button>
            </>
          )}

          {/* Dots Indicator overlay at the bottom */}
          {sponsoredMerchants.length > 0 && (
            <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 2 }}>
              {Array.from({ length: sponsoredMerchants.length + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: currentSlide === idx ? '#8B5CF6' : 'rgba(255,255,255,0.4)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Pending QR Banner */}
      {pendingQr && !isLoggedIn && (
        <div style={{ padding: '0 1.5rem', marginTop: '0px' }}>
          <Link href="/onboarding" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.2) 100%)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '20px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 20px rgba(251,191,36,0.1)' }}>
              <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🎁</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FDE68A', marginBottom: '2px' }}>You Have a Pending Offer!</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(253,230,138,0.7)', lineHeight: 1.4 }}>You scanned a merchant QR. Sign up in seconds to claim your discount.</div>
              </div>
              <span style={{ color: '#FDE68A', fontSize: '1.2rem', flexShrink: 0 }}>→</span>
            </div>
          </Link>
        </div>
      )}


      {/* Pending Offers Banner */}
      {isLoggedIn && pendingOffers.length > 0 && (
        <div style={{ padding: '0 1.5rem', marginTop: '0px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: isLight ? '#0F172A' : 'var(--text-main)' }}>Available Perks</h3>
            <span style={{ fontSize: '0.78rem', color: isLight ? '#B45309' : '#FDE68A', fontWeight: 700 }}>{pendingOffers.length} Pending</span>
          </div>
          <div onClick={() => router.push('/activate/')} style={{ cursor: 'pointer' }}>
            <div style={{
              background: isLight ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' : 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.2) 100%)',
              border: isLight ? '1px solid #F59E0B' : '1px solid rgba(251,191,36,0.35)',
              borderRadius: '20px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: isLight ? '0 4px 16px rgba(245,158,11,0.15)' : '0 4px 20px rgba(251,191,36,0.1)'
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isLight ? '#F59E0B' : 'rgba(251,191,36,0.2)', border: isLight ? '1px solid #D97706' : '1px solid rgba(251,191,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🎁</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isLight ? '#78350F' : '#FDE68A', marginBottom: '2px' }}>{pendingOffers.length === 1 ? pendingOffers[0].title : `${pendingOffers.length} Offers Available`}</div>
                <div style={{ fontSize: '0.75rem', color: isLight ? '#92400E' : 'rgba(253,230,138,0.7)', lineHeight: 1.4, fontWeight: 500 }}>{pendingOffers.length === 1 ? 'Tap to activate your pending offer!' : `Tap to view and activate your ${pendingOffers.length} pending offers!`}</div>
              </div>
              <span style={{ color: isLight ? '#78350F' : '#FDE68A', fontSize: '1.2rem', flexShrink: 0, fontWeight: 'bold' }}>→</span>
            </div>
          </div>
        </div>
      )}

      {/* Merchants Section */}
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: isLight ? '#0F172A' : 'var(--text-main)' }}>Participating Merchants</h3>
          <button
            onClick={() => setShowFilters(prev => !prev)}
            style={{
              background: isLight ? (showFilters ? '#EDE9FE' : '#FFFFFF') : (showFilters ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.06)'),
              border: `1px solid ${isLight ? (showFilters ? '#6D28D9' : 'rgba(15,23,42,0.18)') : (showFilters ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.12)')}`,
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              color: isLight ? (showFilters ? '#6D28D9' : '#0F172A') : (showFilters ? '#C4B5FD' : 'rgba(255,255,255,0.7)'),
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              transition: 'all 0.2s',
              boxShadow: isLight ? '0 2px 8px rgba(15,23,42,0.05)' : 'none',
            }}
          >
            <span>🔍</span> {showFilters ? 'Hide Filters' : 'Search & Filter'}
          </button>
        </div>

        {showFilters && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {/* Filter chips — Presence / Membership */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {(['all', 'nearby', 'online', 'mobile', 'joined', 'notjoined'] as const).map((key) => {
                const labels: Record<string, string> = { all: 'All', nearby: 'Near Me', online: 'Online', mobile: 'Mobile', joined: 'Joined', notjoined: 'Not Joined' };
                const isActive = key === 'all' ? activeFilters.size === 0 : activeFilters.has(key);
                const chipBg = isLight
                  ? (isActive ? '#F3E8FF' : '#FFFFFF')
                  : (isActive ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)');
                const chipBorder = isLight
                  ? (isActive ? '#D8B4FE' : 'rgba(15,23,42,0.12)')
                  : (isActive ? '#8B5CF6' : 'rgba(255,255,255,0.15)');
                const chipColor = isLight
                  ? (isActive ? '#6D28D9' : '#475569')
                  : (isActive ? '#C4B5FD' : 'rgba(255,255,255,0.5)');
                return (
                  <button key={key} onClick={() => toggleFilter(key)} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: chipBorder, background: chipBg, color: chipColor, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'Outfit, sans-serif' }}>{labels[key]}</button>
                );
              })}
            </div>
            {/* Filter chips — Category */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', scrollbarWidth: 'none' }}>
              {(['all', 'Restaurants & Dining', 'Cafes, Bakery & Desserts', 'Grocery & Gourmet Market', 'Hair & Barber Shops', 'Beauty, Spa & Wellness', 'Fitness & Movement', 'Education & Learning', 'Health & Medical', 'Retail & Boutiques', 'Professional & Financial', 'Home, Auto & Trade', 'Pet Care & Services', 'Entertainment & Recreation', 'Photography & Creative', 'Other'] as const).map((cat) => {
                const catLabels: Record<string, string> = {
                  all: 'All Categories',
                  'Restaurants & Dining': '🍽️ Restaurants',
                  'Cafes, Bakery & Desserts': '☕ Cafes & Desserts',
                  'Grocery & Gourmet Market': '🛒 Grocery & Market',
                  'Hair & Barber Shops': '✂️ Hair & Barber',
                  'Beauty, Spa & Wellness': '💅 Beauty & Spa',
                  'Fitness & Movement': '💪 Fitness & Movement',
                  'Education & Learning': '📚 Education & Learning',
                  'Health & Medical': '🏥 Health & Medical',
                  'Retail & Boutiques': '🛍️ Retail & Boutiques',
                  'Professional & Financial': '💼 Professional & Financial',
                  'Home, Auto & Trade': '🔧 Home & Auto Services',
                  'Pet Care & Services': '🐾 Pet Care',
                  'Entertainment & Recreation': '🎮 Entertainment',
                  'Photography & Creative': '📸 Photography & Creative',
                  'Other': '🔖 Other'
                };
                const isActive = activeCategory === cat;
                const catBg = isLight
                  ? (isActive ? '#DCFCE7' : '#FFFFFF')
                  : (isActive ? 'rgba(107,193,122,0.25)' : 'rgba(255,255,255,0.04)');
                const catBorder = isLight
                  ? (isActive ? '#86EFAC' : 'rgba(15,23,42,0.12)')
                  : (isActive ? '#6BC17A' : 'rgba(255,255,255,0.15)');
                const catColor = isLight
                  ? (isActive ? '#15803D' : '#475569')
                  : (isActive ? '#86EFAC' : 'rgba(255,255,255,0.5)');
                return (
                  <button key={cat} onClick={() => setActiveCategory(prev => prev === cat ? 'all' : cat)} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: catBorder, background: catBg, color: catColor, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap' }}>{catLabels[cat] || cat}</button>
                );
              })}
            </div>
            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.88rem', color: isLight ? '#94A3B8' : 'rgba(255,255,255,0.3)', pointerEvents: 'none', zIndex: 1 }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search merchants..."
                style={{
                  width: '100%',
                  padding: '0.6rem 2.25rem 0.6rem 2.25rem',
                  background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${searchFocused ? '#6D28D9' : (isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.1)')}`,
                  borderRadius: '14px',
                  color: isLight ? '#0F172A' : '#fff',
                  fontSize: '0.875rem',
                  fontFamily: 'Outfit, sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box' as const,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: searchFocused ? '0 0 0 3px rgba(109,40,217,0.15)' : (isLight ? '0 2px 8px rgba(15,23,42,0.04)' : 'none'),
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: isLight ? '#64748B' : 'rgba(255,255,255,0.4)', fontSize: '1.1rem', cursor: 'pointer', padding: 0, lineHeight: 1, zIndex: 1 }}>×</button>
              )}
            </div>
          </div>
        )}
        {/* Vertical merchant list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {(() => {
            const userZip = (() => { try { return JSON.parse(localStorage.getItem('pf_user_data') || '{}').zip_code || null; } catch { return null; } })();
            // 1. Filter
            const filtered = merchants.filter(m => {
              if (activeFilters.size === 0) return true;
              for (const f of activeFilters) {
                if (f === 'nearby' && (m.business_presence === 'online' || (userZip && m.zip_code !== userZip))) return false;
                if (f === 'online' && !['online', 'hybrid'].includes(m.business_presence || '')) return false;
                if (f === 'mobile' && m.business_presence !== 'mobile') return false;
                if (f === 'joined' && !m.is_member) return false;
                if (f === 'notjoined' && !!m.is_member) return false;
              }
              return true;
            });
            // 1b. Category filter
            const catFiltered = activeCategory === 'all'
              ? filtered
              : filtered.filter(m => m.business_category === activeCategory);
            // 2. Search
            const query = searchQuery.trim().toLowerCase();
            const searched = query
              ? catFiltered.filter(m => m.merchant_name.toLowerCase().includes(query))
              : catFiltered;
            // 3. Sort
            let sorted: Merchant[];
            if (activeFilters.size === 0 && !query) {
              // No filter, no search — preserve initial QR-at-top order
              sorted = searched;
            } else if (activeFilters.has('nearby')) {
              sorted = [...searched].sort((a, b) => {
                const aZip = userZip && a.zip_code === userZip ? 1 : 0;
                const bZip = userZip && b.zip_code === userZip ? 1 : 0;
                if (aZip !== bZip) return bZip - aZip;
                return a.merchant_name.localeCompare(b.merchant_name);
              });
            } else if (activeFilters.has('online') || activeFilters.has('mobile') || activeFilters.has('notjoined')) {
              sorted = [...searched].sort((a, b) => a.merchant_name.localeCompare(b.merchant_name));
            } else {
              // All+search, Joined — latest offer date DESC, nulls last
              sorted = [...searched].sort((a, b) => {
                const aDate = a.latest_offer_at ? new Date(a.latest_offer_at).getTime() : 0;
                const bDate = b.latest_offer_at ? new Date(b.latest_offer_at).getTime() : 0;
                return bDate - aDate;
              });
            }
            if (merchants.length === 0) return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', padding: '1rem 0' }}>Loading merchants...</div>;
            if (sorted.length === 0) return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', padding: '1rem 0' }}>{query ? `No merchants found for “${searchQuery}”.` : 'No merchants match this filter.'}</div>;
            return sorted.map((m, i) => {
              const isOnline = m.business_presence === 'online';
              const isMobile = m.business_presence === 'mobile';
              const isHybrid = m.business_presence === 'hybrid';
              const hasOffer = (m.offer_count ?? 0) > 0;
              const cleanWebsite = m.website ? m.website.replace(/^https?:\/\//, '') : null;
              let displayWebsite = null;
              let displayAddress = null;

              if (isOnline) {
                displayWebsite = cleanWebsite || 'Online Store';
              } else {
                displayWebsite = cleanWebsite;
                if (isMobile) {
                  displayAddress = m.store_address || (cleanWebsite ? null : 'Mobile Business');
                } else if (isHybrid) {
                  displayAddress = m.store_address || (cleanWebsite ? null : 'Location TBD');
                } else {
                  displayAddress = m.store_address || 'Location TBD';
                }
              }

              const cardBg = isLight
                ? (hasOffer ? '#F5F3FF' : '#FFFFFF')
                : (hasOffer ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.03)');

              const cardBorder = isLight
                ? (hasOffer ? '1px solid rgba(109,40,217,0.3)' : '1px solid rgba(15,23,42,0.12)')
                : (hasOffer ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)');

              const logoBg = isLight ? '#EDE9FE' : 'rgba(139,92,246,0.18)';
              const logoBorder = isLight ? '1px solid #DDD6FE' : '1px solid rgba(139,92,246,0.3)';

              return (
                <div key={i} onClick={() => handleJoin(m)} style={{ padding: '0.875rem 1rem', background: cardBg, borderRadius: '16px', border: cardBorder, display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: isLight ? '0 4px 14px rgba(15,23,42,0.04)' : 'none' }}>
                  {hasOffer && <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'linear-gradient(180deg,#8B5CF6,#6BC17A)', borderRadius: '3px 0 0 3px' }} />}
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: logoBg, border: logoBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {m.logo_url ? <img src={m.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" /> : <span style={{ fontSize: '1.2rem' }}>{isOnline ? '🌐' : '🏦'}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isLight ? '#0F172A' : '#fff' }}>{m.merchant_name}</div>
                    {displayWebsite && <div style={{ fontSize: '0.75rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.45)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayWebsite}</div>}
                    {displayAddress && <div style={{ fontSize: '0.75rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.45)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayAddress}</div>}
                    {hasOffer && m.latest_offer_title && <div style={{ fontSize: '0.75rem', color: isLight ? '#15803D' : '#86EFAC', fontWeight: 700, marginTop: '3px' }}>{m.latest_offer_title}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    {m.is_member && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isLight ? '#15803D' : '#86EFAC', background: isLight ? '#DCFCE7' : 'rgba(107,193,122,0.15)', border: isLight ? '1px solid #86EFAC' : '1px solid rgba(107,193,122,0.3)', borderRadius: '6px', padding: '2px 7px' }}>✓ Member</span>}
                    {hasOffer && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isLight ? '#6D28D9' : '#C4B5FD', background: isLight ? '#F3E8FF' : 'rgba(139,92,246,0.2)', border: isLight ? '1px solid #D8B4FE' : '1px solid rgba(139,92,246,0.4)', borderRadius: '6px', padding: '2px 7px' }}>{m.offer_count} offer{(m.offer_count ?? 0) > 1 ? 's' : ''}</span>}
                    <span style={{ color: isLight ? '#94A3B8' : 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>›</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Merchant Detail Modal */}
      {joinModal && (() => {
        const isOnline = joinModal.business_presence === 'online';
        const isHybrid = joinModal.business_presence === 'hybrid';
        const isMobile = joinModal.business_presence === 'mobile';
        const mapsUrl = joinModal.store_address && !isOnline && !isMobile
          ? (platform === 'android'
            ? `https://maps.google.com/maps?q=${encodeURIComponent(joinModal.store_address)}`
            : `maps://maps.apple.com/?q=${encodeURIComponent(joinModal.store_address)}`)
          : null;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: isLight ? 'rgba(15,23,42,0.6)' : 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', fontFamily: 'Outfit, sans-serif' }}>
            <div ref={modalScrollRef} style={{ width: '100%', background: isLight ? '#FFFFFF' : 'linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%)', borderRadius: '24px 24px 0 0', padding: '2rem 1.5rem calc(2rem + env(safe-area-inset-bottom))', border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(139,92,246,0.3)', borderBottom: 'none', maxHeight: '85vh', overflowY: 'auto', boxShadow: isLight ? '0 -10px 40px rgba(15,23,42,0.15)' : 'none' }}>

              {/* Header row */}
              {joinState !== 'loading' && joinState !== 'success' && joinState !== 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: isLight ? '#F3E8FF' : 'rgba(139,92,246,0.22)', border: isLight ? '1px solid #D8B4FE' : '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {joinModal.logo_url ? <img src={joinModal.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" /> : <span style={{ fontSize: '1.5rem' }}>{(isOnline || isHybrid) ? '🌐' : '🏪'}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isLight ? '#0F172A' : '#fff' }}>{joinModal.merchant_name}</div>
                    {(isOnline || isHybrid || isMobile) && joinModal.website && (
                      <div onClick={() => { const url = joinModal.website!.startsWith('http') ? joinModal.website! : `https://${joinModal.website}`; window.open(url, '_blank'); }} style={{ fontSize: '0.78rem', color: isLight ? '#6D28D9' : '#8B5CF6', marginTop: '3px', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>🌐 {joinModal.website.replace(/^https?:\/\//, '')}</div>
                    )}
                    {!isOnline && joinModal.store_address && (
                      isMobile
                        ? <div style={{ fontSize: '0.78rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.5)', marginTop: '3px', fontWeight: 600 }}>📍 {joinModal.store_address}</div>
                        : <div onClick={() => mapsUrl && window.open(mapsUrl, '_blank')} style={{ fontSize: '0.78rem', color: isLight ? '#6D28D9' : '#8B5CF6', marginTop: '3px', cursor: mapsUrl ? 'pointer' : 'default', textDecoration: mapsUrl ? 'underline' : 'none', fontWeight: 600 }}>📍 {joinModal.store_address}</div>
                    )}
                    {joinModal.discount && <div style={{ fontSize: '0.75rem', color: isLight ? '#15803D' : '#86EFAC', marginTop: '2px', fontWeight: 700 }}>{joinModal.discount}</div>}
                  </div>
                  <button onClick={() => setJoinModal(null)} style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : 'rgba(255,255,255,0.4)', fontSize: '1.4rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                </div>
              )}

              {/* Review / Order links */}
              {(joinModal.review_url || joinModal.order_url) && joinState !== 'loading' && joinState !== 'success' && joinState !== 'error' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {joinModal.review_url && (
                    <button
                      onClick={() => {
                        const url = joinModal.review_url!.startsWith('http') ? joinModal.review_url! : `https://${joinModal.review_url}`;
                        window.open(url, '_blank');
                      }}
                      style={{ padding: '0.4rem 0.85rem', background: isLight ? '#FEF3C7' : 'rgba(250,204,21,0.1)', border: isLight ? '1px solid #FDE68A' : '1px solid rgba(250,204,21,0.3)', borderRadius: '20px', color: isLight ? '#78350F' : '#FDE68A', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
                    >
                      ⭐ Check our Reviews
                    </button>
                  )}
                  {joinModal.order_url && (
                    <button
                      onClick={() => {
                        const url = joinModal.order_url!.startsWith('http') ? joinModal.order_url! : `https://${joinModal.order_url}`;
                        window.open(url, '_blank');
                      }}
                      style={{ padding: '0.4rem 0.85rem', background: isLight ? '#DCFCE7' : 'rgba(107,193,122,0.1)', border: isLight ? '1px solid #86EFAC' : '1px solid rgba(107,193,122,0.3)', borderRadius: '20px', color: isLight ? '#15803D' : '#86EFAC', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
                    >
                      🛒 Order Here
                    </button>
                  )}
                </div>
              )}

              {joinState === 'confirm' && !joinModal.is_member && (
                <>
                  <div style={{ padding: '0.875rem 1rem', background: isLight ? '#DCFCE7' : 'rgba(59,154,82,0.1)', border: isLight ? '1px solid #86EFAC' : '1px solid rgba(107,193,122,0.3)', borderRadius: '14px', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontSize: '0.77rem', color: isLight ? '#15803D' : '#fff', lineHeight: 1.65, fontWeight: 600 }}>
                      By joining <strong>{joinModal.merchant_name}</strong>&apos;s member list, you consent to receive promotional emails and notifications.{' '}
                      <button
                        onClick={() => window.open('https://www.perkfinity.net/privacy-policy.html', '_system')}
                        style={{ background: 'none', border: 'none', padding: 0, color: isLight ? '#15803D' : '#86EFAC', fontWeight: 800, fontSize: '0.77rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
                      >Privacy Policy</button>{' '}&amp;{' '}
                      <button
                        onClick={() => window.open('https://www.perkfinity.net/terms-of-use.html', '_system')}
                        style={{ background: 'none', border: 'none', padding: 0, color: isLight ? '#15803D' : '#86EFAC', fontWeight: 800, fontSize: '0.77rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
                      >Terms of Use</button>.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button onClick={confirmJoin} style={{ padding: '1rem', background: isLight ? '#6D28D9' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>🤝 Join Member List</button>
                    <button onClick={() => setJoinModal(null)} style={{ padding: '0.75rem', background: 'none', border: isLight ? '1px solid rgba(15,23,42,0.15)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', color: isLight ? '#64748B' : 'rgba(255,255,255,0.55)', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Cancel</button>
                  </div>
                </>
              )}

              {/* Member — unified offers list (physical, mobile, online) */}
              {joinState === 'confirm' && joinModal.is_member && (
                <>
                  {campaignsLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: isLight ? '#64748B' : 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>Loading offers...</div>
                  ) : merchantCampaigns.length === 0 ? (
                    <div style={{ padding: '0.875rem 1rem', background: isLight ? '#DCFCE7' : 'rgba(107,193,122,0.08)', border: isLight ? '1px solid #86EFAC' : '1px solid rgba(107,193,122,0.2)', borderRadius: '14px', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: isLight ? '#15803D' : 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontWeight: 600 }}>
                        {(isOnline || isHybrid) ? '✓ You\'re a member! No active offers right now. Check back soon.' : '✓ You\'re a member! No active offers right now. Visit the store for future perks.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', padding: '0.6rem 0.75rem', background: isLight ? '#F3E8FF' : 'rgba(139,92,246,0.08)', border: isLight ? '1px solid #D8B4FE' : '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.78rem' }}>💡</span>
                        <p style={{ margin: 0, fontSize: '0.74rem', color: isLight ? '#6D28D9' : 'rgba(210,195,255,0.9)', lineHeight: 1.6, fontWeight: 600 }}>
                          Copy for online checkout<br />Scan in-store QR for in-person use.
                        </p>
                      </div>
                      {merchantCampaigns.map(offer => {
                        const isRevealed = !!revealedCodes[offer.campaign_id];
                        const isRevealingThis = revealingId === offer.campaign_id;
                        const copyLabel = copyLabels[offer.campaign_id] || 'Copy Again';
                        return (
                          <div key={offer.campaign_id} style={{ padding: '0.875rem 1rem', background: isLight ? '#F8FAFC' : 'rgba(139,92,246,0.08)', border: isLight ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(139,92,246,0.25)', borderRadius: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isLight ? '#0F172A' : '#fff', flex: 1 }}>{offer.title}</div>
                              {offer.end_at && (
                                <div style={{ fontSize: '0.65rem', color: isLight ? '#64748B' : 'rgba(255,255,255,0.4)', marginLeft: '0.5rem', flexShrink: 0, fontWeight: 600 }}>
                                  Exp {new Date(offer.end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                            {(isOnline || isHybrid) ? (
                              isRevealed ? (
                                <div style={{ background: isLight ? '#F3E8FF' : 'rgba(139,92,246,0.15)', border: isLight ? '1px solid #D8B4FE' : '1px solid rgba(139,92,246,0.4)', borderRadius: '10px', padding: '10px' }}>
                                  <div style={{ fontSize: '0.6rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: '3px' }}>YOUR DISCOUNT CODE</div>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isLight ? '#6D28D9' : '#C4B5FD', fontFamily: 'monospace', letterSpacing: '2px' }}>{revealedCodes[offer.campaign_id]}</div>
                                  <div style={{ fontSize: '0.6rem', color: isLight ? '#64748B' : 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Auto-copied ✓</div>
                                  <button onClick={async () => { try { await navigator.clipboard.writeText(revealedCodes[offer.campaign_id]); setCopyLabels(prev => ({ ...prev, [offer.campaign_id]: 'Copied! ✓' })); setTimeout(() => setCopyLabels(prev => ({ ...prev, [offer.campaign_id]: 'Copy Again' })), 2500); } catch { /* ignore */ } }} style={{ marginTop: '6px', padding: '4px 12px', background: isLight ? '#6D28D9' : 'rgba(139,92,246,0.3)', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>{copyLabel}</button>
                                </div>
                              ) : (
                                <button disabled={isRevealingThis} onClick={async () => {
                                  setRevealingId(offer.campaign_id);
                                  try {
                                    const json = await fetchApi('/redemptions/claim', { method: 'POST', body: JSON.stringify({ campaign_id: offer.campaign_id }) });
                                    const code = json.data?.promo_code || '';
                                    setRevealedCodes(prev => ({ ...prev, [offer.campaign_id]: code }));
                                    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
                                  } catch (err: unknown) {
                                    const msg = err instanceof Error ? err.message : String(err);
                                    setJoinError(`Reveal failed: ${msg}`);
                                    setJoinState('error');
                                  }
                                  setRevealingId(null);
                                }} style={{ width: '100%', padding: '0.75rem', background: isRevealingThis ? (isLight ? '#E2E8F0' : 'rgba(139,92,246,0.3)') : (isLight ? '#6D28D9' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)'), border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: isRevealingThis ? 'default' : 'pointer', fontFamily: 'Outfit, sans-serif' }}>
                                  {isRevealingThis ? '...' : '🛍️ Reveal & Copy Code'}
                                </button>
                              )
                            ) : (
                              <div style={{ fontSize: '0.75rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.5)', lineHeight: 1.4, fontWeight: 500 }}>{isMobile ? '🚐 Find us and scan the QR code to activate this perk.' : '📲 Visit the store and scan the QR code to activate this perk.'}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => setJoinModal(null)} style={{ width: '100%', padding: '0.75rem', background: 'none', border: isLight ? '1px solid rgba(15,23,42,0.15)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', color: isLight ? '#64748B' : 'rgba(255,255,255,0.55)', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Close</button>
                </>
              )}

              {joinState === 'loading' && <div style={{ textAlign: 'center', padding: '2.5rem 0' }}><div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div><p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.6)', margin: 0 }}>Joining member list...</p></div>}

              {joinState === 'success' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.1rem' }}>
                  <div style={{ fontSize: '3rem' }}>🎉</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isLight ? '#15803D' : '#86EFAC' }}>You&apos;re on the list!</div>
                  <div style={{ padding: '1rem 1.25rem', background: isLight ? '#FEF3C7' : 'rgba(251,191,36,0.1)', border: isLight ? '2px solid #FDE68A' : '2px solid rgba(251,191,36,0.45)', borderRadius: '16px', width: '100%', boxSizing: 'border-box' as const }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isLight ? '#78350F' : '#FDE68A', lineHeight: 1.65 }}>
                      {(isOnline || isHybrid)
                        ? "🛍️ You'll receive offers via app notifications. Open Perkfinity when you get a new offer to reveal and copy your discount code!"
                        : isMobile
                          ? '🚐 Find us and scan the QR code to activate your perks. You are signed up and will start receiving offers!'
                          : '📲 Visit the store and scan their QR code to activate your perks. You are signed up and will start receiving offers!'}
                    </p>
                  </div>
                  <button onClick={() => setJoinModal(null)} style={{ width: '100%', padding: '1rem', background: isLight ? '#15803D' : 'linear-gradient(135deg, #6BC17A, #3B9A52)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Done ✓</button>
                </div>
              )}

              {joinState === 'error' && (() => {
                const isCapError = joinError.toLowerCase().includes('capacity');
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>{isCapError ? '🚫' : '⚠️'}</div>
                    <p style={{ color: isLight ? '#DC2626' : '#FCA5A5', fontSize: '0.9rem', margin: 0, textAlign: 'center', fontWeight: 600 }}>{joinError}</p>
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                      {!isCapError && (
                        <button onClick={confirmJoin} style={{ flex: 1, padding: '0.875rem', background: isLight ? '#6D28D9' : '#8B5CF6', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Try Again</button>
                      )}
                      <button onClick={() => setJoinModal(null)} style={{ flex: 1, padding: '0.875rem', background: isCapError ? (isLight ? '#6D28D9' : '#8B5CF6') : 'none', border: isCapError ? 'none' : (isLight ? '1px solid rgba(15,23,42,0.2)' : '1px solid rgba(255,255,255,0.2)'), borderRadius: '14px', color: isCapError ? '#fff' : (isLight ? '#0F172A' : '#fff'), fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>{isCapError ? 'Got It' : 'Cancel'}</button>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        );
      })()}

      {/* Full Page VIP Takeover Modal Overlay */}
      {fullPageTakeoverMerchant && (() => {
        const m = fullPageTakeoverMerchant;
        const bannerUrl = m.promo_banner_url || m.cover_photo_url;
        const ratingPlatform = m.rating_platform || 'Google';
        const ratingCountStr = m.rating_count ? ` (${m.rating_count})` : '';
        const fullAddr = [m.address_line1 || m.address, m.city, m.state, m.zip_code].filter(Boolean).join(', ');

        let reviewBtnLabel = '⭐ View Customer Reviews';
        if (m.rating_platform) {
          reviewBtnLabel = `⭐ View ${m.rating_platform} Reviews`;
        } else if (m.review_url) {
          const rLower = m.review_url.toLowerCase();
          if (rLower.includes('yelp')) reviewBtnLabel = '⭐ View Yelp Reviews';
          else if (rLower.includes('google') || rLower.includes('g.page') || rLower.includes('maps.app.goo.gl')) reviewBtnLabel = '⭐ View Google Reviews';
        }

        return (
          <div style={{ position: 'fixed', inset: 0, background: isLight ? '#F8FAFC' : '#0F172A', zIndex: 99999, overflowY: 'auto', display: 'flex', flexDirection: 'column', fontFamily: 'Outfit, sans-serif', color: isLight ? '#0F172A' : '#F8FAFC' }}>
            {/* Header Image & Back Button */}
            <div style={{ position: 'relative', width: '100%', height: '240px', backgroundColor: isLight ? '#E2E8F0' : '#1E293B' }}>
              {bannerUrl ? (
                <img src={bannerUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: isLight ? 'linear-gradient(135deg, #F3E8FF 0%, #DCFCE7 100%)' : 'linear-gradient(135deg, #311C87 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  {m.logo_url ? (
                    <img src={m.logo_url} style={{ maxHeight: '80px', maxWidth: '80%', objectFit: 'contain' }} alt="" />
                  ) : (
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: isLight ? '#0F172A' : '#FFFFFF', textAlign: 'center' }}>
                      {m.business_name || m.merchant_name || 'Brand'}
                    </span>
                  )}
                </div>
              )}
              <button 
                onClick={() => setFullPageTakeoverMerchant(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.75)', border: 'none', color: isLight ? '#0F172A' : '#fff', width: '38px', height: '38px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Title & Star Rating */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: isLight ? '#0F172A' : '#FFFFFF' }}>{m.business_name}</h1>
                  <span style={{ background: isLight ? '#6D28D9' : '#8B5CF6', color: '#FFF', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>VIP</span>
                </div>
                {m.rating_score && (
                  m.review_url ? (
                    <a href={m.review_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', color: '#78350F', padding: '4px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, marginTop: '4px', textDecoration: 'none' }}>
                      ⭐ {m.rating_score} on {ratingPlatform}{ratingCountStr} ↗
                    </a>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', color: '#78350F', padding: '4px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, marginTop: '4px' }}>
                      ⭐ {m.rating_score} on {ratingPlatform}{ratingCountStr}
                    </div>
                  )
                )}
              </div>

              {/* Business Promotional Description */}
              {m.promo_description && (
                <div style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)', borderLeft: isLight ? '4px solid #6D28D9' : '4px solid #8B5CF6', borderTop: isLight ? '1px solid rgba(15,23,42,0.1)' : 'none', borderRight: isLight ? '1px solid rgba(15,23,42,0.1)' : 'none', borderBottom: isLight ? '1px solid rgba(15,23,42,0.1)' : 'none', borderRadius: '12px', padding: '1rem', fontSize: '0.9rem', color: isLight ? '#334155' : '#E2E8F0', lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto', fontWeight: 500 }}>
                  <strong style={{ color: isLight ? '#6D28D9' : '#C4B5FD', display: 'block', marginBottom: '4px', fontWeight: 800 }}>📝 About this Store & Offer:</strong>
                  {m.promo_description}
                </div>
              )}

              {/* Offer Highlight */}
              <div style={{ background: isLight ? '#F3E8FF' : 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(49,28,135,0.25))', border: isLight ? '1px solid #D8B4FE' : '1px solid rgba(139,92,246,0.3)', borderRadius: '16px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isLight ? '#6D28D9' : '#C4B5FD', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>🏷️ Exclusive Perk</div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: isLight ? '#0F172A' : '#FFF' }}>{m.welcome_offer_text || m.latest_offer_title || 'Exclusive Member Offer'}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: isLight ? '#475569' : '#94A3B8', fontWeight: 500 }}>Show your Perkfinity QR code at checkout to claim.</p>
              </div>

              {/* Direct Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {m.order_url && (
                  <a href={m.order_url} target="_blank" rel="noopener noreferrer" style={{ background: isLight ? '#15803D' : '#16A34A', color: '#fff', padding: '0.9rem', borderRadius: '12px', textAlign: 'center', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
                    🛒 Order / Shop Now
                  </a>
                )}
                {m.review_url && (
                  <a href={m.review_url} target="_blank" rel="noopener noreferrer" style={{ background: isLight ? '#1D4ED8' : '#2563EB', color: '#fff', padding: '0.9rem', borderRadius: '12px', textAlign: 'center', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
                    {reviewBtnLabel}
                  </a>
                )}
                {m.website && (
                  <a href={m.website.startsWith('http') ? m.website : 'https://' + m.website} target="_blank" rel="noopener noreferrer" style={{ background: isLight ? '#334155' : '#475569', color: '#fff', padding: '0.9rem', borderRadius: '12px', textAlign: 'center', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
                    🌐 Official Website
                  </a>
                )}
              </div>

              {/* Where to Redeem Map Embed / Card */}
              <div style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1rem', boxShadow: isLight ? '0 4px 16px rgba(15,23,42,0.05)' : 'none' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isLight ? '#0F172A' : '#F1F5F9', marginBottom: '8px' }}>📍 Where To Redeem</div>
                {fullAddr ? (
                  <>
                    <div style={{ borderRadius: '10px', overflow: 'hidden', border: isLight ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.1)', height: '160px' }}>
                      <iframe width="100%" height="160" frameBorder="0" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddr)}&t=&z=14&ie=UTF8&iwloc=&output=embed`} allowFullScreen />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: isLight ? '#475569' : '#94A3B8', marginTop: '6px', fontWeight: 600 }}>📍 {fullAddr}</div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: isLight ? '#475569' : '#94A3B8', textAlign: 'center', padding: '1rem', fontWeight: 600 }}>🌐 Online Store — Available Nationwide</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        body { background-color: #0F172A; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
