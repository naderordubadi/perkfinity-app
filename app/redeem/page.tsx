"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RedeemPage() {
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

        {/* QR Code Placeholder */}
        <div style={{
          width: '240px',
          height: '240px',
          background: '#fff',
          margin: '0 auto',
          borderRadius: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          {/* In a real app, use a QR generation lib */}
          <div style={{ 
            width: '100%', 
            height: '100%', 
            background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 20px 20px',
            opacity: 0.1
          }} />
          <div style={{ position: 'absolute', fontSize: '1.5rem', color: '#000', fontWeight: 800 }}>
            PERK-20
          </div>
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
