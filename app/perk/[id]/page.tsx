"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PerkDetailPage({ params }: { params: { id: string } }) {
  const [perk, setPerk] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Mocking a fetch from Neon database
    const mockPerks: any = {
      "tailor-20": {
        merchant: "Artisan Tailor Shop",
        title: "20% OFF Your Next Alteration",
        description: "Valid for all premium tailoring and repair services.",
        limitations: "Spending over $50. One-time use per customer.",
        color: "#8B5CF6"
      }
    };
    setPerk(mockPerks[params.id] || mockPerks["tailor-20"]);
  }, [params.id]);

  if (!perk) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F172A',
      color: '#fff',
      fontFamily: 'Outfit, sans-serif',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1, marginTop: '20vh' }}>
        <div style={{
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '32px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {perk.merchant}
          </h3>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '1rem 0', color: perk.color }}>
            {perk.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
            {perk.description}
          </p>
          
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            borderRadius: '16px',
            background: 'rgba(0,0,0,0.2)',
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'left'
          }}>
            <strong>Limitations:</strong> {perk.limitations}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          onClick={() => router.push(`/redeem?perk=${params.id}`)}
          style={{
            width: '100%',
            padding: '1.25rem',
            background: perk.color,
            color: '#fff',
            borderRadius: '20px',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 10px 20px ${perk.color}33`
          }}
        >
          Redeem Now
        </button>
        <button 
          onClick={() => router.push("/")}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)' }}
        >
          Not Now
        </button>
      </div>
    </div>
  );
}
