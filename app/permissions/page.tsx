"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { getUserData, setUserData } from "@/lib/user";

type PermState = 'loading' | 'prompt' | 'granted' | 'denied';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://perkfinity-backend.vercel.app/api/v1';

async function openAppSettings() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor's native bridge to open iOS Settings for this app
      const win = window as any;
      if (win.Capacitor?.Plugins?.App) {
        // @capacitor/app has underlying native support for opening URLs
        await win.Capacitor.Plugins.App.openUrl({ url: 'app-settings:' });
      } else {
        // Fallback: use webkit message handler (works in Capacitor WKWebView)
        window.location.href = 'app-settings:';
      }
    }
  } catch {
    alert('Please open Settings > Perkfinity on your iPhone to change this permission.');
  }
}

export default function PermissionsPage() {
  const [geoState, setGeoState] = useState<PermState>('loading');
  const [pushState, setPushState] = useState<PermState>('loading');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Reusable function to check current iOS permission states
  const checkPermissions = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const locStatus = await Geolocation.checkPermissions();
        if (locStatus.location === 'granted' || locStatus.coarseLocation === 'granted') {
          setGeoState('granted');
        } else if (locStatus.location === 'denied' || locStatus.coarseLocation === 'denied') {
          setGeoState('denied');
        } else {
          setGeoState('prompt');
        }

        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const pushStatus = await FirebaseMessaging.checkPermissions();
        if (pushStatus.receive === 'granted') {
          setPushState('granted');
        } else if (pushStatus.receive === 'denied') {
          setPushState('denied');
        } else {
          setPushState('prompt');
        }
      } else {
        setGeoState('prompt');
        setPushState('prompt');
      }
    } catch (err) {
      console.error('[Permissions] checkPermissions failed:', err);
      setGeoState('prompt');
      setPushState('prompt');
    }
  };

  // Check on page load
  useEffect(() => {
    checkPermissions();
  }, []);

  // Re-check when user returns from iOS Settings (app comes back to foreground)
  useEffect(() => {
    let removeListener: (() => void) | undefined;

    async function setupListener() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { App } = await import('@capacitor/app');
          const handle = await App.addListener('appStateChange', (state) => {
            if (state.isActive) {
              checkPermissions();
            }
          });
          removeListener = () => handle.remove();
        }
      } catch (err) {
        console.error('[Permissions] Failed to set up foreground listener:', err);
      }
    }

    setupListener();
    return () => { if (removeListener) removeListener(); };
  }, []);

  const handleAllowLocation = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const result = await Geolocation.requestPermissions();
        const granted = result.location === 'granted' || result.coarseLocation === 'granted';
        setGeoState(granted ? 'granted' : 'denied');
      }
    } catch (err) {
      console.error('[Permissions] Location request failed:', err);
      setGeoState('denied');
    }
  };

  const handleAllowNotifications = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const { receive } = await FirebaseMessaging.requestPermissions();
        if (receive === 'granted') {
          // Get FCM token and save to backend immediately
          const { token: fcmToken } = await FirebaseMessaging.getToken();
          if (fcmToken) {
            const authToken = localStorage.getItem('pf_user_token');
            if (authToken) {
              await fetch(`${API_BASE}/consumers/push-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ token: fcmToken }),
              });
            }
          }
          setPushState('granted');
        } else {
          setPushState('denied');
        }
      } else {
        // Web fallback
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          setPushState(perm === 'granted' ? 'granted' : 'denied');
        }
      }
    } catch (err) {
      console.error('[Permissions] Notification request failed:', err);
      setPushState('denied');
    }
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      const geoEnabled = geoState === 'granted';
      const pushEnabled = pushState === 'granted';

      await fetchApi('/consumers/profile', {
        method: 'PUT',
        body: JSON.stringify({
          location_sharing_enabled: geoEnabled,
          push_notifications_enabled: pushEnabled,
        }),
      });

      const current = getUserData() || {};
      setUserData({ ...current, location_sharing_enabled: geoEnabled, push_notifications_enabled: pushEnabled });

      const pendingQr = localStorage.getItem('pending_qr');
      if (pendingQr) {
        router.push(`/qr/_/?code=${encodeURIComponent(pendingQr)}`);
      } else {
        router.push('/scan');
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const renderLocationButton = () => {
    if (geoState === 'loading') return <button style={{ ...purpleBtn, opacity: 0.5 }} disabled>Checking...</button>;
    if (geoState === 'granted') return <button style={greenBtn} onClick={() => alert('To change this permission, go to Settings > Perkfinity on your iPhone.')}>✓ Location Services Enabled</button>;
    if (geoState === 'denied') return <button style={purpleBtn} onClick={openAppSettings}>Open Settings to change the permission</button>;
    return <button style={purpleBtn} onClick={handleAllowLocation}>Allow Location Services</button>;
  };

  const renderNotifButton = () => {
    if (pushState === 'loading') return <button style={{ ...purpleBtn, opacity: 0.5 }} disabled>Checking...</button>;
    if (pushState === 'granted') return <button style={greenBtn} onClick={() => alert('To change this permission, go to Settings > Perkfinity on your iPhone.')}>✓ Notifications Enabled</button>;
    if (pushState === 'denied') return <button style={purpleBtn} onClick={openAppSettings}>Open Settings to change the permission</button>;
    return <button style={purpleBtn} onClick={handleAllowNotifications}>Allow Notifications</button>;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F172A',
      color: '#fff',
      padding: '2rem',
      fontFamily: 'Outfit, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ flex: 1, maxWidth: '400px', margin: '0 auto', paddingTop: '4rem', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Never Miss a Perk</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '3rem' }}>
          Enable permissions to get the most out of Perkfinity in your local neighborhood.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Location Card */}
          <div style={cardStyle}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📍</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Location Services</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              We use your location solely to notify you when you walk near a participating store offering a targeted discount.
            </p>
            <div style={separatorStyle} />
            {renderLocationButton()}
          </div>

          {/* Push Notifications Card */}
          <div style={cardStyle}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔔</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Push Notifications</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Get instantly alerted when businesses you love drop exclusive flash sales and new perks.
            </p>
            <div style={separatorStyle} />
            {renderNotifButton()}
          </div>

        </div>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', paddingBottom: '2rem' }}>
          {(() => {
            const bothResponded = (geoState === 'granted' || geoState === 'denied') && (pushState === 'granted' || pushState === 'denied');
            const isDisabled = loading || !bothResponded;
            return (
              <button onClick={handleFinish} disabled={isDisabled} style={{
                width: '100%',
                padding: '1.25rem',
                borderRadius: '16px',
                background: '#8B5CF6',
                color: '#fff',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: isDisabled ? 'default' : 'pointer',
                boxShadow: bothResponded ? '0 8px 24px rgba(139,92,246,0.3)' : 'none',
                opacity: isDisabled ? 0.4 : 1,
              }}>
                {loading ? 'Completing setup...' : 'Finish Setup'}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '1.5rem',
  borderRadius: '24px',
};

const separatorStyle: React.CSSProperties = {
  height: '1px',
  background: 'rgba(255,255,255,0.1)',
  margin: '0 0 1rem 0',
};

const purpleBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 1.5rem',
  borderRadius: '12px',
  background: '#8B5CF6',
  color: '#fff',
  border: 'none',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
};

const greenBtn: React.CSSProperties = {
  ...purpleBtn,
  background: '#10B981',
  cursor: 'default',
};
