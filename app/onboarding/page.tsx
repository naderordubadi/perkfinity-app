"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  {
    title: "Privacy-First",
    description: "Your personal data is encrypted and never shared. Merchants only see anonymized, location-based stats.",
    icon: "🛡️",
    color: "#8B5CF6"
  },
  {
    title: "Easy Setup",
    description: "Scan, Claim, and Enjoy. No messy paperwork or plastic cards. Just pure rewards.",
    icon: "⚡",
    color: "#EC4899"
  },
  {
    title: "Multi-Merchant",
    description: "One app for all your favorite local spots. From your tailor to your favorite spa.",
    icon: "🏪",
    color: "#3B82F6"
  }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/auth");
    }
  };

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      fontFamily: 'Outfit, sans-serif',
      padding: '2rem',
      overflow: 'hidden'
    }}>
      {/* Progress Dots */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '1rem' }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: i === currentStep ? '#fff' : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s'
          }} />
        ))}
      </div>

      {/* Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        textAlign: 'center' 
      }}>
        <div style={{
          fontSize: '5rem',
          marginBottom: '2rem',
          animation: 'float 3s infinite ease-in-out'
        }}>
          {steps[currentStep].icon}
        </div>
        
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 700, 
          marginBottom: '1rem',
          background: `linear-gradient(to right, #fff, ${steps[currentStep].color})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {steps[currentStep].title}
        </h1>
        
        <p style={{ 
          fontSize: '1.125rem', 
          lineHeight: '1.6', 
          color: 'rgba(255,255,255,0.7)',
          maxWidth: '300px'
        }}>
          {steps[currentStep].description}
        </p>
      </div>

      {/* Action Button */}
      <div style={{ marginBottom: '3rem' }}>
        <button 
          onClick={nextStep}
          style={{
            width: '100%',
            padding: '1.25rem',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
        </button>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
