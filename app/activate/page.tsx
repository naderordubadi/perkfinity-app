'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { getMerchantInitials } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from '../components/ThemeProvider';
import { IconClock, IconCheckCircle, IconGift, IconSparkles, IconFlame, IconAlertTriangle, IconCalendar, IconStore } from '../components/Icons';

interface PendingOffer {
  campaign_id: string;
  merchant_name: string;
  title: string;
  qr_code: string;
}

interface Campaign {
  id: string;
  title: string;
  terms: string;
  discount_percentage: number;
  status: string;
  campaign_type?: string;
  end_at?: string;
}

interface MerchantInfo {
  business_name: string;
  logo_url?: string;
}

interface LocationInfo {
  address?: string;
  city?: string;
}

function formatExpirationLine(end_at?: string): { text: string; color: string; iconType: 'sparkles' | 'flame' | 'warning' | 'calendar' } {
  if (!end_at) {
    return { text: "No expiration date — but don't wait too long!", color: 'rgba(167,139,250,0.9)', iconType: 'sparkles' };
  }
  const expires = new Date(end_at);
  const now = new Date();
  const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Far future (> 365 days) — treat like no expiry
  if (diffDays > 365) {
    return { text: "No expiration date — but don't wait too long!", color: 'rgba(167,139,250,0.9)', iconType: 'sparkles' };
  }

  const formatted = expires.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (diffDays <= 3) {
    return { text: `Expires ${formatted} — act fast!`, color: '#F87171', iconType: 'flame' };
  }
  if (diffDays <= 7) {
    return { text: `Expires ${formatted} — offer ending soon`, color: '#FDE68A', iconType: 'warning' };
  }
  return { text: `Expires ${formatted}`, color: 'rgba(255,255,255,0.5)', iconType: 'calendar' };
}

