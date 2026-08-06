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
  merchant: { business_name: string; logo_url?: string };
  campaigns: Campaign[];
  all_redeemed?: boolean;
}

export default function QRResolveClient({ params }: { params: { public_code: string } }) {
  const [error, setError] = useState('');
  const [redeemedModal, setRedeemedModal] = useState<{ merchantName: string } | null>(null);
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

        // Member has redeemed all their campaigns — show encouraging modal instead of silent redirect
        if (qrData.all_redeemed) {
          setRedeemedModal({ merchantName: qrData.merchant.business_name });
          return;
        }

        if (qrData.campaigns && qrData.campaigns.length > 0) {
          const createdCampaigns = qrData.campaigns.filter(
            (c: Campaign) =>
              (c.status === 'created' || c.status === 'active') &&
              (c.discount_percentage === undefined || c.discount_percentage >= 0) &&
              (!c.end_at || new Date(c.end_at) > new Date())
          );
          if (createdCampaigns.length > 0) {
            const pendingOffers = createdCampaigns.map((c: Campaign) => ({
              campaign_id: c.id,
              merchant_name: qrData.merchant.business_name,
              title: c.title,
              qr_code: qrCode,
              end_at: c.end_at || null,
            }));
            localStorage.setItem('pending_offers', JSON.stringify(pendingOffers));
          } else {
            localStorage.removeItem('pending_offers');
          }
        }
        // Redirect to activate page instead of home page
        router.push('/activate');
      })
      .catch((err: Error) => {
        // Second layer of defense: even if a technical error slips past the backend
        // sanitizer, we never display raw DB schema info (column names, table names,
        // SQL syntax errors) to the user. Pattern-match and replace with a clean message.
        const msg = err.message || '';
        const isTechnical = /column|relation|table|syntax error|null value|does not exist|violates|HTTP 5|unexpected server/i.test(msg);
        setError(isTechnical ? 'Something went wrong loading this offer. Please try again.' : msg);
      });
  }, [params.public_code, router, searchParams]);

  // ── Already Redeemed Modal ──
  if (redeemedModal) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0F172A 100%)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '28px', padding: '2.5rem 2rem', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>✅</div>
        <h2 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.85rem', lineHeight: 1.25 }}>
          You've Already Claimed This Perk! 🎉
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.88rem', lineHeight: 1.65, margin: '0 0 1.85rem' }}>
          This perk is already saved in your History — you're all set! Keep an eye on your{' '}
          <strong style={{ color: '#A78BFA' }}>Daily Digest</strong> for fresh exclusive offers from{' '}
          <strong style={{ color: '#fff' }}>{redeemedModal.merchantName}</strong>. More great perks are on the way!
        </p>
        <button
          onClick={() => router.push('/')}
          style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #8B5CF6 0%, #6BC17A 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(139,92,246,0.3)', letterSpacing: '0.01em' }}
        >
          Go to Home
        </button>
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading your offers...</p>
      </div>
    </div>
  );
}
