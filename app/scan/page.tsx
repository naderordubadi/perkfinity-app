"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const router = useRouter();

  // "idle"       = show the landing screen with the "Allow Camera Access" button
  // "requesting" = getUserMedia was called, waiting for iOS native dialog result
  // "granted"    = camera stream active, scanning
  // "denied"     = getUserMedia threw NotAllowedError — user tapped Don't Allow
  const [permissionState, setPermissionState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const jsQR = (window as any).jsQR;
    if (!jsQR) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      setDetected(true);
      stopCamera();
      const qrMatch = code.data.match(/\/qr\/([^\/?#]+)/);
      if (qrMatch?.[1]) {
        router.push(`/qr/_/?code=${encodeURIComponent(qrMatch[1])}`);
      } else {
        try { window.location.href = code.data; } catch { router.push("/"); }
      }
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [router, stopCamera]);

  // Load jsQR library once on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      stopCamera();
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, [stopCamera]);

  // ─────────────────────────────────────────────────────────────────────────
  // startCamera: called when the user taps "Allow Camera Access".
  // getUserMedia() is what triggers iOS's native permission dialog.
  // NSCameraUsageDescription MUST be in Info.plist for this to work on iOS.
  // ─────────────────────────────────────────────────────────────────────────
  async function startCamera() {
    setPermissionState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setPermissionState("granted");
          setScanning(true);
          animFrameRef.current = requestAnimationFrame(scanFrame);
        };
      }
    } catch (err: any) {
      console.error("Camera error:", err?.name, err?.message);
      // NotAllowedError → user tapped "Don't Allow" in iOS native dialog
      // NotFoundError   → no camera found (simulator etc.)
      setPermissionState("denied");
    }
  }

  // ── LANDING SCREEN ────────────────────────────────────────────────────────
  // Always shown first. Tapping the button calls getUserMedia → iOS shows
  // its native "Allow / Deny" dialog because NSCameraUsageDescription is set.
  if (permissionState === "idle") {
    return (
      <div style={styles.fullPage}>
        <div style={styles.iconBox("rgba(139,92,246,0.15)", "rgba(139,92,246,0.3)", "0 0 40px rgba(139,92,246,0.2)")}>
          📷
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={styles.heading}>Camera Access Needed</h2>
          <p style={styles.body}>
            Perkfinity needs your camera to scan QR codes and unlock discounts at local merchant stores.
          </p>
        </div>
        <button onClick={startCamera} style={styles.primaryBtn}>
          Allow Camera Access
        </button>
        <a href="/" style={styles.cancelLink}>Cancel</a>
      </div>
    );
  }

  // ── REQUESTING OVERLAY ─────────────────────────────────────────────────────
  // We no longer early-return here because the <video ref> must stay mounted
  // in the DOM so that startCamera() can access it when the promise resolves.

  // ── DENIED SCREEN ──────────────────────────────────────────────────────────
  // Only shown if user explicitly tapped "Don't Allow" in iOS native dialog.
  // Instructions tell them exactly where to find the setting.
  if (permissionState === "denied") {
    return (
      <div style={styles.fullPage}>
        <div style={styles.iconBox("rgba(239,68,68,0.12)", "rgba(239,68,68,0.3)", "none")}>
          🚫
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={styles.heading}>Camera Access Denied</h2>
          <p style={styles.body}>
            You tapped "Don't Allow" when Perkfinity asked for camera access.
            To scan QR codes, please re-enable it in your iPhone Settings.
          </p>
        </div>
        <div style={{
          padding: "1rem 1.25rem",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "16px",
          fontSize: "0.82rem",
          color: "#FCA5A5",
          lineHeight: 1.7,
          textAlign: "center",
          maxWidth: "280px",
        }}>
          <strong>How to re-enable:</strong><br />
          iPhone <strong>Settings</strong> → scroll to <strong>Perkfinity</strong>
          → tap <strong>Camera</strong> → select <strong>Allow</strong>
        </div>
        {/* Let them try again — on next app launch iOS may show the dialog again */}
        <button onClick={() => setPermissionState("idle")} style={styles.primaryBtn}>
          Try Again
        </button>
        <a href="/" style={styles.cancelLink}>Go Back</a>
      </div>
    );
  }

  // ── CAMERA / SCANNING SCREEN ──────────────────────────────────────────────
  return (
    <div style={{ position: "relative", height: "100vh", backgroundColor: "#000", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {permissionState === "requesting" && (
        <div style={{ ...styles.fullPage, position: "absolute", zIndex: 100, inset: 0 }}>
          <div style={{ fontSize: "2.5rem" }}>📷</div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
            Waiting for camera permission…
          </p>
          <a href="/" style={styles.cancelLink}>Cancel</a>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: scanning ? 1 : 0, transition: "opacity 0.5s ease" }}
      />

      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at center, transparent 150px, rgba(0,0,0,0.6) 150px)",
        zIndex: 5, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        color: "#fff", textAlign: "center", padding: "2rem",
      }}>
        {/* Scanning Frame */}
        <div style={{
          width: "260px", height: "260px",
          border: "2px solid rgba(255,255,255,0.3)", borderRadius: "40px",
          position: "relative", boxShadow: "0 0 0 4000px rgba(15,23,42,0.4)",
          marginBottom: "2rem",
        }}>
          {!detected && (
            <div style={{
              position: "absolute", top: "0", left: "10%", width: "80%", height: "2px",
              background: "linear-gradient(to right, transparent, #8B5CF6, transparent)",
              boxShadow: "0 0 15px #8B5CF6",
              animation: "scanMove 2.5s infinite ease-in-out",
            }} />
          )}
          {detected && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(107,193,122,0.3)", borderRadius: "38px",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem",
            }}>✅</div>
          )}
          {[
            { top: -2, left: -2, borderTop: "4px solid #fff", borderLeft: "4px solid #fff", borderTopLeftRadius: "24px" },
            { top: -2, right: -2, borderTop: "4px solid #fff", borderRight: "4px solid #fff", borderTopRightRadius: "24px" },
            { bottom: -2, left: -2, borderBottom: "4px solid #fff", borderLeft: "4px solid #fff", borderBottomLeftRadius: "24px" },
            { bottom: -2, right: -2, borderBottom: "4px solid #fff", borderRight: "4px solid #fff", borderBottomRightRadius: "24px" },
          ].map((s, i) => (
            <div key={i} style={{ position: "absolute", width: "40px", height: "40px", ...s }} />
          ))}
        </div>

        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
          {detected ? "QR Code Detected!" : "Align QR Code"}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", maxWidth: "200px" }}>
          {detected ? "Loading your offer..." : "Position the merchant QR code within the frame to reveal your reward."}
        </p>
      </div>

      <div style={{ position: "absolute", bottom: "40px", width: "100%", display: "flex", justifyContent: "center", zIndex: 10 }}>
        <a href="/" style={{
          padding: "1rem 2rem",
          background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
          borderRadius: "24px", color: "#fff", textDecoration: "none",
          fontSize: "0.875rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)",
        }}>Cancel</a>
      </div>

      <style jsx global>{`
        @keyframes scanMove {
          0%   { top: 10%; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const styles = {
  fullPage: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    fontFamily: "Outfit, sans-serif",
    color: "#fff",
    gap: "1.5rem",
    textAlign: "center" as const,
  },
  iconBox: (bg: string, border: string, shadow: string) => ({
    width: "100px",
    height: "100px",
    borderRadius: "28px",
    background: bg,
    border: `1px solid ${border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "3rem",
    boxShadow: shadow,
  }),
  heading: { margin: "0 0 0.5rem", fontSize: "1.4rem", fontWeight: 700 },
  body: { margin: 0, color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: "260px" },
  primaryBtn: {
    padding: "1rem 2rem",
    background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    border: "none",
    borderRadius: "20px",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
    width: "100%",
    maxWidth: "280px",
  },
  cancelLink: { color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", textDecoration: "none" },
};
