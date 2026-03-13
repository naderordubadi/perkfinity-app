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
        borderRadius: '32px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: '360px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          margin: '0 auto 1.5rem auto',
          boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)'
        }}>
          ✨
        </div>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>Ready to Claim?</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
          Join the privacy-first rewards network and start saving at your favorite stores.
        </p>

        <a href="/onboarding" style={{
          display: 'block',
          width: '100%',
          padding: '1.25rem',
          background: '#fff',
          color: '#000',
          borderRadius: '16px',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '1rem',
          transition: 'all 0.2s ease',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          Get Started
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