export default function ActivatePage() {
  const [offers, setOffers] = useState<PendingOffer[]>([]);
  const [isAndroid, setIsAndroid] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ title: string; message: string; iconType: 'clock' | 'check' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => setIsAndroid(Capacitor.getPlatform() === 'android')).catch(() => { });
    // Read pending offers from localStorage
    const raw = localStorage.getItem('pending_offers');
    if (!raw) {
      router.push('/');
      return;
    }

    let parsed: any[] = [];
    try { parsed = JSON.parse(raw); } catch { router.push('/'); return; }

    // Filter out offers whose end_at timestamp has passed
    const activeOffers = parsed.filter((o: any) => !o.end_at || new Date(o.end_at) > new Date());

    if (activeOffers.length === 0) {
      localStorage.removeItem('pending_offers');
      const expiredMerchant = parsed[0]?.merchant_name || 'this merchant';
      setOffers([]);
      setModalState({
        iconType: "clock",
        title: "This Offer Has Expired",
        message: `This limited-time perk from ${expiredMerchant} has expired. Keep an eye on your Daily Digest for fresh exclusive offers!`,
      });
      setLoading(false);
      return;
    }

    setOffers(activeOffers);

    // Fetch full campaign details for richer display & fresh active campaign sync
    const qrCode = parsed[0]?.qr_code || localStorage.getItem('pending_qr') || '';
    if (qrCode) {
      fetchApi(`/qr/resolve/${qrCode}`)
        .then(res => {
          const qrData = res.data;
          if (qrData?.merchant) setMerchantInfo(qrData.merchant);
          if (qrData?.location) setLocationInfo(qrData.location);
          if (qrData?.campaigns && qrData.campaigns.length > 0) {
            // Keep fresh active campaigns from backend
            const activeCampaigns = qrData.campaigns.filter((c: Campaign) => 
              (c.status === 'created' || c.status === 'active') && 
              (!c.end_at || new Date(c.end_at) > new Date())
            );
            setCampaignDetails(activeCampaigns);
            if (activeCampaigns.length > 0) {
              const freshOffers: PendingOffer[] = activeCampaigns.map((c: Campaign) => ({
                campaign_id: c.id,
                merchant_name: qrData.merchant.business_name,
                title: c.title,
                qr_code: qrCode,
                end_at: c.end_at || null,
              }));
              setOffers(freshOffers);
              localStorage.setItem('pending_offers', JSON.stringify(freshOffers));
            } else {
              localStorage.removeItem('pending_offers');
              setOffers([]);
              setModalState({
                iconType: "clock",
                title: "This Offer Has Expired",
                message: `This limited-time perk from ${qrData?.merchant?.business_name || 'this merchant'} has expired. Keep an eye on your Daily Digest for fresh exclusive offers!`,
              });
            }
          }
        })
        .catch(() => { /* Use basic info from localStorage if API fails */ })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleActivate = async (campaignId: string) => {
    try {
      setActivating(campaignId);
      setError('');
      const idempotencyKey = uuidv4();
      const res = await fetchApi(`/campaigns/${campaignId}/activate`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey }
      });

      // Find the campaign info for the cache
      const offer = offers.find(o => o.campaign_id === campaignId);
      const detail = campaignDetails.find(c => c.id === campaignId);

      localStorage.setItem('active_token_cache', JSON.stringify({
        redemption: res.data.activation,
        campaign: detail || { id: campaignId, title: offer?.title || '' },
        merchant: merchantInfo || { business_name: offer?.merchant_name || '' },
        location: locationInfo,
      }));

      // Remove this activated offer from pending offers so it doesn't linger
      const existing = JSON.parse(localStorage.getItem('pending_offers') || '[]');
      const updated = existing.filter((o: PendingOffer) => o.campaign_id !== campaignId);
      if (updated.length > 0) {
        localStorage.setItem('pending_offers', JSON.stringify(updated));
      } else {
        localStorage.removeItem('pending_offers');
      }

      // Redirect to redemption screen
      router.push('/redeem');
    } catch (err: any) {
      const errMsg = err.message || 'Failed to activate offer';
      const isExpired = /expired|no longer available/i.test(errMsg);
      const isAlreadyRedeemed = errMsg === 'You have already redeemed this offer.' || /already redeemed/i.test(errMsg);

      if (isAlreadyRedeemed || isExpired) {
        // Remove redeemed/expired campaign from active list
        const updatedOffers = offers.filter(o => o.campaign_id !== campaignId);
        const updatedDetails = campaignDetails.filter(c => c.id !== campaignId);
        setOffers(updatedOffers);
        setCampaignDetails(updatedDetails);
        try {
          const existing = JSON.parse(localStorage.getItem('pending_offers') || '[]');
          const remaining = existing.filter((o: PendingOffer) => o.campaign_id !== campaignId);
          if (remaining.length > 0) {
            localStorage.setItem('pending_offers', JSON.stringify(remaining));
          } else {
            localStorage.removeItem('pending_offers');
          }
        } catch { /* ignore */ }

        if (updatedOffers.length > 0) {
          // Other campaigns still available — stay on page, show remaining offer, display clear notice
          setCurrentIdx(i => Math.min(i, updatedOffers.length - 1));
          setError(
            isExpired
              ? 'That offer has expired. Showing your remaining available perk below.'
              : 'You have already claimed that perk. Showing your remaining available perk below.'
          );
        } else {
          // No campaigns left — show the appropriate modal
          if (isExpired) {
            setModalState({
              iconType: "clock",
              title: "This Offer Has Expired",
              message: `This limited-time perk from ${merchantName} has expired. Keep an eye on your Daily Digest for fresh exclusive offers from this store!`,
            });
          } else {
            setModalState({
              iconType: "check",
              title: "You've Already Claimed This Perk!",
              message: `This perk is already saved in your History — you're all set! Keep an eye on your Daily Digest for fresh exclusive offers from ${merchantName}. More great perks from this store are on the way!`,
            });
          }
        }
      } else {
        setError(errMsg);
      }
      setActivating(null);
    }
  };

  // Use campaign details from API if available, fallback to localStorage data
  const displayCampaigns = campaignDetails.length > 0
    ? campaignDetails
    : offers.map(o => ({ id: o.campaign_id, title: o.title, terms: '', discount_percentage: 0, status: 'created', end_at: undefined }));
  const totalCampaigns = displayCampaigns.length;
  const campaign = displayCampaigns[currentIdx];
  const merchantName = merchantInfo?.business_name || offers[0]?.merchant_name || 'Merchant';
  const locationLine = [locationInfo?.address, locationInfo?.city].filter(Boolean).join(', ');

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  if (offers.length === 0 && !modalState) return null;

  return (
    <>
      {/* Status Modal (Already Redeemed or Expired) */}
      {modalState && (
        <div className="status-modal-root" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: isLight ? 'rgba(15,23,42,0.6)' : 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
          <div className="status-modal-card" style={{ background: isLight ? '#FFFFFF' : 'linear-gradient(135deg, #1a1040 0%, #0F172A 100%)', border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(167,139,250,0.25)', borderRadius: '28px', padding: '2.5rem 2rem', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: isLight ? '0 20px 50px rgba(15,23,42,0.15)' : '0 32px 80px rgba(0,0,0,0.65)' }}>
            <div className="status-modal-left">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                {modalState.iconType === 'clock' ? (
                  <IconClock size={56} color="#F87171" />
                ) : (
                  <IconCheckCircle size={56} color="#22C55E" />
                )}
              </div>
              <h2 style={{ color: isLight ? '#0F172A' : '#fff', fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.85rem', lineHeight: 1.25 }}>{modalState.title}</h2>
            </div>
            <div className="status-modal-right">
              <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.62)', fontSize: '0.88rem', lineHeight: 1.65, margin: '0 0 1.85rem' }}>{modalState.message}</p>
              <button
                onClick={() => router.push('/')}
                style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #6D28D9 0%, #15803D 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(109,40,217,0.25)', letterSpacing: '0.01em' }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="activate-root-container" style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', flexDirection: 'column', padding: 'calc(var(--safe-top, 44px) + 2rem) 1.5rem calc(10rem + env(safe-area-inset-bottom, 0px)) 1.5rem', color: 'var(--text-main)', fontFamily: 'Outfit, sans-serif' }}>
        <div className="activate-grid">
          {/* Left Column in Landscape (Top in Portrait): Merchant Header, Offer Count, Disclaimer */}
          <div className="activate-left-col">
            {/* Merchant Header */}
            <div className="activate-merchant-header" style={{ textAlign: 'center', marginBottom: '1.25rem', paddingTop: '1rem' }}>
              {merchantInfo?.logo_url ? (
                <img
                  src={merchantInfo.logo_url}
                  alt=""
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    objectFit: 'contain',
                    border: isLight ? '2px solid rgba(15,23,42,0.15)' : '2px solid rgba(255,255,255,0.2)',
                    boxShadow: isLight ? '0 8px 24px rgba(15,23,42,0.08)' : '0 8px 24px rgba(0,0,0,0.4)',
                    marginBottom: '0.75rem'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.initials-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'inline-flex';
                  }}
                />
              ) : null}
              <div
                className="initials-fallback"
                style={{
                  display: merchantInfo?.logo_url ? 'none' : 'inline-flex',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: isLight ? '#F3E8FF' : 'rgba(139,92,246,0.2)',
                  border: isLight ? '2px solid #D8B4FE' : '2px solid rgba(139,92,246,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                  fontSize: '22px',
                  fontWeight: 900,
                  color: isLight ? '#6D28D9' : '#A78BFA',
                  letterSpacing: '-0.02em',
                  userSelect: 'none'
                }}
              >
                {getMerchantInitials(merchantName)}
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.25rem', color: isLight ? '#0F172A' : '#E2E8F0' }}>
                {merchantName}
              </h2>
              {locationLine && (
                <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.45)', margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>{locationLine}</p>
              )}
            </div>

            {/* Offer Counter */}
            {totalCampaigns > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: isLight ? '#B45309' : '#FDE68A', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconGift size={15} color={isLight ? '#B45309' : '#FDE68A'} /> {totalCampaigns} Offers Available
                </span>
                <span style={{ fontSize: '0.78rem', color: isLight ? '#64748B' : 'rgba(255,255,255,0.5)', fontWeight: 600 }}>({currentIdx + 1} of {totalCampaigns})</span>
              </div>
            )}

            <p className="activate-disclaimer" style={{ textAlign: 'center', fontSize: '0.72rem', color: isLight ? '#64748B' : 'rgba(255,255,255,0.3)', margin: '0.5rem 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <IconClock size={13} color="currentColor" /> Valid for <strong>3 minutes</strong> once activated
            </p>
          </div>

          {/* Right Column in Landscape (Bottom in Portrait): Offer Card, Button, Pagination */}
          <div className="activate-right-col">
            {/* Error Message */}
            {error && (
              <div style={{ background: isLight ? '#FEE2E2' : 'rgba(248,113,113,0.15)', border: isLight ? '1px solid #FCA5A5' : '1px solid rgba(248,113,113,0.35)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: isLight ? '#991B1B' : '#FCA5A5', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Offer Card */}
            <div style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '1.75rem', textAlign: 'center', boxShadow: isLight ? '0 10px 30px rgba(15,23,42,0.08)' : '0 20px 40px rgba(0,0,0,0.5)', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div style={{ background: isLight ? 'linear-gradient(135deg, #F3E8FF 0%, #DCFCE7 100%)' : 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(16,185,129,0.2) 100%)', padding: '1.25rem', borderRadius: '16px', border: isLight ? '1px solid #D8B4FE' : '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem' }}>
                  <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, color: isLight ? '#0F172A' : '#FFFFFF', background: isLight ? 'none' : 'linear-gradient(to right, #fff, #A78BFA)', WebkitBackgroundClip: isLight ? 'none' : 'text', WebkitTextFillColor: isLight ? 'initial' : 'transparent' }}>
                    {campaign?.title || 'Offer'}
                  </h1>
                  {campaign?.terms && (
                    <p style={{ margin: 0, color: isLight ? '#334155' : 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.45, fontWeight: 500 }}>{campaign.terms}</p>
                  )}
                </div>
              </div>

              {/* Expiration Line */}
              {(() => {
                const expiration = formatExpirationLine((campaign as Campaign)?.end_at);
                const expColor = isLight ? (expiration.color.includes('F87171') ? '#DC2626' : expiration.color.includes('FDE68A') ? '#B45309' : '#475569') : expiration.color;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.85rem', fontSize: '0.78rem', color: expColor, fontWeight: 700 }}>
                    {expiration.iconType === 'sparkles' && <IconSparkles size={14} color={expColor} />}
                    {expiration.iconType === 'flame' && <IconFlame size={14} color={expColor} />}
                    {expiration.iconType === 'warning' && <IconAlertTriangle size={14} color={expColor} />}
                    {expiration.iconType === 'calendar' && <IconCalendar size={14} color={expColor} />}
                    <span>{expiration.text}</span>
                  </div>
                );
              })()}

              <button
                onClick={() => campaign && handleActivate(campaign.id)}
                disabled={!!activating}
                style={{ width: '100%', padding: '1rem', background: isLight ? '#6D28D9' : 'linear-gradient(135deg, #8B5CF6 0%, #6BC17A 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: activating ? 'not-allowed' : 'pointer', boxShadow: isLight ? '0 8px 20px rgba(109,40,217,0.25)' : '0 10px 20px rgba(139,92,246,0.3)', opacity: activating ? 0.7 : 1, transition: 'opacity 0.2s' }}
              >
                {activating === campaign?.id ? 'Activating...' : 'Activate This Offer'}
              </button>
            </div>

            {/* Pagination */}
            {totalCampaigns > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} style={{ padding: '0.6rem 1.25rem', background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)', border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: currentIdx === 0 ? (isLight ? '#94A3B8' : 'rgba(255,255,255,0.3)') : (isLight ? '#0F172A' : '#fff'), cursor: currentIdx === 0 ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>← Prev</button>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {displayCampaigns.map((_, i) => (
                    <div key={i} onClick={() => setCurrentIdx(i)} style={{ width: i === currentIdx ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === currentIdx ? (isLight ? '#6D28D9' : '#A78BFA') : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.25)'), cursor: 'pointer', transition: 'all 0.25s' }} />
                  ))}
                </div>
                <button onClick={() => setCurrentIdx(i => Math.min(totalCampaigns - 1, i + 1))} disabled={currentIdx === totalCampaigns - 1} style={{ padding: '0.6rem 1.25rem', background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)', border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: currentIdx === totalCampaigns - 1 ? (isLight ? '#94A3B8' : 'rgba(255,255,255,0.3)') : (isLight ? '#0F172A' : '#fff'), cursor: currentIdx === totalCampaigns - 1 ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>Next →</button>
              </div>
            )}

            {/* Done / Cancel */}
            <button
              onClick={() => router.push('/')}
              style={{ width: '100%', padding: '0.875rem', color: isLight ? '#64748B' : 'rgba(255,255,255,0.35)', background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
            >
              Done / Cancel
            </button>
          </div>
        </div>

        <style jsx>{`
          .activate-root-container {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .activate-grid {
            width: 100%;
            max-width: 420px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
          }

          .activate-left-col {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .activate-right-col {
            width: 100%;
          }

          @media (orientation: landscape), (horizontal-viewport-segments: 2), (min-width: 600px) and (orientation: landscape) {
            .activate-root-container {
              padding: 1.25rem max(1.5rem, env(safe-area-inset-left)) calc(8rem + env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-right)) !important;
              justify-content: center !important;
            }
            .activate-grid {
              display: grid !important;
              grid-template-columns: 1fr 1.15fr !important;
              gap: 2rem !important;
              max-width: 780px !important;
              align-items: center !important;
            }
            .activate-merchant-header {
              padding-top: 0 !important;
            }
            .status-modal-card {
              display: grid !important;
              grid-template-columns: 1fr 1.25fr !important;
              gap: 2.25rem !important;
              max-width: 720px !important;
              text-align: left !important;
              align-items: center !important;
              padding: 2.25rem 2.5rem !important;
            }
            .status-modal-left {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
            .status-modal-right p {
              margin-bottom: 1.25rem !important;
            }
          }
        `}</style>
      </div>
    </>
  );
}
