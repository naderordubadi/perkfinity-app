"use client";

import { useEffect, useState } from "react";

const APP_STORE_URL = "https://apps.apple.com/us/app/perkfinity-privacy-first-perks/id6759945540";
const APP_SCHEME = "perkfinity://open";

export default function DownloadPage() {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const android = /android/i.test(ua);
    setIsAndroid(android);

    if (android) {
      // Android: app not yet on Play Store — don't redirect anywhere automatically
      return;
    }

    // iOS / other: try to open installed app first, fall back to App Store
    const tryOpenApp = () => {
      window.location.href = APP_SCHEME;

      // After 1.5s, if still here the app is NOT installed → go to App Store
      const fallbackTimer = setTimeout(() => {
        window.location.href = APP_STORE_URL;
      }, 1500);

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) clearTimeout(fallbackTimer);
      }, { once: true });
    };

    tryOpenApp();
  }, []);

  // Visual while the redirect logic runs
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "Outfit, sans-serif",
      color: "#fff",
      gap: "1.5rem",
      textAlign: "center",
    }}>
      <img
        src="/logo.png"
        alt="Perkfinity"
        style={{ height: "48px", objectFit: "contain", marginBottom: "0.5rem" }}
      />

      <div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem", fontWeight: 700 }}>
          Get the Perkfinity App
        </h2>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: "260px" }}>
          Scan QR codes and unlock exclusive discounts at local merchants — no cards needed.
        </p>
      </div>

      {isAndroid ? (
        <div style={{ textAlign: "center", maxWidth: "280px" }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
            Android app is coming soon to Google Play!
          </p>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", margin: 0 }}>
            Check back shortly — it's on its way.
          </p>
        </div>
      ) : (
        <a
          href={APP_STORE_URL}
          style={{
            padding: "1rem 2rem",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "none",
            borderRadius: "20px",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
            width: "100%",
            maxWidth: "280px",
            display: "block",
            textAlign: "center",
          }}
        >
          Download on the App Store
        </a>
      )}

      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", maxWidth: "240px", lineHeight: 1.5 }}>
        Already have the app? Opening it now…
      </p>
    </div>
  );
}
