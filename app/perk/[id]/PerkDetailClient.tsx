"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/components/ThemeProvider";

interface PerkData {
  merchant: string;
  title: string;
  description: string;
  limitations: string;
  color: string;
}

export default function PerkDetailClient({ params }: { params: { id: string } }) {
  const [perk, setPerk] = useState<PerkData | null>(null);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    // Mocking a fetch from Neon database
    const mockPerks: Record<string, PerkData> = {
      "tailor-20": {
        merchant: "Artisan Tailor Shop",
        title: "20% OFF Your Next Alteration",
        description: "Valid for all premium tailoring and repair services.",
        limitations: "Spending over $50. One-time use per customer.",
        color: "#6D28D9"
      }
    };
    setPerk(mockPerks[params.id] || mockPerks["tailor-20"]);
  }, [params.id]);

  if (!perk) return null;

  const perkColor = isLight && perk.color === '#8B5CF6' ? '#6D28D9' : perk.color;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      color: 'var(--text-main)',
      fontFamily: 'Outfit, sans-serif',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1, marginTop: '12vh' }}>
        <div style={{
          padding: '1.5rem',
          background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
          borderRadius: '32px',
          border: isLight ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          textAlign: 'center',
          boxShadow: isLight ? '0 10px 30px rgba(15,23,42,0.08)' : 'none'
        }}>
          <h3 style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.5)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            {perk.merchant}
          </h3>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '1rem 0', color: perkColor }}>
            {perk.title}
          </h1>
          <p style={{ color: isLight ? '#334155' : 'rgba(255,255,255,0.7)', lineHeight: '1.6', fontWeight: 500 }}>
            {perk.description}
          </p>
          
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            borderRadius: '16px',
            background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.2)',
            border: isLight ? '1px solid #E2E8F0' : 'none',
            fontSize: '0.875rem',
            color: isLight ? '#475569' : 'rgba(255,255,255,0.4)',
            textAlign: 'left',
            fontWeight: 500
          }}>
            <strong style={{ color: isLight ? '#0F172A' : '#fff' }}>Limitations:</strong> {perk.limitations}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          onClick={() => router.push(`/redeem?perk=${params.id}`)}
          style={{
            width: '100%',
            padding: '1.25rem',
            background: perkColor,
            color: '#fff',
            borderRadius: '20px',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 10px 20px ${perkColor}40`
          }}
        >
          Redeem Now
        </button>
        <button 
          onClick={() => router.push("/")}
          style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : 'rgba(255,255,255,0.4)', fontWeight: 600, cursor: 'pointer' }}
        >
          Not Now
        </button>
      </div>
    </div>
  );
}
