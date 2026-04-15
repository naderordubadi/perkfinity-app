'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';

interface Campaign {
  id: string;
  title: string;
  status: string;
  discount_percentage?: number;
}

interface QRData {
  merchant: { business_name: string };
  campaigns: Campaign[];
}

export default function QRResolveClient({ params }: { params: { public_code: string } }) {
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // ── Browser detection: if opened in Safari (not inside native Capacitor app),
    //    route non-native users directly to the appropriate store — no intermediate page.
    const isNative = typeof window !== 'undefined'
      && (window as any).Capacitor?.isNativePlatform?.();

    // Resolve the actual QR code: prefer query param, then route param (if not placeholder), then localStorage
    const qrCode = searchParams.get('code')
      || (params.public_code !== '_' ? params.public_code : null)
      || localStorage.getItem('pending_qr')
      || '';

    if (!isNative) {
      // Running in Safari/browser — user doesn't have the app yet.
      // Save QR code so it persists after install.
      if (qrCode) localStorage.setItem('pending_qr', qrCode);

      const isAndroid = /android/i.test(navigator.userAgent);
      if (isAndroid) {
        // Android: Play Store not live yet — show coming soon page
        router.push('/download');
      } else {
        // iOS: go straight to App Store — no intermediate Perkfinity page
        window.location.href = 'https://apps.apple.com/us/app/perkfinity-privacy-first-perks/id6759945540';
      }
      return;
    }

    if (!qrCode) {
      setError('No QR code found');
      return;
    }

    localStorage.setItem('pending_qr', qrCode);

    // Auth checks — redirect to login/signup if not authenticated
    const isLoggedIn = !!localStorage.getItem('pf_user_token');
    let hasAccount = localStorage.getItem('pf_has_account') === 'true';
    if (isLoggedIn && !hasAccount) {
      localStorage.setItem('pf_has_account', 'true');
      hasAccount = true;
    }

    if (!hasAccount && !isLoggedIn) { router.push('/auth'); return; }
    if (hasAccount && !isLoggedIn) { router.push('/auth?method=login'); return; }

    fetchApi(`/qr/resolve/${qrCode}`)
      .then(res => {
        const qrData = res.data as QRData;
        if (qrData.campaigns && qrData.campaigns.length > 0) {
          const createdCampaigns = qrData.campaigns.filter(
            (c: Campaign) =>
              (c.status === 'created' || c.status === 'active') &&
              (c.discount_percentage === undefined || c.discount_percentage >= 0)
          );
          if (createdCampaigns.length > 0) {
            const pendingOffers = createdCampaigns.map((c: Campaign) => ({
              campaign_id: c.id,
              merchant_name: qrData.merchant.business_name,
              title: c.title,
              qr_code: qrCode,
            }));
            localStorage.setItem('pending_offers', JSON.stringify(pendingOffers));
          }
        }
        // Redirect to home — it will show the pending offers banner
        router.push('/');
      })
      .catch((err: Error) => setError(err.message));
  }, [params.public_code, router, searchParams]);

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Outfit, sans-serif', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#F87171' }}>Offer Unavailable</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading your offers...</p>
      </div>
    </div>
  );
}
