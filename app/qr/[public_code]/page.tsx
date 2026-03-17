'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

interface Campaign {
  id: string;
  title: string;
  discount_percentage?: number;
  terms?: string;
  status: string;
  start_at?: string;
  end_at?: string;
  redemption_id?: string;
  token?: string;
}

interface QRData {
  merchant: { id: string; business_name: string; logo_url?: string };
  location?: { address?: string; city?: string; state?: string; postal_code?: string };
  campaigns: Campaign[];
}

export default function QRResolve({ params }: { params: { public_code: string } }) {
  const [data, setData] = useState<QRData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null); // campaign id being activated
  const [currentIdx, setCurrentIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Store QR code immediately for the routing/onboarding state machine
    localStorage.setItem('pending_qr', params.public_code);

    const isInstalled = localStorage.getItem('app_installed') === 'true';
    const isLoggedIn = !!localStorage.getItem('pf_user_token');
    let hasAccount = localStorage.getItem('pf_has_account') === 'true';
    if (isLoggedIn && !hasAccount) {
      localStorage.setItem('pf_has_account', 'true');
      hasAccount = true;
    }

    if (!isInstalled) { router.push('/download'); return; }
    if (isInstalled && !hasAccount && !isLoggedIn) { router.push('/auth'); return; }
    if (isInstalled && hasAccount && !isLoggedIn) { router.push('/auth?method=login'); return; }

    // Logged in — fetch member-specific campaigns (backend reads JWT from Authorization header automatically via fetchApi)
    fetchApi(`/qr/resolve/${params.public_code}`)
      .then(res => {
        const qrData = res.data as QRData;
        setData(qrData);
        // Store pending offers in localStorage so home page can show the count
        if (qrData.campaigns && qrData.campaigns.length > 0) {
          const pendingOffers = qrData.campaigns.map((c: Campaign) => ({
            campaign_id: c.id,
            merchant_name: qrData.merchant.business_name,
            title: c.title,
            qr_code: params.public_code,
          }));
          localStorage.setItem('pending_offers', JSON.stringify(pendingOffers));
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.public_code, router]);

  const handleActivate = async (campaign: Campaign) => {
    try {
      setActivating(campaign.id);
      const idempotencyKey = uuidv4();
      const res = await fetchApi(`/campaigns/${campaign.id}/activate`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey }
      });

      // Cache for the redeem page
      localStorage.setItem('active_token_cache', JSON.stringify({
        redemption: res.data.activation,
        campaign,
        merchant: data?.merchant,
        location: data?.location,
      }));

      // Remove this campaign from pending_offers since it's now being activated
      try {
        const existing = JSON.parse(localStorage.getItem('pending_offers') || '[]');
        const updated = existing.filter((o: { campaign_id: string }) => o.campaign_id !== campaign.id);
        localStorage.setItem('pending_offers', JSON.stringify(updated));
      } catch { /* ignore */ }

      router.push('/redeem');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setActivating(null);
    }
  };

  const totalCampaigns = data?.campaigns?.length ?? 0;
  const campaign = data?.campaigns?.[currentIdx];

  if (loading && !data) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading your offers...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Outfit, sans-serif', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#F87171' }}>Offer Unavailable</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
      </div>
    </div>
  );

  if (!data || totalCampaigns === 0) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Outfit, sans-serif', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎁</div>
        <h2 style={{ marginBottom: '0.5rem' }}>{data?.merchant?.business_name || 'This Merchant'}</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>No active offers available for you at the moment.<br/>Check back after your next visit!</p>
      </div>
    </div>
  );

  const locationLine = [data.location?.address, data.location?.city].filter(Boolean).join(', ');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      color: '#fff',
      fontFamily: 'Outfit, sans-serif'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
        <img src="/assets/logo.png" alt="Perkfinity" style={{ height: '32px', objectFit: 'contain' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Merchant info */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            {data.merchant.logo_url && (
              <img src={data.merchant.logo_url} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'contain', border: '2px solid rgba(255,255,255,0.2)', marginBottom: '0.75rem' }} />
            )}
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#E2E8F0' }}>
              {data.merchant.business_name}
            </h2>
            {locationLine && (
              <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '0.8rem' }}>{locationLine}</p>
            )}
          </div>

          {/* Offer count indicator */}
          {totalCampaigns > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#FDE68A', fontWeight: 700 }}>🎁 {totalCampaigns} Offers Available</span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{currentIdx + 1} of {totalCampaigns}</span>
            </div>
          )}

          {/* Campaign card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            minHeight: '220px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(16,185,129,0.2) 100%)',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '1.25rem'
              }}>
                <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, background: 'linear-gradient(to right, #fff, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {campaign?.title}
                </h1>
                {campaign?.terms && (
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {campaign.terms}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem' }}>
                <span style={{ fontSize: '1rem' }}>📱</span>
                <span>Scan the Perkfinity QR in store <strong style={{ color: 'rgba(255,255,255,0.8)' }}>before you order</strong></span>
              </div>
            </div>

            <button
              onClick={() => campaign && handleActivate(campaign)}
              disabled={activating === campaign?.id}
              style={{
                width: '100%',
                padding: '1.1rem',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6BC17A 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: activating ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 20px rgba(139,92,246,0.3)',
                opacity: activating ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {activating === campaign?.id ? 'Activating...' : 'Activate This Offer'}
            </button>
          </div>

          {/* Navigation arrows for multiple campaigns */}
          {totalCampaigns > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <button
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: currentIdx === 0 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: currentIdx === 0 ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
              >← Prev</button>
              {/* Dot indicators */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {data.campaigns.map((_, i) => (
                  <div key={i} onClick={() => setCurrentIdx(i)} style={{ width: i === currentIdx ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === currentIdx ? '#A78BFA' : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.25s' }} />
                ))}
              </div>
              <button
                onClick={() => setCurrentIdx(i => Math.min(totalCampaigns - 1, i + 1))}
                disabled={currentIdx === totalCampaigns - 1}
                style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: currentIdx === totalCampaigns - 1 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: currentIdx === totalCampaigns - 1 ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>Next →</button>
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
