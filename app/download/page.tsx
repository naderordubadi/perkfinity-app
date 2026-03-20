"use client";

import { useEffect } from "react";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/tYvdH41G";
const APP_SCHEME = "perkfinity://open";

export default function DownloadPage() {
  useEffect(() => {
    // Step 1: Mark storage so the QR page knows the app is installed
    // (This runs if they somehow land back here after installing — clean it up)
    // Step 2: Try to open the app via its custom URL scheme.
    //         If the app is installed, iOS hands control to Perkfinity immediately.
    //         If NOT installed, the scheme fails silently and we fall back to TestFlight.
    const tryOpenApp = () => {
      // Attempt to wake the installed app
      window.location.href = APP_SCHEME;

      // After 1.5s, if we're still here the app is NOT installed → go to TestFlight
      const fallbackTimer = setTimeout(() => {
        window.location.href = TESTFLIGHT_URL;
      }, 1500);

      // If the app opens, iOS will blur the page — clear the timer on visibility change
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

      {/* Manual fallback button in case auto-redirect doesn't fire */}
      <a
        href={TESTFLIGHT_URL}
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
        Download on TestFlight
      </a>

      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", maxWidth: "240px", lineHeight: 1.5 }}>
        Already have the app? Opening it now…
      </p>
    </div>
  );
}
