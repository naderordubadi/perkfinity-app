"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function PermissionsPage() {
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFinish = async () => {
    try {
      setLoading(true);
      await fetchApi('/consumers/profile', {
        method: 'PUT',
        body: JSON.stringify({
          location_sharing_enabled: geoEnabled,
          push_notifications_enabled: pushEnabled
        })
      });
      
      const pendingQr = localStorage.getItem('pending_qr');
      if (pendingQr) {
        router.push(`/qr/${pendingQr}`);
      } else {
        router.push("/scan");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F172A',
      color: '#fff',
      padding: '2rem',
      fontFamily: 'Outfit, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1, maxWidth: '400px', margin: '0 auto', paddingTop: '4rem', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Never Miss a Perk</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '3rem' }}>
          Enable permissions to get the most out of Perkfinity in your local neighborhood.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={cardStyle}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📍</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Location Services</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              We use your location solely to notify you when you walk near a participating store offering a targeted discount.
            </p>
            <label style={toggleContainer}>
              <span style={{ fontWeight: 600 }}>Enable Location</span>
              <input type="checkbox" checked={geoEnabled} onChange={e => setGeoEnabled(e.target.checked)} style={checkboxStyle} />
            </label>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔔</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Push Notifications</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Get instantly alerted when businesses you love drop flash sales or new loyalty perks.
            </p>
            <label style={toggleContainer}>
              <span style={{ fontWeight: 600 }}>Allow Notifications</span>
              <input type="checkbox" checked={pushEnabled} onChange={e => setPushEnabled(e.target.checked)} style={checkboxStyle} />
            </label>
          </div>

        </div>

        <div style={{ marginTop: 'auto', paddingBottom: '2rem' }}>
          <button onClick={handleFinish} disabled={loading} style={{
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
            {loading ? "Completing setup..." : "Finish Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '1.5rem',
  borderRadius: '24px'
};

const toggleContainer = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  paddingTop: '1rem',
  borderTop: '1px solid rgba(255,255,255,0.1)'
};

const checkboxStyle = {
  width: '24px',
  height: '24px',
  accentColor: '#8B5CF6'
};
