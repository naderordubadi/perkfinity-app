"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const merchants = [
  { name: 'Artisan Tailor', emoji: '✂️', color: '#6366F1', discount: '15% off' },
  { name: 'Plant Boutique', emoji: '🌿', color: '#10B981', discount: '10% off' },
  { name: 'Wellness Spa', emoji: '🧖', color: '#8B5CF6', discount: '20% off' },
  { name: 'Flower Shop', emoji: '💐', color: '#EC4899', discount: '12% off' },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Outfit, sans-serif',
      color: '#fff',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      paddingBottom: '100px'
    }}>

      {/* Header with full logo */}
      <div style={{
        padding: '1.5rem 1.5rem 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Image src="/logo.png" alt="Perkfinity" width={140} height={38} style={{ objectFit: 'contain' }} priority />
        <Link href="/auth" style={{
          padding: '0.5rem 1rem',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          color: 'rgba(255,255,255,0.7)',
          textDecoration: 'none',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>Sign In</Link>
      </div>

      {/* Hero Card */}
      <div style={{ padding: '1.75rem 1.5rem 1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(107,193,122,0.1) 0%, rgba(139,92,246,0.15) 100%)',
          border: '1px solid rgba(107,193,122,0.2)',
          borderRadius: '28px',
          padding: '2rem 1.75rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          {/* Background glow blobs */}
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '120px', height: '120px',
            background: 'radial-gradient(circle, rgba(107,193,122,0.25), transparent 70%)',
            borderRadius: '50%'
          }}/>
          <div style={{
            position: 'absolute', bottom: '-20px', left: '-20px',
            width: '100px', height: '100px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)',
            borderRadius: '50%'
          }}/>

          {/* Floating discount badges */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['15% off ✂️', '20% off 🧖', '10% off 🌿'].map((badge, i) => (
              <span key={i} style={{
                padding: '4px 10px',
                background: 'rgba(107,193,122,0.15)',
                border: '1px solid rgba(107,193,122,0.3)',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#86EFAC',
                letterSpacing: '0.02em'
              }}>{badge}</span>
            ))}
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Ready to Save<br/>at Local Shops?
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', margin: '0 0 1.75rem', lineHeight: 1.5, maxWidth: '260px' }}>
            Scan, claim, and instantly get discounts at your favorite local businesses — no cards needed.
          </p>

          <Link href="/onboarding" style={{
            display: 'block',
            padding: '1rem 1.5rem',
            background: 'linear-gradient(135deg, #6BC17A, #3B9A52)',
            borderRadius: '16px',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(107,193,122,0.35)',
            letterSpacing: '0.01em'
          }}>Get Started →</Link>
        </div>
      </div>

      {/* How it works strip */}
      <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[
            { icon: '📱', label: 'Scan QR', desc: 'At any store' },
            { icon: '✅', label: 'Claim', desc: 'Instant discount' },
            { icon: '🎉', label: 'Save', desc: 'Every visit' }
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1,
              padding: '1rem 0.75rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '18px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Participating merchants */}
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Participating Merchants</h3>
          <span style={{ fontSize: '0.78rem', color: '#6BC17A', fontWeight: 600 }}>Coming soon</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {merchants.map((m, i) => (
            <div key={i} style={{
              minWidth: '130px',
              padding: '1rem',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '20px',
              border: `1px solid ${m.color}30`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              flexShrink: 0
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '12px',
                background: `${m.color}22`,
                border: `1px solid ${m.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem'
              }}>{m.emoji}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{m.name}</div>
              <div style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: '#86EFAC',
                background: 'rgba(107,193,122,0.12)',
                border: '1px solid rgba(107,193,122,0.25)',
                borderRadius: '8px',
                padding: '2px 6px',
                display: 'inline-block'
              }}>{m.discount}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        body { background-color: #0F172A; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
