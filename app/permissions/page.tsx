"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { getUserData, setUserData } from "@/lib/user";

export default function PermissionsPage() {
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const data = getUserData();
    if (data) {
      if (typeof data.location_sharing_enabled === "boolean") setGeoEnabled(data.location_sharing_enabled);
      if (typeof data.push_notifications_enabled === "boolean") setPushEnabled(data.push_notifications_enabled);
    }
  }, []);

  const handleFinish = async () => {
    try {
      setLoading(true);

      let finalGeoEnabled = geoEnabled;
      let finalPushEnabled = pushEnabled;

      // Trigger Native iOS Location prompt via Capacitor plugin (not web API)
      if (geoEnabled) {
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.isNativePlatform()) {
            const { Geolocation } = await import('@capacitor/geolocation');
            const result = await Geolocation.requestPermissions();
            if (result.location !== 'granted' && result.coarseLocation !== 'granted') {
              finalGeoEnabled = false;
            }
          } else if (typeof window !== 'undefined' && navigator.geolocation) {
            await new Promise<void>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                () => resolve(),
                (err) => { if (err.code === err.PERMISSION_DENIED) finalGeoEnabled = false; resolve(); },
                { timeout: 10000 }
              );
            });
          }
        } catch (err) {
          console.error('[Permissions] Location request failed', err);
          finalGeoEnabled = false;
        }
      }

      // Trigger Push Notifications native FCM prompt
      if (pushEnabled) {
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.isNativePlatform()) {
            const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
            const { receive } = await FirebaseMessaging.requestPermissions();
            if (receive === 'granted') {
              const { token: fcmToken } = await FirebaseMessaging.getToken();
              if (fcmToken) {
                const authToken = localStorage.getItem('pf_user_token');
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://perkfinity-backend.vercel.app/api/v1';
                if (authToken) {
                  await fetch(`${API_BASE}/consumers/push-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ token: fcmToken }),
                  });
                }
              }
            } else {
              // OS Denied or Previously Denied
              finalPushEnabled = false;
              alert("Push notifications are currently blocked by iOS. Please go to your iPhone's Settings > Perkfinity to enable them.");
            }
          } else {
            if ("Notification" in window) {
              const perm = await Notification.requestPermission();
              if (perm !== "granted") finalPushEnabled = false;
            }
          }
        } catch (err) {
          console.error('[Permissions] Push registration failed', err);
          finalPushEnabled = false;
        }
      }

      await fetchApi('/consumers/profile', {
        method: 'PUT',
        body: JSON.stringify({
          location_sharing_enabled: finalGeoEnabled,
          push_notifications_enabled: finalPushEnabled
        })
      });
      
      const current = getUserData() || {};
      setUserData({
        ...current,
        location_sharing_enabled: finalGeoEnabled,
        push_notifications_enabled: finalPushEnabled
      });
      
      const pendingQr = localStorage.getItem('pending_qr');
      if (pendingQr) {
        router.push(`/qr/_/?code=${encodeURIComponent(pendingQr)}`);
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
