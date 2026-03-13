"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{ 
      padding: '2.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Hero Section */}
      <header style={{ marginTop: '2rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 700, 
          margin: 0,
          background: 'linear-gradient(to right, #fff, #94A3B8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.025em'
        }}>
          Perkfinity
        </h1>
        <p style={{ 
          color: '#94A3B8', 
          fontSize: '1.125rem',
          marginTop: '0.5rem',
          fontWeight: 300,
          maxWidth: '280px'
        }}>
          Exclusive perks from local boutiques and wellness spas.
        </p>
      </header>

      {/* Main Action Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)',
        borderRadius: '32px',
        padding: '2rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
        marginTop: '1rem'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <rect x="7" y="7" width="3" height="3"/>
            <rect x="14" y="7" width="3" height="3"/>
            <rect x="7" y="14" width="3" height="3"/>
            <path d="M14 14h3v3h-3z"/>
          </svg>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Ready to Save?</h2>
          <p style={{ color: '#94A3B8', margin: 0, fontSize: '0.875rem' }}>Scan a merchant QR code at the checkout to reveal your instant reward.</p>
        </div>

        <a href="/scan" style={{
          width: '100%',
          padding: '1rem',
          background: '#fff',
          color: '#0F172A',
          textAlign: 'center',
          textDecoration: 'none',
          borderRadius: '16px',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
          transition: 'transform 0.2s active'
        }}>
          Launch Scanner
        </a>
      </div>

      {/* Quick Discovery */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Recent Merchants</h3>
          <span style={{ fontSize: '0.875rem', color: '#8B5CF6' }}>Sponsorships</span>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {[
            { name: 'Artisan Tailor', color: '#6366F1' },
            { name: 'Plant Boutique', color: '#10B981' },
            { name: 'Wellness Spa', color: '#EC4899' }
          ].map((m, i) => (
            <div key={i} style={{
              minWidth: '140px',
              padding: '1rem',
              background: 'var(--card-bg)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: m.color, opacity: 0.8 }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{m.name}</div>
            </div>
          ))}
        </div>
      </section>

      <style jsx global>{`
        body {
          background-color: #0F172A;
        }
      `}</style>
    </div>
  );
}
