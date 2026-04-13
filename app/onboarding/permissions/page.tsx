"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://perkfinity-backend.vercel.app/api/v1';

export default function PermissionsPage() {
  const [locStatus, setLocStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");
  const router = useRouter();

  const requestLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => setLocStatus("granted"),
      () => setLocStatus("denied")
    );
  };

  const requestNotifications = async () => {
    try {
      // Use Firebase FCM (native iOS) — NOT the web Notification API
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const { receive } = await FirebaseMessaging.requestPermissions();
        if (receive !== 'granted') { setNotifStatus("denied"); return; }
        const { token: fcmToken } = await FirebaseMessaging.getToken();
        if (!fcmToken) { setNotifStatus("denied"); return; }
        // Save token to backend
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
        // Web fallback (for browser testing only)
        if (!("Notification" in window)) return;
        const permission = await Notification.requestPermission();
        setNotifStatus(permission === "granted" ? "granted" : "denied");
      }
    } catch (err) {
      console.error('[Permissions] Notification registration failed:', err);
      setNotifStatus("denied");
    }
  };


  return (
    <div style={{
      height: '100vh',
      background: '#0F172A',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      color: '#fff',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>One Final Step</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '3rem' }}>Help us connect you with local perks.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Geolocation Card */}
          <div style={cardStyle}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.25rem 0' }}>Location Services</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>To show you the best rewards in your neighborhood.</p>
            </div>
            <button 
              onClick={requestLocation} 
              disabled={locStatus === "granted"}
              style={locStatus === "granted" ? successBtn : actionBtn}
            >
              {locStatus === "granted" ? "✓" : "Continue"}
            </button>
          </div>

          {/* Notifications Card */}
          <div style={cardStyle}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.25rem 0' }}>Push Notifications</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Get alerted about exclusive, limited-time offers.</p>
            </div>
            <button 
              onClick={requestNotifications} 
              disabled={notifStatus === "granted"}
              style={notifStatus === "granted" ? successBtn : actionBtn}
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
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '1rem',
          fontWeight: 600,
          marginBottom: '3rem',
          cursor: 'pointer'
        }}
      >
        Continue to App
      </button>
    </div>
  );
}

const cardStyle = {
  padding: '1.5rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '24px',
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem'
};

const actionBtn = {
  padding: '0.75rem 1.5rem',
  borderRadius: '12px',
  background: '#8B5CF6',
  color: '#fff',
  border: 'none',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer'
};

const successBtn = {
  ...actionBtn,
  background: '#10B981',
  cursor: 'default'
};
