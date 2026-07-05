"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { getUserData } from "@/lib/user";
import { getPostLoginRoute } from "@/lib/postLoginRoute";

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
        setPendingOffers(stored);
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
    };
    init();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('pf_user_token');
    localStorage.removeItem('pf_user_data');
    setIsLoggedIn(false);
  };

  const handleJoin = async (merchant: Merchant) => {
    if (!isLoggedIn) { router.push('/auth?return=/'); return; }
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)', display: 'flex', flexDirection: 'column', fontFamily: 'Outfit, sans-serif', color: '#fff', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)', paddingBottom: '12rem', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: 'var(--safe-top, 44px) 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src={platform === 'android' ? "/app-icon.png" : "/logo.png"} alt="Perkfinity" style={{ height: '38px', width: 'auto', objectFit: 'contain', borderRadius: platform === 'android' ? '8px' : '0' }} />
        {isLoggedIn ? (
          <button onClick={handleSignOut} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Sign Out</button>
        ) : (
          <Link href="/auth" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>Sign In</Link>
        )}
      </div>

      {/* Info Card — always shown, right under header */}
      <div style={{ padding: '0.875rem 1.5rem 0' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(107,193,122,0.22) 0%, rgba(59,154,82,0.15) 100%)', border: '1px solid rgba(107,193,122,0.5)', borderRadius: '18px', padding: '0.9rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1.5, flexShrink: 0 }}>✨</span>
            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
              New local, mobile, and online businesses join regularly.
              <span style={{ display: 'block', marginTop: '0.3rem', color: 'rgba(255,255,255,0.72)', fontWeight: 500, fontSize: '0.83rem' }}>
                💬 Know a spot you love? Tell them to join at{' '}
                <button
                  onClick={() => window.open('https://www.perkfinity.net/merchants.html', '_system')}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#86EFAC', fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                >perkfinity.net</button>
              </span>
            </p>
          </div>
          <div style={{ height: '1px', background: 'rgba(107,193,122,0.35)', margin: '0.7rem 0 0.55rem' }} />
          <Link href="/onboarding" style={{ display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none', color: '#86EFAC', fontSize: '0.76rem', fontWeight: 600 }}>
            <span style={{ fontSize: '0.82rem' }}>📖</span>
            <span style={{ flex: 1 }}>Review App Benefits</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.55 }}>→</span>
          </Link>
        </div>
      </div>

      {/* Pending QR Banner */}
      {pendingQr && !isLoggedIn && (
        <div style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
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
        <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Available Perks</h3>
            <span style={{ fontSize: '0.78rem', color: '#FDE68A', fontWeight: 600 }}>{pendingOffers.length} Pending</span>
          </div>
          <div onClick={() => router.push('/activate/')} style={{ cursor: 'pointer' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.2) 100%)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '20px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 20px rgba(251,191,36,0.1)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🎁</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FDE68A', marginBottom: '2px' }}>{pendingOffers.length === 1 ? pendingOffers[0].title : `${pendingOffers.length} Offers Available`}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(253,230,138,0.7)', lineHeight: 1.4 }}>{pendingOffers.length === 1 ? 'Tap to activate your pending offer!' : `Tap to view and activate your ${pendingOffers.length} pending offers!`}</div>
              </div>
              <span style={{ color: '#FDE68A', fontSize: '1.2rem', flexShrink: 0 }}>→</span>
            </div>
          </div>
        </div>
      )}

      {/* Merchants Section */}
      <div style={{ padding: '0 1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Participating Merchants</h3>
        {/* Filter chips — Presence / Membership */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {(['all', 'nearby', 'online', 'mobile', 'joined', 'notjoined'] as const).map((key) => {
            const labels: Record<string, string> = { all: 'All', nearby: 'Near Me', online: 'Online', mobile: 'Mobile', joined: 'Joined', notjoined: 'Not Joined' };
            const isActive = key === 'all' ? activeFilters.size === 0 : activeFilters.has(key);
            return (
              <button key={key} onClick={() => toggleFilter(key)} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: isActive ? '#8B5CF6' : 'rgba(255,255,255,0.15)', background: isActive ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)', color: isActive ? '#C4B5FD' : 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'Outfit, sans-serif' }}>{labels[key]}</button>
            );
          })}
        </div>
        {/* Filter chips — Category */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', scrollbarWidth: 'none' }}>
          {(['all', 'Cafe & Juice Bars', 'Restaurants', 'Bakery & Desserts', 'Bars & Nightlife', 'Grocery & Market', 'Fitness & Gym', 'Yoga & Pilates', 'Beauty & Nail', 'Hair Salon', 'Barber Shop', 'Spa & Wellness', 'Retail & Boutique', 'Books & Hobbies', 'Pet Services', 'Services & Repair', 'Photography', 'Entertainment', 'Health & Medical', 'Other'] as const).map((cat) => {
            const catLabels: Record<string, string> = { all: 'All Categories', 'Cafe & Juice Bars': '☕ Cafe & Juice Bars', 'Restaurants': '🍽️ Restaurants', 'Bakery & Desserts': '🥐 Bakery & Desserts', 'Bars & Nightlife': '🍹 Bars & Nightlife', 'Grocery & Market': '🛒 Grocery & Market', 'Fitness & Gym': '💪 Fitness & Gym', 'Yoga & Pilates': '🧘 Yoga & Pilates', 'Beauty & Nail': '💅 Beauty & Nail', 'Hair Salon': '💇 Hair Salon', 'Barber Shop': '✂️ Barber Shop', 'Spa & Wellness': '🧖 Spa & Wellness', 'Retail & Boutique': '🛍️ Retail & Boutique', 'Books & Hobbies': '📚 Books & Hobbies', 'Pet Services': '🐾 Pet Services', 'Services & Repair': '🔧 Services & Repair', 'Photography': '📸 Photography', 'Entertainment': '🎮 Entertainment', 'Health & Medical': '🏥 Health & Medical', 'Other': '🔖 Other' };
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(prev => prev === cat ? 'all' : cat)} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: isActive ? '#6BC17A' : 'rgba(255,255,255,0.15)', background: isActive ? 'rgba(107,193,122,0.25)' : 'rgba(255,255,255,0.04)', color: isActive ? '#86EFAC' : 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap' }}>{catLabels[cat]}</button>
            );
          })}
        </div>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', zIndex: 1 }}>🔍</span>
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
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${searchFocused ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '14px',
              color: '#fff',
              fontSize: '0.875rem',
              fontFamily: 'Outfit, sans-serif',
              outline: 'none',
              boxSizing: 'border-box' as const,
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: searchFocused ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', cursor: 'pointer', padding: 0, lineHeight: 1, zIndex: 1 }}>×</button>
          )}
        </div>
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

              return (
                <div key={i} onClick={() => handleJoin(m)} style={{ padding: '0.875rem 1rem', background: hasOffer ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: '16px', border: `1px solid ${hasOffer ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                  {hasOffer && <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'linear-gradient(180deg,#8B5CF6,#6BC17A)', borderRadius: '3px 0 0 3px' }} />}
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {m.logo_url ? <img src={m.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" /> : <span style={{ fontSize: '1.2rem' }}>{isOnline ? '🌐' : '🏦'}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{m.merchant_name}</div>
                    {displayWebsite && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayWebsite}</div>}
                    {displayAddress && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayAddress}</div>}
                    {hasOffer && m.latest_offer_title && <div style={{ fontSize: '0.75rem', color: '#86EFAC', fontWeight: 600, marginTop: '3px' }}>{m.latest_offer_title}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    {m.is_member && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#86EFAC', background: 'rgba(107,193,122,0.15)', border: '1px solid rgba(107,193,122,0.3)', borderRadius: '6px', padding: '2px 7px' }}>✓ Member</span>}
                    {hasOffer && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#C4B5FD', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '6px', padding: '2px 7px' }}>{m.offer_count} offer{(m.offer_count ?? 0) > 1 ? 's' : ''}</span>}
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>›</span>
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
          <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', fontFamily: 'Outfit, sans-serif' }}>
            <div ref={modalScrollRef} style={{ width: '100%', background: 'linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%)', borderRadius: '24px 24px 0 0', padding: '2rem 1.5rem calc(2rem + env(safe-area-inset-bottom))', border: '1px solid rgba(139,92,246,0.3)', borderBottom: 'none', maxHeight: '85vh', overflowY: 'auto' }}>

              {/* Header row */}
              {joinState !== 'loading' && joinState !== 'success' && joinState !== 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(139,92,246,0.22)', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {joinModal.logo_url ? <img src={joinModal.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" /> : <span style={{ fontSize: '1.5rem' }}>{(isOnline || isHybrid) ? '🌐' : '🏪'}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{joinModal.merchant_name}</div>
                    {(isOnline || isHybrid || isMobile) && joinModal.website && (
                      <div onClick={() => { const url = joinModal.website!.startsWith('http') ? joinModal.website! : `https://${joinModal.website}`; window.open(url, '_blank'); }} style={{ fontSize: '0.78rem', color: '#8B5CF6', marginTop: '3px', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🌐 {joinModal.website.replace(/^https?:\/\//, '')}</div>
                    )}
                    {!isOnline && joinModal.store_address && (
                      isMobile
                        ? <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>📍 {joinModal.store_address}</div>
                        : <div onClick={() => mapsUrl && window.open(mapsUrl, '_blank')} style={{ fontSize: '0.78rem', color: '#8B5CF6', marginTop: '3px', cursor: mapsUrl ? 'pointer' : 'default', textDecoration: mapsUrl ? 'underline' : 'none' }}>📍 {joinModal.store_address}</div>
                    )}
                    {joinModal.discount && <div style={{ fontSize: '0.75rem', color: '#86EFAC', marginTop: '2px' }}>{joinModal.discount}</div>}
                  </div>
                  <button onClick={() => setJoinModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.4rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
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
                      style={{ padding: '0.4rem 0.85rem', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: '20px', color: '#FDE68A', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
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
                      style={{ padding: '0.4rem 0.85rem', background: 'rgba(107,193,122,0.1)', border: '1px solid rgba(107,193,122,0.3)', borderRadius: '20px', color: '#86EFAC', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
                    >
                      🛒 Order Here
                    </button>
                  )}
                </div>
              )}

              {joinState === 'confirm' && !joinModal.is_member && (
                <>
                  <div style={{ padding: '0.875rem 1rem', background: 'rgba(59,154,82,0.1)', border: '1px solid rgba(107,193,122,0.3)', borderRadius: '14px', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontSize: '0.77rem', color: '#fff', lineHeight: 1.65 }}>
                      By joining <strong>{joinModal.merchant_name}</strong>&apos;s member list, you consent to receive promotional emails and notifications.{' '}
                      <a href="https://perkfinity.net/privacy-policy.html" target="_blank" rel="noopener noreferrer" style={{ color: '#86EFAC', fontWeight: 700 }}>Privacy Policy</a>{' '}&amp;{' '}
                      <a href="https://perkfinity.net/terms-of-use.html" target="_blank" rel="noopener noreferrer" style={{ color: '#86EFAC', fontWeight: 700 }}>Terms of Use</a>.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button onClick={confirmJoin} style={{ padding: '1rem', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>🤝 Join Member List</button>
                    <button onClick={() => setJoinModal(null)} style={{ padding: '0.75rem', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
                  </div>
                </>
              )}

              {/* Member — unified offers list (physical, mobile, online) */}
              {joinState === 'confirm' && joinModal.is_member && (
                <>
                  {campaignsLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>Loading offers...</div>
                  ) : merchantCampaigns.length === 0 ? (
                    <div style={{ padding: '0.875rem 1rem', background: 'rgba(107,193,122,0.08)', border: '1px solid rgba(107,193,122,0.2)', borderRadius: '14px', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                        {(isOnline || isHybrid) ? '✓ You\'re a member! No active offers right now. Check back soon.' : '✓ You\'re a member! No active offers right now. Visit the store for future perks.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', padding: '0.6rem 0.75rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.78rem' }}>💡</span>
                        <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(210,195,255,0.9)', lineHeight: 1.6 }}>
                          Copy for online checkout<br />Scan in-store QR for in-person use.
                        </p>
                      </div>
                      {merchantCampaigns.map(offer => {
                        const isRevealed = !!revealedCodes[offer.campaign_id];
                        const isRevealingThis = revealingId === offer.campaign_id;
                        const copyLabel = copyLabels[offer.campaign_id] || 'Copy Again';
                        return (
                          <div key={offer.campaign_id} style={{ padding: '0.875rem 1rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', flex: 1 }}>{offer.title}</div>
                              {offer.end_at && (
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginLeft: '0.5rem', flexShrink: 0 }}>
                                  Exp {new Date(offer.end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                            {(isOnline || isHybrid) ? (
                              isRevealed ? (
                                <div style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '10px', padding: '10px' }}>
                                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '3px' }}>YOUR DISCOUNT CODE</div>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#C4B5FD', fontFamily: 'monospace', letterSpacing: '2px' }}>{revealedCodes[offer.campaign_id]}</div>
                                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Auto-copied ✓</div>
                                  <button onClick={async () => { try { await navigator.clipboard.writeText(revealedCodes[offer.campaign_id]); setCopyLabels(prev => ({ ...prev, [offer.campaign_id]: 'Copied! ✓' })); setTimeout(() => setCopyLabels(prev => ({ ...prev, [offer.campaign_id]: 'Copy Again' })), 2500); } catch { /* ignore */ } }} style={{ marginTop: '6px', padding: '4px 12px', background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', borderRadius: '8px', color: '#C4B5FD', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>{copyLabel}</button>
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
                                }} style={{ width: '100%', padding: '0.75rem', background: isRevealingThis ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: isRevealingThis ? 'default' : 'pointer', fontFamily: 'Outfit, sans-serif' }}>
                                  {isRevealingThis ? '...' : '🛍️ Reveal & Copy Code'}
                                </button>
                              )
                            ) : (
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{isMobile ? '🚐 Find us and scan the QR code to activate this perk.' : '📲 Visit the store and scan the QR code to activate this perk.'}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => setJoinModal(null)} style={{ width: '100%', padding: '0.75rem', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Close</button>
                </>
              )}

              {joinState === 'loading' && <div style={{ textAlign: 'center', padding: '2.5rem 0' }}><div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div><p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Joining member list...</p></div>}

              {joinState === 'success' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.1rem' }}>
                  <div style={{ fontSize: '3rem' }}>🎉</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#86EFAC' }}>You&apos;re on the list!</div>
                  <div style={{ padding: '1rem 1.25rem', background: 'rgba(251,191,36,0.1)', border: '2px solid rgba(251,191,36,0.45)', borderRadius: '16px', width: '100%', boxSizing: 'border-box' as const }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#FDE68A', lineHeight: 1.65 }}>
                      {(isOnline || isHybrid)
                        ? "🛍️ You'll receive offers via app notifications. Open Perkfinity when you get a new offer to reveal and copy your discount code!"
                        : isMobile
                          ? '🚐 Find us and scan the QR code to activate your perks. You are signed up and will start receiving offers!'
                          : '📲 Visit the store and scan their QR code to activate your perks. You are signed up and will start receiving offers!'}
                    </p>
                  </div>
                  <button onClick={() => setJoinModal(null)} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #6BC17A, #3B9A52)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Done ✓</button>
                </div>
              )}

              {joinState === 'error' && (() => {
                const isCapError = joinError.toLowerCase().includes('capacity');
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>{isCapError ? '🚫' : '⚠️'}</div>
                    <p style={{ color: '#FCA5A5', fontSize: '0.9rem', margin: 0, textAlign: 'center' }}>{joinError}</p>
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                      {!isCapError && (
                        <button onClick={confirmJoin} style={{ flex: 1, padding: '0.875rem', background: '#8B5CF6', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Try Again</button>
                      )}
                      <button onClick={() => setJoinModal(null)} style={{ flex: 1, padding: '0.875rem', background: isCapError ? '#8B5CF6' : 'none', border: isCapError ? 'none' : '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>{isCapError ? 'Got It' : 'Cancel'}</button>
                    </div>
                  </div>
                );
              })()}

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
