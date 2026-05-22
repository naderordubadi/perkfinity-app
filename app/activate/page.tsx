'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

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

function formatExpiryLine(end_at?: string): { text: string; color: string; icon: string } {
  if (!end_at) {
    return { text: "No expiry date — but don't wait too long!", color: 'rgba(167,139,250,0.9)', icon: '✨' };
  }
  const expires = new Date(end_at);
  const now = new Date();
  const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Far future (> 365 days) — treat like no expiry
  if (diffDays > 365) {
    return { text: "No expiry date — but don't wait too long!", color: 'rgba(167,139,250,0.9)', icon: '✨' };
  }

  const formatted = expires.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (diffDays <= 3) {
    return { text: `Expires ${formatted} — act fast!`, color: '#F87171', icon: '🔥' };
  }
  if (diffDays <= 7) {
    return { text: `Expires ${formatted} — offer ending soon`, color: '#FDE68A', icon: '⚠️' };
  }
  return { text: `Expires ${formatted}`, color: 'rgba(255,255,255,0.5)', icon: '📅' };
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
  const [redeemedModal, setRedeemedModal] = useState<{ title: string; message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => setIsAndroid(Capacitor.getPlatform() === 'android')).catch(() => { });
    // Read pending offers from localStorage
    const raw = localStorage.getItem('pending_offers');
    if (!raw) {
      router.push('/');
      return;
    }

    let parsed: PendingOffer[] = [];
    try { parsed = JSON.parse(raw); } catch { router.push('/'); return; }

    if (parsed.length === 0) {
      router.push('/');
      return;
    }

    setOffers(parsed);

    // Fetch full campaign details for richer display
    const qrCode = parsed[0]?.qr_code || localStorage.getItem('pending_qr') || '';
    if (qrCode) {
      fetchApi(`/qr/resolve/${qrCode}`)
        .then(res => {
          const qrData = res.data;
          if (qrData?.merchant) setMerchantInfo(qrData.merchant);
          if (qrData?.location) setLocationInfo(qrData.location);
          if (qrData?.campaigns) {
            // Only keep campaigns that match our pending offers
            const pendingIds = new Set(parsed.map(o => o.campaign_id));
            const matched = qrData.campaigns.filter((c: Campaign) => pendingIds.has(c.id));
            if (matched.length > 0) setCampaignDetails(matched);
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

      // Remove activated offer from pending list
      try {
        const existing = JSON.parse(localStorage.getItem('pending_offers') || '[]');
        const updated = existing.filter((o: PendingOffer) => o.campaign_id !== campaignId);
        localStorage.setItem('pending_offers', JSON.stringify(updated));
      } catch { /* ignore */ }

      router.push('/redeem');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to activate offer';
      if (msg === 'You have already redeemed this offer.') {
        // Remove redeemed campaign from active list
        const updatedOffers = offers.filter(o => o.campaign_id !== campaignId);
        const updatedDetails = campaignDetails.filter(c => c.id !== campaignId);
        setOffers(updatedOffers);
        setCampaignDetails(updatedDetails);
        try {
          const existing = JSON.parse(localStorage.getItem('pending_offers') || '[]');
          localStorage.setItem('pending_offers', JSON.stringify(
            existing.filter((o: PendingOffer) => o.campaign_id !== campaignId)
          ));
        } catch { /* ignore */ }
        if (updatedOffers.length > 0) {
          // Other campaigns still available — go home so they appear there
          router.push('/');
        } else {
          // No campaigns left — show the encouraging modal
          setRedeemedModal({
            title: "You've Already Claimed This Perk! 🎉",
            message: `This perk is already saved in your History — you're all set! Keep an eye on your Daily Digest for fresh exclusive offers from ${merchantName}. More great perks from this store are on the way!`,
          });
        }
      } else {
        setError(msg);
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

  if (offers.length === 0) return null;

  return (
    <>
      {/* Already Redeemed Modal */}
      {redeemedModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0F172A 100%)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '28px', padding: '2.5rem 2rem', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>✅</div>
            <h2 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.85rem', lineHeight: 1.25 }}>{redeemedModal.title}</h2>
            <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.88rem', lineHeight: 1.65, margin: '0 0 1.85rem' }}>{redeemedModal.message}</p>
            <button
              onClick={() => router.push('/')}
              style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #8B5CF6 0%, #6BC17A 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(139,92,246,0.3)', letterSpacing: '0.01em' }}
            >
              Go to Home
            </button>
          </div>
        </div>
      )}
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', flexDirection: 'column', padding: '2rem', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
        <img src={isAndroid ? "/app-icon.png" : "/assets/logo.png"} alt="Perkfinity" style={{ height: isAndroid ? '64px' : '32px', objectFit: 'contain', borderRadius: isAndroid ? '12px' : '0' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Merchant Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            {merchantInfo?.logo_url && (
              <img src={merchantInfo.logo_url} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'contain', border: '2px solid rgba(255,255,255,0.2)', marginBottom: '0.75rem' }} />
            )}
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#E2E8F0' }}>
              {merchantName}
            </h2>
            {locationLine && (
              <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '0.8rem' }}>{locationLine}</p>
            )}
          </div>

          {/* Offer Counter */}
          {totalCampaigns > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#FDE68A', fontWeight: 700 }}>🎁 {totalCampaigns} Offers Available</span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{currentIdx + 1} of {totalCampaigns}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          {/* Offer Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(16,185,129,0.2) 100%)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' }}>
                <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, background: 'linear-gradient(to right, #fff, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {campaign?.title || 'Offer'}
                </h1>
                {campaign?.terms && (
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.5 }}>{campaign.terms}</p>
                )}
              </div>

            </div>

            {/* Expiry Line */}
            {(() => {
              const expiry = formatExpiryLine((campaign as Campaign)?.end_at);
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.85rem', fontSize: '0.78rem', color: expiry.color, fontWeight: 600 }}>
                  <span>{expiry.icon}</span>
                  <span>{expiry.text}</span>
                </div>
              );
            })()}

            <button
              onClick={() => campaign && handleActivate(campaign.id)}
              disabled={!!activating}
              style={{ width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg, #8B5CF6 0%, #6BC17A 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: activating ? 'not-allowed' : 'pointer', boxShadow: '0 10px 20px rgba(139,92,246,0.3)', opacity: activating ? 0.7 : 1, transition: 'opacity 0.2s' }}
            >
              {activating === campaign?.id ? 'Activating...' : 'Activate This Offer'}
            </button>
          </div>

          {/* Pagination */}
          {totalCampaigns > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: currentIdx === 0 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: currentIdx === 0 ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>← Prev</button>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {displayCampaigns.map((_, i) => (
                  <div key={i} onClick={() => setCurrentIdx(i)} style={{ width: i === currentIdx ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === currentIdx ? '#A78BFA' : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.25s' }} />
                ))}
              </div>
              <button onClick={() => setCurrentIdx(i => Math.min(totalCampaigns - 1, i + 1))} disabled={currentIdx === totalCampaigns - 1} style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: currentIdx === totalCampaigns - 1 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: currentIdx === totalCampaigns - 1 ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>Next →</button>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', margin: '0.5rem 0 0' }}>
            ⏳ Valid for <strong>3 minutes</strong> once activated
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
