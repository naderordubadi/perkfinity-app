"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../components/ThemeProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://perkfinity-backend.vercel.app/api/v1';

export default function PermissionsPage() {
  const [locStatus, setLocStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const requestLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => setLocStatus("granted"),
      () => setLocStatus("denied")
    );
  };

  const requestNotifications = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const { receive } = await FirebaseMessaging.requestPermissions();
        if (receive !== 'granted') { setNotifStatus("denied"); return; }
        const { token: fcmToken } = await FirebaseMessaging.getToken();
        if (!fcmToken) { setNotifStatus("denied"); return; }
        const authToken = localStorage.getItem('pf_user_token');
        if (authToken) {
          await fetch(`${API_BASE}/consumers/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ token: fcmToken, platform: Capacitor.getPlatform() }),
          });
        }
        setNotifStatus("granted");
      } else {
        if (!("Notification" in window)) return;
        const permission = await Notification.requestPermission();
        setNotifStatus(permission === "granted" ? "granted" : "denied");
      }
    } catch (err) {
      console.error('[Permissions] Notification registration failed:', err);
      setNotifStatus("denied");
    }
  };

  const dynamicCardStyle = {
    ...cardStyle,
    background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
    border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.1)',
    boxShadow: isLight ? '0 4px 16px rgba(15,23,42,0.05)' : 'none'
  };

  const dynamicActionBtn = {
    ...actionBtn,
    background: isLight ? '#6D28D9' : '#8B5CF6'
  };

  return (
    <div style={{
      height: '100vh',
      background: 'var(--bg-gradient)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      color: 'var(--text-main)',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: isLight ? '#0F172A' : '#fff' }}>One Final Step</h1>
        <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.6)', marginBottom: '3rem', fontWeight: 500 }}>Help us connect you with local perks.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Geolocation Card */}
          <div style={dynamicCardStyle}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.25rem 0', color: isLight ? '#0F172A' : '#fff', fontWeight: 800 }}>Location Services</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.5)', fontWeight: 500 }}>To show you the best rewards in your neighborhood.</p>
            </div>
            <button 
              onClick={requestLocation} 
              disabled={locStatus === "granted"}
              style={locStatus === "granted" ? successBtn : dynamicActionBtn}
            >
              {locStatus === "granted" ? "✓" : "Continue"}
            </button>
          </div>

          {/* Notifications Card */}
          <div style={dynamicCardStyle}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.25rem 0', color: isLight ? '#0F172A' : '#fff', fontWeight: 800 }}>Push Notifications</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Get alerted about exclusive, limited-time offers.</p>
            </div>
            <button 
              onClick={requestNotifications} 
              disabled={notifStatus === "granted"}
              style={notifStatus === "granted" ? successBtn : dynamicActionBtn}
            >
              {notifStatus === "granted" ? "✓" : "Continue"}
            </button>
          </div>
        </div>
      </div>

      <button 
        onClick={() => {
          const pendingQr = localStorage.getItem('pending_qr');
          if (pendingQr) {
            router.push(`/redeem?perk=${pendingQr}`);
          } else {
            router.push("/");
          }
        }}
        style={{
          width: '100%',
          padding: '1.25rem',
          borderRadius: '20px',
          background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
          color: isLight ? '#0F172A' : '#fff',
          border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.1)',
          fontSize: '1rem',
          fontWeight: 700,
          marginBottom: '3rem',
          cursor: 'pointer',
          boxShadow: isLight ? '0 4px 16px rgba(15,23,42,0.05)' : 'none'
        }}
      >
        Continue to App
      </button>
    </div>
  );
}

const cardStyle = {
  padding: '1.5rem',
  borderRadius: '24px',
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem'
};

const actionBtn = {
  padding: '0.75rem 1.5rem',
  borderRadius: '12px',
  color: '#fff',
  border: 'none',
  fontSize: '0.875rem',
  fontWeight: 700,
  cursor: 'pointer'
};

const successBtn = {
  ...actionBtn,
  background: '#10B981',
  cursor: 'default'
};
