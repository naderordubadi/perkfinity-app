"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

// Inner component that uses useSearchParams — must be wrapped in <Suspense> by the parent
function RedeemContent() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const router = useRouter();
  const searchParams = useSearchParams();
  const perkId = searchParams.get("perk") || "tailor-20";

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
        <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>SHOW THIS TO CASHIER</h2>
        
        {/* Large Timer */}
        <div style={{ 
          fontSize: '4rem', 
          fontWeight: 800, 
          margin: '1rem 0',
          color: timeLeft < 60 ? '#EF4444' : '#fff',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {formatTime(timeLeft)}
        </div>

        {/* Promo Perk Visibility */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem 1rem',
          background: 'rgba(107,193,122,0.15)',
          border: '1px solid rgba(107,193,122,0.3)',
          borderRadius: '16px',
        }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#86EFAC', textTransform: 'uppercase', letterSpacing: '1px' }}>Welcome Reward</h3>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1 }}>15% off purchase over $15</p>
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
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <QRCodeSVG 
            value={`perkfinity://redeem?perk=${perkId}&token=temp_tkn_123`}
            size={192}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"H"}
            imageSettings={{
              src: "/app-icon.png",
              x: undefined,
              y: undefined,
              height: 48,
              width: 48,
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
          display: 'inline-block'
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '4px' }}>
            WHALE-TAIL-FAST
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
