"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const steps = [
  {
    id: "privacy",
    title: "Privacy-First",
    subtitle: "Your data, protected always",
    description: "Your personal information is encrypted and never shared with merchants. They only see anonymized, ZIP-code level stats.",
    highlight: "Your personal info stays 100% private",
    highlightIcon: "🛡️",
    accentColor: "#6BC17A",
    gradientFrom: "#0F172A",
    gradientTo: "#162032",
    illustration: (
      <svg viewBox="0 0 240 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="120" cy="110" r="90" fill="url(#privacyGlow)" opacity="0.15"/>
        <circle cx="120" cy="110" r="75" stroke="#6BC17A" strokeWidth="1" strokeDasharray="8 4" opacity="0.4"/>
        <path d="M120 45 L160 62 L160 100 C160 128 140 150 120 158 C100 150 80 128 80 100 L80 62 Z" fill="url(#shieldGrad)" stroke="#6BC17A" strokeWidth="1.5"/>
        <path d="M120 57 L148 70 L148 100 C148 120 136 136 120 143 C104 136 92 120 92 100 L92 70 Z" fill="rgba(107,193,122,0.15)"/>
        <path d="M106 102 L116 114 L136 90" stroke="#6BC17A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="20" y="65" width="48" height="22" rx="11" fill="rgba(107,193,122,0.15)" stroke="rgba(107,193,122,0.4)" strokeWidth="1"/>
        <circle cx="31" cy="76" r="5" fill="#6BC17A" opacity="0.7"/>
        <rect x="38" y="72" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.3)"/>
        <rect x="38" y="77" width="16" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
        <rect x="172" y="55" width="48" height="22" rx="11" fill="rgba(91,63,165,0.25)" stroke="rgba(139,92,246,0.4)" strokeWidth="1"/>
        <circle cx="183" cy="66" r="5" fill="#8B5CF6" opacity="0.8"/>
        <rect x="190" y="62" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.3)"/>
        <rect x="190" y="67" width="16" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
        <rect x="30" y="140" width="52" height="22" rx="11" fill="rgba(91,63,165,0.2)" stroke="rgba(139,92,246,0.35)" strokeWidth="1"/>
        <circle cx="42" cy="151" r="5" fill="#8B5CF6" opacity="0.6"/>
        <rect x="50" y="147" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.25)"/>
        <rect x="50" y="152" width="18" height="2" rx="1" fill="rgba(255,255,255,0.12)"/>
        <circle cx="68" cy="148" r="14" fill="rgba(15,23,42,0.8)" stroke="rgba(107,193,122,0.5)" strokeWidth="1.5"/>
        <path d="M64 148 a4 4 0 0 1 8 0" stroke="#6BC17A" strokeWidth="2" fill="none"/>
        <rect x="62" y="148" width="8" height="6" rx="1.5" fill="#6BC17A" opacity="0.8"/>
        <circle cx="175" cy="140" r="14" fill="rgba(15,23,42,0.8)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5"/>
        <path d="M171 140 a4 4 0 0 1 8 0" stroke="#8B5CF6" strokeWidth="2" fill="none"/>
        <rect x="169" y="140" width="8" height="6" rx="1.5" fill="#8B5CF6" opacity="0.8"/>
        <line x1="68" y1="134" x2="92" y2="110" stroke="rgba(107,193,122,0.25)" strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="175" y1="126" x2="152" y2="106" stroke="rgba(139,92,246,0.25)" strokeWidth="1" strokeDasharray="4 3"/>
        <defs>
          <radialGradient id="privacyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6BC17A"/>
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="shieldGrad" x1="120" y1="45" x2="120" y2="158" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A5F"/>
            <stop offset="100%" stopColor="#0F2340"/>
          </linearGradient>
        </defs>
      </svg>
    )
  },
  {
    id: "easy",
    title: "Redeem Instantly",
    subtitle: "Scan. Show. Save.",
    description: "No plastic cards or loyalty punch cards. Just scan the QR code at any participating store and instantly receive your discount — applied right at checkout.",
    highlight: "Works on all local participating stores instantly",
    highlightIcon: "⚡",
    accentColor: "#8B5CF6",
    gradientFrom: "#0F172A",
    gradientTo: "#1A1040",
    illustration: (
      <svg viewBox="0 0 240 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="120" cy="110" r="85" fill="url(#redeemGlow)" opacity="0.12"/>
        {/* Phone outer */}
        <rect x="82" y="35" width="76" height="138" rx="16" fill="#0D1B2E" stroke="#8B5CF6" strokeWidth="1.5"/>
        {/* Screen */}
        <rect x="90" y="50" width="60" height="108" rx="8" fill="#0F172A"/>
        {/* Coupon card on screen */}
        <rect x="94" y="58" width="52" height="62" rx="8" fill="url(#couponGrad)" stroke="rgba(107,193,122,0.5)" strokeWidth="1"/>
        {/* Store name */}
        <text x="120" y="72" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="5.5" fontWeight="600">ARTISAN TAILOR</text>
        {/* Big discount text */}
        <text x="120" y="92" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="900">15%</text>
        <text x="120" y="102" textAnchor="middle" fill="#86EFAC" fontSize="7.5" fontWeight="700">OFF</text>
        {/* Condition */}
        <text x="120" y="113" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="5">on purchases over $15</text>
        {/* Dashed divider */}
        <line x1="97" y1="118" x2="143" y2="118" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 2"/>
        {/* Mini QR */}
        <rect x="107" y="122" width="26" height="26" rx="3" fill="white" opacity="0.9"/>
        <rect x="109" y="124" width="7" height="7" rx="0.75" fill="#0F172A"/>
        <rect x="118" y="124" width="7" height="7" rx="0.75" fill="#0F172A"/>
        <rect x="109" y="133" width="7" height="7" rx="0.75" fill="#0F172A"/>
        <rect x="118" y="131" width="3" height="3" rx="0.5" fill="#0F172A"/>
        <rect x="122" y="134" width="3" height="3" rx="0.5" fill="#0F172A"/>
        <rect x="118" y="136" width="3" height="3" rx="0.5" fill="#0F172A"/>
        <rect x="113" y="131" width="3" height="3" rx="0.5" fill="#0F172A"/>
        <rect x="113" y="136" width="3" height="3" rx="0.5" fill="#0F172A"/>
        {/* Scan success checkmark burst */}
        <circle cx="164" cy="78" r="18" fill="rgba(107,193,122,0.15)" stroke="rgba(107,193,122,0.5)" strokeWidth="1.5"/>
        <path d="M155 78 L161 84 L173 70" stroke="#6BC17A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Scan lines from left */}
        <line x1="30" y1="96" x2="80" y2="96" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <line x1="22" y1="86" x2="80" y2="96" stroke="#8B5CF6" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
        <line x1="22" y1="108" x2="80" y2="96" stroke="#8B5CF6" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
        {/* Coupon tag on left */}
        <rect x="22" y="125" width="46" height="20" rx="10" fill="rgba(107,193,122,0.12)" stroke="rgba(107,193,122,0.4)" strokeWidth="1"/>
        <text x="45" y="138" textAnchor="middle" fill="#86EFAC" fontSize="6.5" fontWeight="700">💰 Instant Save</text>
        <defs>
          <radialGradient id="redeemGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6"/>
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="couponGrad" x1="94" y1="58" x2="146" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A5F"/>
            <stop offset="100%" stopColor="#0F2340"/>
          </linearGradient>
        </defs>
      </svg>
    )
  },
  {
    id: "multi",
    title: "One App, Many Stores",
    subtitle: "Your neighborhood in one place",
    description: "Perkfinity connects you to a growing network of local businesses. One scan gets you instant discounts wherever you shop.",
    highlight: "Growing network of local merchants",
    highlightIcon: "🏪",
    accentColor: "#6BC17A",
    gradientFrom: "#0F172A",
    gradientTo: "#0D2318",
    illustration: (
      <svg viewBox="0 0 260 210" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="130" cy="105" r="80" fill="url(#hubGlow)" opacity="0.12"/>
        {/* Dashed spoke lines from center to each store */}
        <line x1="130" y1="105" x2="52" y2="55" stroke="rgba(107,193,122,0.35)" strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1="130" y1="105" x2="210" y2="58" stroke="rgba(107,193,122,0.35)" strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1="130" y1="105" x2="42" y2="155" stroke="rgba(139,92,246,0.35)" strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1="130" y1="105" x2="220" y2="158" stroke="rgba(139,92,246,0.35)" strokeWidth="1.2" strokeDasharray="5 3"/>
        {/* Center hub — app icon */}
        <circle cx="130" cy="105" r="26" fill="rgba(15,23,42,0.9)" stroke="#6BC17A" strokeWidth="2"/>
        <circle cx="130" cy="105" r="18" fill="rgba(107,193,122,0.12)" stroke="rgba(107,193,122,0.4)" strokeWidth="1"/>
        {/* Simplified bag icon */}
        <path d="M124 102 L126 98 Q130 94 134 98 L136 102 Z" fill="#6BC17A" opacity="0.9"/>
        <rect x="122" y="101" width="16" height="11" rx="2.5" fill="url(#bagGrad)"/>
        <path d="M127 104 L129 107 L133 101" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Store: Flower Shop — top left */}
        <circle cx="52" cy="55" r="28" fill="rgba(236,72,153,0.08)" stroke="rgba(236,72,153,0.4)" strokeWidth="1.5"/>
        <text x="52" y="50" textAnchor="middle" fontSize="14">💐</text>
        <text x="52" y="62" textAnchor="middle" fill="#F9A8D4" fontSize="6.5" fontWeight="700">FLOWER</text>
        <text x="52" y="70" textAnchor="middle" fill="#F9A8D4" fontSize="6.5" fontWeight="700">SHOP</text>
        {/* Store: Spa — top right */}
        <circle cx="210" cy="58" r="28" fill="rgba(107,193,122,0.08)" stroke="rgba(107,193,122,0.4)" strokeWidth="1.5"/>
        <text x="210" y="52" textAnchor="middle" fontSize="14">🧖</text>
        <text x="210" y="66" textAnchor="middle" fill="#86EFAC" fontSize="6.5" fontWeight="700">SPA</text>
        {/* Store: Hair Salon — bottom left */}
        <circle cx="42" cy="155" r="28" fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5"/>
        <text x="42" y="149" textAnchor="middle" fontSize="14">💇</text>
        <text x="42" y="161" textAnchor="middle" fill="#C4B5FD" fontSize="6.5" fontWeight="700">HAIR</text>
        <text x="42" y="169" textAnchor="middle" fill="#C4B5FD" fontSize="6.5" fontWeight="700">SALON</text>
        {/* Store: Tailor — bottom right */}
        <circle cx="220" cy="158" r="28" fill="rgba(107,193,122,0.08)" stroke="rgba(107,193,122,0.4)" strokeWidth="1.5"/>
        <text x="220" y="152" textAnchor="middle" fontSize="14">✂️</text>
        <text x="220" y="165" textAnchor="middle" fill="#86EFAC" fontSize="6.5" fontWeight="700">TAILOR</text>
        {/* Midpoint dots on spokes */}
        <circle cx="91" cy="80" r="3" fill="#6BC17A" opacity="0.6"/>
        <circle cx="170" cy="81" r="3" fill="#6BC17A" opacity="0.6"/>
        <circle cx="86" cy="130" r="3" fill="#8B5CF6" opacity="0.6"/>
        <circle cx="175" cy="131" r="3" fill="#8B5CF6" opacity="0.6"/>
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6BC17A"/>
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="bagGrad" x1="122" y1="101" x2="138" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6BC17A"/>
            <stop offset="60%" stopColor="#4B7A53"/>
            <stop offset="100%" stopColor="#5B3FA5"/>
          </linearGradient>
        </defs>
      </svg>
    )
  }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const step = steps[currentStep];

  const nextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/auth");
    }
  };

  return (
    <div style={{
      height: '100vh',
      background: `linear-gradient(160deg, ${step.gradientFrom} 0%, ${step.gradientTo} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      fontFamily: 'Outfit, sans-serif',
      overflow: 'hidden',
      transition: 'background 0.6s ease'
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 1.5rem 0'
      }}>
        <Image src="/app-icon.png" alt="Perkfinity" width={36} height={36} style={{ borderRadius: '10px' }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === currentStep ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i === currentStep ? step.accentColor : 'rgba(255,255,255,0.2)',
              transition: 'all 0.4s ease'
            }} />
          ))}
        </div>
        <button
          onClick={() => router.push("/auth")}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem 2rem',
        maxHeight: '260px',
        animation: 'fadeIn 0.5s ease'
      }}>
        {step.illustration}
      </div>

      {/* Text Content */}
      <div style={{ padding: '0 1.5rem 1rem', animation: 'slideUp 0.4s ease' }}>
        <p style={{
          color: step.accentColor,
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          margin: '0 0 6px'
        }}>
          {step.subtitle}
        </p>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          margin: '0 0 0.75rem',
          lineHeight: 1.1,
          letterSpacing: '-0.02em'
        }}>
          {step.title}
        </h1>
        <p style={{
          fontSize: '0.975rem',
          lineHeight: '1.6',
          color: 'rgba(255,255,255,0.6)',
          margin: '0 0 1rem'
        }}>
          {step.description}
        </p>

        {/* Highlight box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0.875rem 1rem',
          background: step.id === 'easy'
            ? 'rgba(139,92,246,0.15)'
            : 'rgba(107,193,122,0.13)',
          border: `1px solid ${step.id === 'easy' ? 'rgba(139,92,246,0.35)' : 'rgba(107,193,122,0.35)'}`,
          borderRadius: '14px',
          marginBottom: '1.25rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>{step.highlightIcon}</span>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: step.id === 'easy' ? '#C4B5FD' : '#86EFAC'
          }}>
            {step.highlight}
          </span>
        </div>

        {/* CTA Button */}
        <button
          onClick={nextStep}
          style={{
            width: '100%',
            padding: '1.1rem',
            background: `linear-gradient(135deg, ${step.accentColor}, ${step.id === 'easy' ? '#6D28D9' : '#3B9A52'})`,
            border: 'none',
            borderRadius: '18px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.01em',
            boxShadow: `0 8px 24px ${step.accentColor}40`,
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {currentStep === steps.length - 1 ? "Get Started →" : "Continue →"}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
