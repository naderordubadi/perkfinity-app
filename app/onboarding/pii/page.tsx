"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PIIPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    zip: ""
  });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, save to Neon database here
    router.push("/onboarding/permissions");
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F172A',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      color: '#fff',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Personalize Your Profile</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>This helps us find the best perks near you.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={inputGroup}>
            <label style={labelStyle}>Full Name</label>
            <input name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="John Doe" style={inputStyle} />
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Email Address</label>
            <input name="email" value={formData.email} onChange={handleChange} required type="email" placeholder="john@example.com" style={inputStyle} />
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Phone Number</label>
            <input name="phone" value={formData.phone} onChange={handleChange} required type="tel" placeholder="+1 (555) 000-0000" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ ...inputGroup, flex: 2 }}>
              <label style={labelStyle}>City</label>
              <input name="city" value={formData.city} onChange={handleChange} required placeholder="New York" style={inputStyle} />
            </div>
            <div style={{ ...inputGroup, flex: 1 }}>
              <label style={labelStyle}>Zip Code</label>
              <input name="zip" value={formData.zip} onChange={handleChange} required placeholder="10001" style={inputStyle} />
            </div>
          </div>

          <button type="submit" style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            borderRadius: '16px',
            background: '#8B5CF6',
            color: '#fff',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer'
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
  color: 'rgba(255,255,255,0.6)',
  marginLeft: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '1rem',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: '1rem',
  outline: 'none'
};
