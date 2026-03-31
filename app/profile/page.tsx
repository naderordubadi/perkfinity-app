"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { getUserData, setUserData } from "@/lib/user";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const data = getUserData();
    if (data) {
      if (data.full_name) setFullName(data.full_name);
      if (data.phone_number) setPhone(data.phone_number);
      if (data.city) setCity(data.city);
      if (data.zip_code) setZipCode(data.zip_code);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 10) val = val.slice(0, 10);
    
    // Auto-format xxx-xxx-xxxx
    let formatted = val;
    if (val.length > 6) {
      formatted = `${val.slice(0,3)}-${val.slice(3,6)}-${val.slice(6)}`;
    } else if (val.length > 3) {
      formatted = `${val.slice(0,3)}-${val.slice(3)}`;
    }
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !city || !zipCode) {
      return setError("All fields are required");
    }
    
    if (zipCode.length !== 5 || !/^\d+$/.test(zipCode)) {
      return setError("Please enter a valid 5-digit ZIP code");
    }
    
    if (phone.length !== 12) {
      return setError("Please enter a valid 10-digit phone number");
    }

    try {
      setLoading(true);
      setError("");
      
      await fetchApi('/consumers/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          phone_number: phone,
          city: city,
          zip_code: zipCode
        })
      });
      
      const current = getUserData() || {};
      setUserData({
        ...current,
        full_name: fullName,
        phone_number: phone,
        city: city,
        zip_code: zipCode
      });
      
      router.push("/permissions");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F172A',
      color: '#fff',
      padding: '2rem',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{ maxWidth: '400px', margin: '0 auto', paddingTop: '4rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Complete Profile</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
          Tell us a bit about yourself so we can find local perks near you based on your zip code.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && <div style={{ color: '#FCA5A5', fontSize: '0.875rem', background: 'rgba(252, 165, 165, 0.1)', padding: '12px', borderRadius: '8px' }}>{error}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Full Name</label>
            <input type="text" placeholder="Jane Doe" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Phone Number</label>
            <input type="tel" placeholder="123-456-7890" value={phone} onChange={handlePhoneChange} style={inputStyle} required />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 2 }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>City</label>
              <input type="text" placeholder="Austin" value={city} onChange={e => setCity(e.target.value)} style={inputStyle} required />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>ZIP Code</label>
              <input type="text" placeholder="78701" maxLength={5} value={zipCode} onChange={e => setZipCode(e.target.value.replace(/\D/g, ''))} style={inputStyle} required />
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: '1rem',
            width: '100%',
            padding: '1.25rem',
            borderRadius: '16px',
            background: '#8B5CF6',
            color: '#fff',
            border: 'none',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(139,92,246,0.3)',
            opacity: loading ? 0.7 : 1
          }}>
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>

        {/* Delete Account link — only shown if user has a token (is logged in) */}
        {typeof window !== 'undefined' && localStorage.getItem('pf_user_token') && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                router.push('/delete-account');
              }}
              style={{
                color: '#EF4444',
                fontSize: '0.85rem',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Delete Account
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '1rem',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box' as const
};
