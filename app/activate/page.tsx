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
}

interface MerchantInfo {
  business_name: string;
  logo_url?: string;
}

interface LocationInfo {
  address?: string;
  city?: string;
}

export default function ActivatePage() {
  const [offers, setOffers] = useState<PendingOffer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
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

      localStorage.setItem('pending_cancel', JSON.stringify({
        campaign_id: campaignId,
        merchant_name: merchantInfo?.business_name || offer?.merchant_name || '',
        title: detail?.title || offer?.title || '',
        qr_code: offer?.qr_code || '',
      }));

      // Remove activated offer from pending list
      try {
        const existing = JSON.parse(localStorage.getItem('pending_offers') || '[]');
        const updated = existing.filter((o: PendingOffer) => o.campaign_id !== campaignId);
        localStorage.setItem('pending_offers', JSON.stringify(updated));
      } catch { /* ignore */ }

      router.push('/redeem');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate offer');
      setActivating(null);
    }
  };

  // Use campaign details from API if available, fallback to localStorage data
  const displayCampaigns = campaignDetails.length > 0
    ? campaignDetails
    : offers.map(o => ({ id: o.campaign_id, title: o.title, terms: '', discount_percentage: 0, status: 'created' }));
  const totalCampaigns = displayCampaigns.length;
  const campaign = displayCampaigns[currentIdx];
  const merchantName = merchantInfo?.business_name || offers[0]?.merchant_name || 'Merchant';
  const locationLine = [locationInfo?.address, locationInfo?.city].filter(Boolean).join(', ');

  if (offers.length === 0) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', flexDirection: 'column', padding: '2rem', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
        <img src="/assets/logo.png" alt="Perkfinity" style={{ height: '32px', objectFit: 'contain' }} />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem' }}>
                <span style={{ fontSize: '1rem' }}>📱</span>
                <span>Scan the Perkfinity QR in store <strong style={{ color: 'rgba(255,255,255,0.8)' }}>before you order</strong></span>
              </div>
            </div>

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
            ⏳ Valid for <strong>5 minutes</strong> once activated
          </p>
        </div>
      </div>
    </div>
  );
}
