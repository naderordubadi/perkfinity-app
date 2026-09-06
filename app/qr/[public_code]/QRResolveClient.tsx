"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useTheme } from '@/app/components/ThemeProvider';

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
  const [expiredModal, setExpiredModal] = useState<{ merchantName: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

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

        const rawCampaigns = qrData.campaigns || [];
        const createdCampaigns = rawCampaigns.filter(
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
          // Redirect to activate page
          router.push('/activate');
        } else {
          localStorage.removeItem('pending_offers');
          setExpiredModal({ merchantName: qrData.merchant?.business_name || 'this merchant' });
        }
      })
      .catch((err: Error) => {
        const msg = err.message || '';
        const isTechnical = /column|relation|table|syntax error|null value|does not exist|violates|HTTP 5|unexpected server/i.test(msg);
        setError(isTechnical ? 'Something went wrong loading this offer. Please try again.' : msg);
      });
  }, [params.public_code, router, searchParams]);

  // ── Already Redeemed Modal ──
  if (redeemedModal) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ background: isLight ? '#FFFFFF' : 'linear-gradient(135deg, #1a1040 0%, #0F172A 100%)', border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(167,139,250,0.25)', borderRadius: '28px', padding: '2.5rem 2rem', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: isLight ? '0 20px 50px rgba(15,23,42,0.15)' : '0 32px 80px rgba(0,0,0,0.65)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>✅</div>
        <h2 style={{ color: isLight ? '#0F172A' : '#fff', fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.85rem', lineHeight: 1.25 }}>
          You've Already Claimed This Perk! 🎉
        </h2>
        <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.62)', fontSize: '0.88rem', lineHeight: 1.65, margin: '0 0 1.85rem' }}>
          This perk is already saved in your History — you're all set! Keep an eye on your{' '}
          <strong style={{ color: isLight ? '#6D28D9' : '#A78BFA' }}>Daily Digest</strong> for fresh exclusive offers from{' '}
          <strong style={{ color: isLight ? '#0F172A' : '#fff' }}>{redeemedModal.merchantName}</strong>. More great perks are on the way!
        </p>
        <button
          onClick={() => router.push('/')}
          style={{ width: '100%', padding: '1rem', background: isLight ? '#6D28D9' : 'linear-gradient(135deg, #8B5CF6 0%, #6BC17A 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: isLight ? '0 8px 20px rgba(109,40,217,0.25)' : '0 8px 20px rgba(139,92,246,0.3)', letterSpacing: '0.01em' }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );

  // ── Expired / No Active Offers Modal ──
  if (expiredModal) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ background: isLight ? '#FFFFFF' : 'linear-gradient(135deg, #1a1040 0%, #0F172A 100%)', border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(167,139,250,0.25)', borderRadius: '28px', padding: '2.5rem 2rem', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: isLight ? '0 20px 50px rgba(15,23,42,0.15)' : '0 32px 80px rgba(0,0,0,0.65)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>⏰</div>
        <h2 style={{ color: isLight ? '#0F172A' : '#fff', fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.85rem', lineHeight: 1.25 }}>
          This Offer Has Expired
        </h2>
        <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.62)', fontSize: '0.88rem', lineHeight: 1.65, margin: '0 0 1.85rem' }}>
          This limited-time perk from <strong style={{ color: isLight ? '#0F172A' : '#fff' }}>{expiredModal.merchantName}</strong> has expired. Keep an eye on your <strong style={{ color: isLight ? '#6D28D9' : '#A78BFA' }}>Daily Digest</strong> for fresh exclusive offers!
        </p>
        <button
          onClick={() => router.push('/')}
          style={{ width: '100%', padding: '1rem', background: isLight ? '#6D28D9' : 'linear-gradient(135deg, #8B5CF6 0%, #6BC17A 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: isLight ? '0 8px 20px rgba(109,40,217,0.25)' : '0 8px 20px rgba(139,92,246,0.3)', letterSpacing: '0.01em' }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontFamily: 'Outfit, sans-serif', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: isLight ? '#DC2626' : '#F87171', fontWeight: 800 }}>Offer Unavailable</h2>
        <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Loading your offers...</p>
      </div>
    </div>
  );
}
