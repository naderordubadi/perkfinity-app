"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

// Inner component that uses useSearchParams — must be wrapped in <Suspense> by the parent
function RedeemContent() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes max
  const [cache, setCache] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const dataString = localStorage.getItem('active_token_cache');
    if (!dataString) {
      router.push('/');
      return;
    }
    try {
      const data = JSON.parse(dataString);
      setCache(data);
      // Synchronize timer with server
      const expiresAt = new Date(data.redemption.expires_at).getTime();
      const now = new Date().getTime();
      const diffSecs = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diffSecs);
    } catch {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!cache) return null;

  return (
    <div style={{
      height: '100vh',
      background: '#0F172A',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      color: '#fff',
      fontFamily: 'Outfit, sans-serif',
      textAlign: 'center'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: 'rgba(255,255,255,0.8)', fontSize: '1.25rem' }}>{cache.merchant.business_name}</h2>
        <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>SHOW THIS TO CASHIER</h2>
        
        {/* Large Timer */}
        <div style={{ 
          fontSize: '4rem', 
          fontWeight: 800, 
          margin: '0.5rem 0 1rem',
          color: timeLeft < 60 ? '#EF4444' : '#fff',
          fontVariantNumeric: 'tabular-nums',
          textShadow: timeLeft <= 0 ? 'none' : '0 0 20px rgba(139,92,246,0.5)'
        }}>
          {timeLeft <= 0 ? "EXPIRED" : formatTime(timeLeft)}
        </div>

        {/* Promo Perk Visibility */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem 1rem',
          background: timeLeft <= 0 ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.15)',
          border: `1px solid ${timeLeft <= 0 ? 'rgba(255,255,255,0.1)' : 'rgba(139,92,246,0.3)'}`,
          borderRadius: '16px',
          opacity: timeLeft <= 0 ? 0.5 : 1
        }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, color: timeLeft <= 0 ? '#aaa' : '#A78BFA', lineHeight: 1.2 }}>
            {cache.campaign.title}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
            {cache.campaign.terms}
          </p>
        </div>

        {/* Dynamic QR Code Canvas */}
        <div style={{
          width: '240px',
          height: '240px',
          background: '#fff',
          margin: '0 auto',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          opacity: timeLeft <= 0 ? 0.2 : 1,
          filter: timeLeft <= 0 ? 'grayscale(100%) blur(4px)' : 'none',
          transition: 'all 0.5s ease'
        }}>
          <QRCodeSVG 
            value={`perkfinity://redeem?campaign=${cache.campaign.id}&token=${cache.redemption.token}`}
            size={192}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"H"}
            imageSettings={{
              src: "/app-icon.png",
              x: undefined, y: undefined,
              height: 48, width: 48,
              excavate: true,
            }}
          />
        </div>

        {/* Letter Word Code */}
        <div style={{
          marginTop: '2.5rem',
          padding: '1rem 2rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          border: '1px dotted rgba(255,255,255,0.2)',
          display: 'inline-block',
          opacity: timeLeft <= 0 ? 0.3 : 1
        }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '8px' }}>
            {cache.redemption.token.match(/.{1,3}/g).join('-')}
          </span>
        </div>
      </div>

      <button 
        onClick={() => router.push("/")}
        style={{
          width: '100%',
          padding: '1rem',
          color: 'rgba(255,255,255,0.4)',
          background: 'none',
          border: 'none',
          marginBottom: '2rem'
        }}
      >
        Done / Cancel
      </button>
    </div>
  );
}

// Required: useSearchParams() in RedeemContent needs a Suspense boundary (Next.js 14 requirement)
export default function RedeemPage() {
  return (
    <Suspense fallback={
      <div style={{
        height: '100vh',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Outfit, sans-serif'
      }}>
        Loading...
      </div>
    }>
      <RedeemContent />
    </Suspense>
  );
}
