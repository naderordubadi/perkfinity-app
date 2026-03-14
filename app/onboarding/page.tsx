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
        {/* Glowing background circle */}
        <circle cx="120" cy="110" r="90" fill="url(#privacyGlow)" opacity="0.15"/>
        {/* Outer ring */}
        <circle cx="120" cy="110" r="75" stroke="#6BC17A" strokeWidth="1" strokeDasharray="8 4" opacity="0.4"/>
        {/* Shield body */}
        <path d="M120 45 L160 62 L160 100 C160 128 140 150 120 158 C100 150 80 128 80 100 L80 62 Z" fill="url(#shieldGrad)" stroke="#6BC17A" strokeWidth="1.5"/>
        {/* Shield inner */}
        <path d="M120 57 L148 70 L148 100 C148 120 136 136 120 143 C104 136 92 120 92 100 L92 70 Z" fill="rgba(107,193,122,0.15)"/>
        {/* Checkmark */}
        <path d="M106 102 L116 114 L136 90" stroke="#6BC17A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Floating data pills */}
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
        {/* Lock badges */}
        <circle cx="68" cy="148" r="14" fill="rgba(15,23,42,0.8)" stroke="rgba(107,193,122,0.5)" strokeWidth="1.5"/>
        <path d="M64 148 a4 4 0 0 1 8 0" stroke="#6BC17A" strokeWidth="2" fill="none"/>
        <rect x="62" y="148" width="8" height="6" rx="1.5" fill="#6BC17A" opacity="0.8"/>
        <circle cx="175" cy="140" r="14" fill="rgba(15,23,42,0.8)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5"/>
        <path d="M171 140 a4 4 0 0 1 8 0" stroke="#8B5CF6" strokeWidth="2" fill="none"/>
        <rect x="169" y="140" width="8" height="6" rx="1.5" fill="#8B5CF6" opacity="0.8"/>
        {/* Lines connecting with X marks to show blocking */}
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
    title: "Earn Instantly",
    subtitle: "Scan. Earn. Redeem.",
    description: "No plastic cards or complicated apps. Just scan the QR code at any participating store and your rewards are saved automatically.",
    highlight: "Works at all local stores instantly",
    highlightIcon: "⚡",
    accentColor: "#8B5CF6",
    gradientFrom: "#0F172A",
    gradientTo: "#1A1040",
    illustration: (
      <svg viewBox="0 0 240 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Glow */}
        <circle cx="120" cy="110" r="85" fill="url(#earnGlow)" opacity="0.12"/>
        {/* Phone */}
        <rect x="80" y="40" width="80" height="140" rx="16" fill="#0D1B2E" stroke="#8B5CF6" strokeWidth="1.5"/>
        <rect x="88" y="55" width="64" height="110" rx="8" fill="#111827"/>
        {/* QR on phone screen */}
        <rect x="96" y="65" width="48" height="48" rx="4" fill="white" opacity="0.9"/>
        {/* QR Pattern simplified */}
        <rect x="99" y="68" width="12" height="12" rx="1" fill="#0F172A"/>
        <rect x="99" y="68" width="12" height="12" rx="1" fill="none" stroke="#0F172A" strokeWidth="1"/>
        <rect x="101" y="70" width="8" height="8" rx="0.5" fill="#0F172A"/>
        <rect x="133" y="68" width="12" height="12" rx="1" fill="#0F172A"/>
        <rect x="133" y="68" width="12" height="12" rx="1" fill="none" stroke="#0F172A" strokeWidth="1"/>
        <rect x="135" y="70" width="8" height="8" rx="0.5" fill="#0F172A"/>
        <rect x="99" y="101" width="12" height="12" rx="1" fill="#0F172A"/>
        <rect x="99" y="101" width="12" height="12" rx="1" fill="none" stroke="#0F172A" strokeWidth="1"/>
        <rect x="101" y="103" width="8" height="8" rx="0.5" fill="#0F172A"/>
        {/* Center QR dots */}
        <rect x="113" y="68" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="116" y="71" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="119" y="68" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="113" y="75" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="119" y="75" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="116" y="78" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="113" y="81" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="119" y="81" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="113" y="87" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="119" y="87" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="116" y="84" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="113" y="94" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="119" y="94" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="116" y="91" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="116" y="101" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="113" y="101" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="119" y="101" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="116" y="105" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="119" y="105" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="113" y="108" width="3" height="3" fill="#0F172A" rx="0.5"/>
        <rect x="119" y="108" width="3" height="3" fill="#0F172A" rx="0.5"/>
        {/* Reward notification on phone */}
        <rect x="90" y="122" width="60" height="28" rx="8" fill="rgba(107,193,122,0.15)" stroke="#6BC17A" strokeWidth="1"/>
        <text x="120" y="132" textAnchor="middle" fill="#6BC17A" fontSize="7" fontWeight="600">+50 Points Earned!</text>
        <text x="120" y="142" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="5.5">Artisan Tailor Shop</text>
        {/* Scan burst lines */}
        <line x1="50" y1="89" x2="78" y2="89" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <line x1="162" y1="89" x2="190" y2="89" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <line x1="40" y1="80" x2="78" y2="89" stroke="#8B5CF6" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
        <line x1="40" y1="100" x2="78" y2="89" stroke="#8B5CF6" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
        <line x1="200" y1="80" x2="162" y2="89" stroke="#8B5CF6" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
        <line x1="200" y1="100" x2="162" y2="89" stroke="#8B5CF6" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
        {/* Reward bubbles */}
        <circle cx="40" cy="60" r="18" fill="rgba(107,193,122,0.12)" stroke="rgba(107,193,122,0.4)" strokeWidth="1"/>
        <text x="40" y="57" textAnchor="middle" fontSize="11">🎁</text>
        <text x="40" y="69" textAnchor="middle" fill="#6BC17A" fontSize="6.5" fontWeight="700">FREE</text>
        <circle cx="200" cy="60" r="18" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.4)" strokeWidth="1"/>
        <text x="200" y="57" textAnchor="middle" fontSize="11">⭐</text>
        <text x="200" y="69" textAnchor="middle" fill="#8B5CF6" fontSize="6.5" fontWeight="700">50 pts</text>
        <defs>
          <radialGradient id="earnGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6"/>
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0"/>
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: "multi",
    title: "One App, All Stores",
    subtitle: "Your neighborhood in one place",
    description: "Perkfinity works across every participating local business — coffee shops, boutiques, spas, and more. One app, unlimited perks.",
    highlight: "Growing network of local merchants",
    highlightIcon: "🏪",
    accentColor: "#6BC17A",
    gradientFrom: "#0F172A",
    gradientTo: "#0D2318",
    illustration: (
      <svg viewBox="0 0 240 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Background radial */}
        <circle cx="120" cy="110" r="88" fill="url(#multiGlow)" opacity="0.12"/>
        {/* Map grid lines */}
        <line x1="60" y1="50" x2="60" y2="170" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1="90" y1="50" x2="90" y2="170" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1="120" y1="50" x2="120" y2="170" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1="150" y1="50" x2="150" y2="170" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1="180" y1="50" x2="180" y2="170" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1="40" y1="80" x2="200" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1="40" y1="110" x2="200" y2="110" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1="40" y1="140" x2="200" y2="140" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        {/* Connection lines between stores */}
        <line x1="90" y1="90" x2="120" y2="120" stroke="rgba(107,193,122,0.2)" strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="150" y1="80" x2="120" y2="120" stroke="rgba(107,193,122,0.2)" strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="80" y1="148" x2="120" y2="120" stroke="rgba(139,92,246,0.2)" strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="165" y1="150" x2="120" y2="120" stroke="rgba(139,92,246,0.2)" strokeWidth="1" strokeDasharray="4 3"/>
        {/* Central Perkfinity hub */}
        <circle cx="120" cy="120" r="22" fill="rgba(107,193,122,0.12)" stroke="#6BC17A" strokeWidth="1.5"/>
        <circle cx="120" cy="120" r="14" fill="rgba(107,193,122,0.2)" stroke="#6BC17A" strokeWidth="1"/>
        <text x="120" y="124" textAnchor="middle" fontSize="13">🏷️</text>
        {/* Store pin: Coffee */}
        <ellipse cx="90" cy="95" rx="5" ry="2" fill="rgba(139,92,246,0.4)"/>
        <path d="M90 55 C90 55 76 70 76 82 C76 90 82 95 90 95 C98 95 104 90 104 82 C104 70 90 55 90 55Z" fill="#1E1040" stroke="#8B5CF6" strokeWidth="1.5"/>
        <text x="90" y="82" textAnchor="middle" fontSize="12">☕</text>
        <rect x="78" y="85" width="24" height="12" rx="6" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.5)" strokeWidth="0.75"/>
        <text x="90" y="93" textAnchor="middle" fill="#C4B5FD" fontSize="5.5" fontWeight="600">CAFÉ</text>
        {/* Store pin: Spa */}
        <ellipse cx="150" cy="84" rx="5" ry="2" fill="rgba(107,193,122,0.4)"/>
        <path d="M150 47 C150 47 136 60 136 72 C136 79.5 142 84 150 84 C158 84 164 79.5 164 72 C164 60 150 47 150 47Z" fill="#0D2318" stroke="#6BC17A" strokeWidth="1.5"/>
        <text x="150" y="71" textAnchor="middle" fontSize="12">🌿</text>
        <rect x="138" y="74" width="24" height="12" rx="6" fill="rgba(107,193,122,0.12)" stroke="rgba(107,193,122,0.5)" strokeWidth="0.75"/>
        <text x="150" y="82" textAnchor="middle" fill="#86EFAC" fontSize="5.5" fontWeight="600">SPA</text>
        {/* Store pin: Boutique */}
        <ellipse cx="80" cy="153" rx="5" ry="2" fill="rgba(139,92,246,0.3)"/>
        <path d="M80 116 C80 116 66 128 66 140 C66 148 72 153 80 153 C88 153 94 148 94 140 C94 128 80 116 80 116Z" fill="#1E1040" stroke="#8B5CF6" strokeWidth="1.5"/>
        <text x="80" y="141" textAnchor="middle" fontSize="12">👗</text>
        <rect x="66" y="143" width="28" height="12" rx="6" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.5)" strokeWidth="0.75"/>
        <text x="80" y="151" textAnchor="middle" fill="#C4B5FD" fontSize="5" fontWeight="600">BOUTIQUE</text>
        {/* Store pin: Tailor */}
        <ellipse cx="165" cy="155" rx="5" ry="2" fill="rgba(107,193,122,0.3)"/>
        <path d="M165 118 C165 118 151 130 151 142 C151 149.5 157 155 165 155 C173 155 179 149.5 179 142 C179 130 165 118 165 118Z" fill="#0D2318" stroke="#6BC17A" strokeWidth="1.5"/>
        <text x="165" y="143" textAnchor="middle" fontSize="12">✂️</text>
        <rect x="152" y="145" width="27" height="12" rx="6" fill="rgba(107,193,122,0.12)" stroke="rgba(107,193,122,0.5)" strokeWidth="0.75"/>
        <text x="165" y="153" textAnchor="middle" fill="#86EFAC" fontSize="5" fontWeight="600">TAILOR</text>
        <defs>
          <radialGradient id="multiGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6BC17A"/>
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0"/>
          </radialGradient>
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
        {/* Logo */}
        <Image src="/app-icon.png" alt="Perkfinity" width={36} height={36} style={{ borderRadius: '10px' }} />
        
        {/* Progress pills */}
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

        {/* Skip */}
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

        {/* Highlight box — green tinted card matching website */}
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
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = 'none'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 8px 24px ${step.accentColor}40`; }}
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
