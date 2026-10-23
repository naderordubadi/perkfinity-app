"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../components/ThemeProvider";
import { IconCheckCircle } from "../../components/Icons";

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
    <div
      className="onb-perm-root"
      style={{
        height: '100vh',
        background: 'var(--bg-gradient)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem',
        color: 'var(--text-main)',
        fontFamily: 'Outfit, sans-serif'
      }}
    >
      <div className="onb-perm-inner" style={{ flex: 1, maxWidth: '440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 className="onb-perm-title" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: isLight ? '#0F172A' : '#fff' }}>One Final Step</h1>
        <p className="onb-perm-subtitle" style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.6)', marginBottom: '2.5rem', fontWeight: 500 }}>Help us connect you with local perks.</p>

        <div className="onb-perm-cards-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
              {locStatus === "granted" ? <IconCheckCircle size={18} /> : "Continue"}
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
              {notifStatus === "granted" ? <IconCheckCircle size={18} /> : "Continue"}
            </button>
          </div>
        </div>
      </div>

      <button 
        className="onb-perm-continue-btn"
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
          maxWidth: '440px',
          margin: '0 auto 2.5rem',
          padding: '1.25rem',
          borderRadius: '20px',
          background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
          color: isLight ? '#0F172A' : '#fff',
          border: isLight ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.1)',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: isLight ? '0 4px 16px rgba(15,23,42,0.05)' : 'none'
        }}
      >
        Continue to App
      </button>

      <style jsx>{`
        .onb-perm-root {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        @media (orientation: landscape), (horizontal-viewport-segments: 2) {
          .onb-perm-root {
            height: auto !important;
            min-height: 100vh !important;
            padding: 1.25rem max(1.5rem, env(safe-area-inset-left)) calc(1.5rem + env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-right)) !important;
            justify-content: center !important;
          }
          .onb-perm-inner {
            max-width: 760px !important;
            margin: 0 auto !important;
            width: 100% !important;
          }
          .onb-perm-title {
            font-size: 1.75rem !important;
            margin-bottom: 0.25rem !important;
            text-align: center !important;
          }
          .onb-perm-subtitle {
            margin-bottom: 1.25rem !important;
            font-size: 0.95rem !important;
            text-align: center !important;
          }
          .onb-perm-cards-wrapper {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 1.25rem !important;
            margin-bottom: 1.25rem !important;
          }
          .onb-perm-continue-btn {
            max-width: 400px !important;
            margin: 0 auto 1.25rem !important;
            padding: 1rem !important;
            width: 100% !important;
          }
        }
      `}</style>
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
