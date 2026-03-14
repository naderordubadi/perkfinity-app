'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

export default function QRResolve({ params }: { params: { public_code: string } }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // STATE MACHINE INITIALIZATION
  useEffect(() => {
    // 1. Immediately store the QR code they are trying to access
    localStorage.setItem('pending_qr', params.public_code);

    const isInstalled = localStorage.getItem('app_installed') === 'true';
    const hasAccount = localStorage.getItem('pf_has_account') === 'true'; // Set during signup
    const isLoggedIn = !!localStorage.getItem('pf_user_token');

    // Rule 1: Not installed -> Send to App Store Mock
    if (!isInstalled) {
      router.push('/download');
      return;
    }

    // Rule 2 & 3: Installed but no account -> Banners -> Signup
    if (isInstalled && !hasAccount) {
      router.push('/');
      return;
    }

    // Rule 4: Installed, Has Account, Not Logged In -> Login page
    if (isInstalled && hasAccount && !isLoggedIn) {
      router.push('/auth?method=login');
      return;
    }

    // Rule 5: Installed, Has Account, AND Logged in -> Stay here and fetch QR data
    // Proceed to load the data so they can click "Activate Offer"
    fetchApi(`/qr/resolve/${params.public_code}`)
      .then(res => setData(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

  }, [params.public_code, router]);

  const handleActivate = async () => {
    try {
      setLoading(true);
      const idempotencyKey = uuidv4();
      const res = await fetchApi(`/campaigns/${(data as any).campaign.id}/activate`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
      
      localStorage.setItem('active_token_cache', JSON.stringify({
        redemption: res.data.activation,
        campaign: (data as any).campaign,
        merchant: (data as any).merchant
      }));
      router.push('/redeem');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  if (loading && !data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ color: 'red' }}>Offer Unavailable</h2>
      <p>{error}</p>
    </div>
  );

  if (!data) return null;

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
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <img src="/assets/logo.png" alt="Perkfinity" style={{ height: '32px', objectFit: 'contain' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#E2E8F0' }}>
            {data.merchant.business_name}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 2rem 0', fontSize: '0.875rem' }}>
            {data.location?.address}, {data.location?.city}
          </p>

          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(16,185,129,0.2) 100%)',
            padding: '2rem',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 style={{ margin: '0 0 0.5rem', fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1, background: 'linear-gradient(to right, #fff, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {data.campaign.title}
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {data.campaign.terms}
              </p>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem',
            marginBottom: '2rem',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.875rem'
           }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span>
            <span>Valid for <strong>5 minutes</strong> once activated</span>
          </div>

          <button 
            onClick={handleActivate}
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '1.25rem', 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6BC17A 100%)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '16px', 
              fontSize: '1.1rem', 
              fontWeight: 700, 
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 20px rgba(139,92,246,0.3)',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Generating Offer...' : 'Activate Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}
