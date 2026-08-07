"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../components/ThemeProvider";

export default function PIIPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    zip: ""
  });
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user_token', 'simulated_token_123');
    router.push("/onboarding/permissions");
  };

  const dynamicLabelStyle = {
    ...labelStyle,
    color: isLight ? '#475569' : 'rgba(255,255,255,0.6)',
    fontWeight: 600
  };

  const dynamicInputStyle = {
    ...inputStyle,
    background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
    border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.1)',
    color: isLight ? '#0F172A' : '#fff'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      color: 'var(--text-main)',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: isLight ? '#0F172A' : '#fff' }}>Personalize Your Profile</h1>
        <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontWeight: 500 }}>This helps us find the best perks near you.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={inputGroup}>
            <label style={dynamicLabelStyle}>Full Name</label>
            <input name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="John Doe" style={dynamicInputStyle} />
          </div>
          <div style={inputGroup}>
            <label style={dynamicLabelStyle}>Email Address</label>
            <input name="email" value={formData.email} onChange={handleChange} required type="email" placeholder="john@example.com" style={dynamicInputStyle} />
          </div>
          <div style={inputGroup}>
            <label style={dynamicLabelStyle}>Phone Number</label>
            <input name="phone" value={formData.phone} onChange={handleChange} required type="tel" placeholder="+1 (555) 000-0000" style={dynamicInputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ ...inputGroup, flex: 2 }}>
              <label style={dynamicLabelStyle}>City</label>
              <input name="city" value={formData.city} onChange={handleChange} required placeholder="New York" style={dynamicInputStyle} />
            </div>
            <div style={{ ...inputGroup, flex: 1 }}>
              <label style={dynamicLabelStyle}>Zip Code</label>
              <input name="zip" value={formData.zip} onChange={handleChange} required placeholder="10001" style={dynamicInputStyle} />
            </div>
          </div>

          <button type="submit" style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            borderRadius: '16px',
            background: isLight ? '#6D28D9' : '#8B5CF6',
            color: '#fff',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: isLight ? '0 8px 24px rgba(109,40,217,0.25)' : '0 8px 24px rgba(139,92,246,0.3)'
          }}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

const inputGroup = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
};

const labelStyle = {
  fontSize: '0.875rem',
  marginLeft: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '1rem',
  borderRadius: '16px',
  fontSize: '1rem',
  outline: 'none'
};
