"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { useTheme } from "@/app/components/ThemeProvider";
import { IconCamera, IconBan, IconCheckCircle, IconSparkles } from "@/app/components/Icons";

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
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('ios'); // default ios so SSR is safe

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

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      setDetected(true);
      stopCamera();
      const qrMatch = code.data.match(/\/(?:qr|join)\/([^\/?#]+)/);
      if (qrMatch?.[1]) {
        router.push(`/qr/_/?code=${encodeURIComponent(qrMatch[1])}`);
      } else {
        try { window.location.href = code.data; } catch { router.push("/"); }
      }
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [router, stopCamera]);

  // Detect platform on mount
  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      setPlatform(Capacitor.getPlatform() as 'ios' | 'android' | 'web');
    }).catch(() => setPlatform('web'));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Listen for app returning to foreground (e.g. returning from phone Settings)
  useEffect(() => {
    let removeListener: (() => void) | undefined;

    async function setupResumeListener() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { App } = await import('@capacitor/app');
          const handle = await App.addListener('appStateChange', async (state) => {
            if (state.isActive) {
              // If user was on the denied screen and enabled permission in Settings, auto-start camera
              if (permissionState === 'denied' && Capacitor.getPlatform() === 'android') {
                try {
                  const { registerPlugin } = await import('@capacitor/core');
                  const AndroidCameraPermission = registerPlugin<{
                    checkPermissions(): Promise<{ camera: string }>;
                  }>('AndroidCameraPermission');
                  const check = await AndroidCameraPermission.checkPermissions();
                  if (check?.camera === 'granted') {
                    startCamera();
                  }
                } catch {
                  // Ignore
                }
              }
            }
          });
          removeListener = () => handle.remove();
        }
      } catch (err) {
        console.warn("[Camera] Resume listener error:", err);
      }
    }

    setupResumeListener();
    return () => {
      if (removeListener) removeListener();
    };
  }, [permissionState]);

  // ─────────────────────────────────────────────────────────────────────────
  // startCamera: called when the user taps "Allow Camera Access" / "Continue".
  // On Android, requests native OS permission first (pops up system dialog).
  // On iOS, getUserMedia() natively triggers the iOS permission dialog.
  // ─────────────────────────────────────────────────────────────────────────
  async function startCamera() {
    setPermissionState("requesting");

    // On Android native, request the OS-level runtime permission FIRST.
    // This triggers the native Android system permission prompt:
    // "Allow Perkfinity to take pictures and record video? While using the app / Only this time / Don't allow"
    // Just like Apple's native dialog, without kicking the user into device settings!
    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      if (Capacitor.getPlatform() === 'android') {
        const AndroidCameraPermission = registerPlugin<{
          requestPermissions(): Promise<{ camera: string }>;
          checkPermissions(): Promise<{ camera: string }>;
          openSettings(): Promise<void>;
        }>('AndroidCameraPermission');

        const status = await AndroidCameraPermission.requestPermissions();
        if (status?.camera !== 'granted') {
          console.warn("[Camera] Android native permission not granted:", status?.camera);
          setPermissionState("denied");
          return;
        }
      }
    } catch (pluginErr) {
      console.warn("[Camera] Native Android permission handler skipped or failed:", pluginErr);
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (primaryErr: any) {
        // Fallback for tablets or front-only cameras where environment camera is unavailable
        if (primaryErr?.name === 'OverconstrainedError' || primaryErr?.name === 'NotFoundError') {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw primaryErr;
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((playErr) => {
            console.warn("[Camera] video.play() error:", playErr);
          });
          setPermissionState("granted");
          setScanning(true);
          animFrameRef.current = requestAnimationFrame(scanFrame);
        };
      }
    } catch (err: any) {
      console.error("Camera error:", err?.name, err?.message);
      // NotAllowedError → user tapped "Don't Allow" in native dialog
      // NotFoundError   → no camera found (simulator etc.)
      setPermissionState("denied");
    }
  }

  async function openDeviceSettings() {
    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      if (Capacitor.getPlatform() === 'android') {
        const AndroidCameraPermission = registerPlugin<{
          openSettings(): Promise<void>;
        }>('AndroidCameraPermission');
        await AndroidCameraPermission.openSettings();
      } else if (Capacitor.getPlatform() === 'ios') {
        window.location.href = 'app-settings:';
      }
    } catch (err) {
      console.error("[Camera] Failed to open device settings:", err);
    }
  }

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const dynamicFullPage = {
    ...styles.fullPage,
    background: 'var(--bg-gradient)',
    color: 'var(--text-main)',
  };

  const dynamicHeading = {
    ...styles.heading,
    color: isLight ? '#0F172A' : '#fff',
  };

  const dynamicBody = {
    ...styles.body,
    color: isLight ? '#475569' : 'rgba(255,255,255,0.55)',
  };

  // ── LANDING SCREEN ────────────────────────────────────────────────────────
  if (permissionState === "idle") {
    return (
      <div className="scan-landing-root" style={{
        ...dynamicFullPage,
        padding: '2rem 1.5rem calc(9rem + env(safe-area-inset-bottom, 0px)) 1.5rem',
        overflowY: 'auto',
      }}>
        <div className="scan-landing-grid">
          {/* Left Column in Landscape (Bottom in Portrait): Consent Disclosure */}
          <div className="scan-landing-left">
            <div style={{
              padding: '16px 20px',
              background: isLight ? '#DCFCE7' : '#3B9A52',
              border: isLight ? '1px solid #86EFAC' : '1px solid #6BC17A',
              borderRadius: '16px',
              maxWidth: '340px',
              lineHeight: 1.6,
              textAlign: 'left',
              boxShadow: isLight ? '0 4px 14px rgba(21,128,61,0.06)' : 'none',
            }}>
              <p style={{ margin: 0, fontSize: '0.74rem', color: isLight ? '#15803D' : '#fff', fontWeight: 600 }}>
                By scanning a merchant&apos;s QR code, you agree to join their exclusive local perks member list
                and consent to receive promotional emails and notifications from the merchant and Perkfinity.
                By proceeding, you agree to our{' '}
                <button
                  onClick={() => window.open('https://www.perkfinity.net/privacy-policy.html', '_system')}
                  style={{ background: 'none', border: 'none', padding: 0, color: isLight ? '#15803D' : '#fff', fontWeight: 800, fontSize: '0.74rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
                >Privacy Policy</button>{' '}
                and{' '}
                <button
                  onClick={() => window.open('https://www.perkfinity.net/terms-of-use.html', '_system')}
                  style={{ background: 'none', border: 'none', padding: 0, color: isLight ? '#15803D' : '#fff', fontWeight: 800, fontSize: '0.74rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
                >Terms of Use</button>.
              </p>
            </div>
          </div>

          {/* Right Column in Landscape (Top in Portrait): Camera Icon, Title, Text, Continue */}
          <div className="scan-landing-right">
            <div style={styles.iconBox(isLight ? '#F3E8FF' : "rgba(139,92,246,0.15)", isLight ? '#D8B4FE' : "rgba(139,92,246,0.3)", isLight ? "0 4px 16px rgba(109,40,217,0.1)" : "0 0 40px rgba(139,92,246,0.2)")}>
              <IconCamera size={44} color={isLight ? '#6D28D9' : '#C4B5FD'} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h2 style={dynamicHeading}>Camera Access Needed</h2>
              <p style={dynamicBody}>
                Perkfinity needs your camera to scan QR codes and unlock discounts at local merchant stores.
              </p>
            </div>
            <button onClick={startCamera} style={{ ...styles.primaryBtn, background: isLight ? '#6D28D9' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
              Continue
            </button>
          </div>
        </div>

        <style jsx>{`
          .scan-landing-grid {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            width: 100%;
            max-width: 400px;
          }
          .scan-landing-left {
            order: 2;
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .scan-landing-right {
            order: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.25rem;
            width: 100%;
          }
          @media (orientation: landscape) and (max-height: 550px), (min-width: 600px) and (orientation: landscape) {
            .scan-landing-root {
              padding: 1.25rem max(1.5rem, env(safe-area-inset-left)) calc(7rem + env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-right)) !important;
              justify-content: center !important;
            }
            .scan-landing-grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 2rem !important;
              max-width: 760px !important;
              align-items: center !important;
            }
            .scan-landing-left {
              order: 1 !important;
              justify-content: flex-end !important;
            }
            .scan-landing-right {
              order: 2 !important;
              align-items: center !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // ── DENIED SCREEN ──────────────────────────────────────────────────────────
  if (permissionState === "denied") {
    const isAndroid = platform === 'android';
    return (
      <div className="scan-denied-root" style={dynamicFullPage}>
        <div className="scan-denied-grid">
          {/* Left Column in Landscape (Instructions Card): Larger and prominent */}
          <div className="scan-denied-left">
            <div style={{
              padding: "1.25rem 1.5rem",
              background: isLight ? '#FEE2E2' : "rgba(239,68,68,0.08)",
              border: isLight ? '1px solid #FCA5A5' : "1px solid rgba(239,68,68,0.25)",
              borderRadius: "20px",
              fontSize: "0.85rem",
              color: isLight ? '#991B1B' : "#FCA5A5",
              lineHeight: 1.75,
              textAlign: "left",
              width: "100%",
              maxWidth: "380px",
              boxShadow: isLight ? '0 6px 18px rgba(220,38,38,0.06)' : 'none',
            }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🛠️</span> How to re-enable:
              </div>
              {isAndroid ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div><strong>1.</strong> Open device <strong>Settings</strong></div>
                  <div><strong>2.</strong> Go to <strong>Apps</strong> → <strong>Perkfinity</strong></div>
                  <div><strong>3.</strong> Tap <strong>Permissions</strong> → <strong>Camera</strong></div>
                  <div><strong>4.</strong> Select <strong>&quot;Allow while using app&quot;</strong></div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div><strong>1.</strong> Open iPhone <strong>Settings</strong></div>
                  <div><strong>2.</strong> Scroll down to <strong>Apps</strong></div>
                  <div><strong>3.</strong> Tap <strong>Perkfinity</strong></div>
                  <div><strong>4.</strong> Toggle on <strong>Camera</strong> access</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column in Landscape (Icon, Title, Description, Try Again, Go Back) */}
          <div className="scan-denied-right">
            <div style={styles.iconBox(isLight ? '#FEE2E2' : "rgba(239,68,68,0.12)", isLight ? '#FCA5A5' : "rgba(239,68,68,0.3)", "none")}>
              <IconBan size={44} color="#DC2626" />
            </div>
            <div style={{ textAlign: "center" }}>
              <h2 style={dynamicHeading}>Camera Access Denied</h2>
              <p style={dynamicBody}>
                {isAndroid
                  ? 'Perkfinity needs camera access to scan QR codes. Please enable it in your device settings.'
                  : 'You tapped "Don\'t Allow" when Perkfinity asked for camera access. To scan QR codes, please re-enable it in your iPhone Settings.'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', maxWidth: '280px' }}>
              <button onClick={startCamera} style={{ ...styles.primaryBtn, width: '100%', background: isLight ? '#6D28D9' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                Try Again
              </button>
              <button
                onClick={openDeviceSettings}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '24px',
                  background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)',
                  border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.15)',
                  color: isLight ? '#334155' : '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                ⚙️ Open App Settings
              </button>
            </div>
            <a href="/" style={{ ...styles.cancelLink, color: isLight ? '#6D28D9' : 'rgba(255,255,255,0.7)', fontWeight: 700, marginTop: '0.25rem' }}>Go Back</a>
          </div>
        </div>

        <style jsx>{`
          .scan-denied-grid {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            width: 100%;
            max-width: 400px;
          }
          .scan-denied-left {
            order: 2;
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .scan-denied-right {
            order: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.15rem;
            width: 100%;
          }
          @media (orientation: landscape) and (max-height: 550px), (min-width: 600px) and (orientation: landscape) {
            .scan-denied-root {
              padding: 1.25rem max(1.5rem, env(safe-area-inset-left)) calc(7rem + env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-right)) !important;
              justify-content: center !important;
            }
            .scan-denied-grid {
              display: grid !important;
              grid-template-columns: 1.15fr 1fr !important;
              gap: 2rem !important;
              max-width: 760px !important;
              align-items: center !important;
            }
            .scan-denied-left {
              order: 1 !important;
              justify-content: flex-end !important;
            }
            .scan-denied-right {
              order: 2 !important;
              align-items: center !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // ── CAMERA / SCANNING SCREEN ──────────────────────────────────────────────
  return (
    <div className="scanner-container">
      {permissionState === "requesting" && (
        <div style={{ ...dynamicFullPage, position: "absolute", zIndex: 100, inset: 0 }}>
          <IconCamera size={48} color={isLight ? '#6D28D9' : '#C4B5FD'} />
          <p style={{ color: isLight ? '#0F172A' : 'rgba(255,255,255,0.6)', fontSize: "0.95rem", fontWeight: 600 }}>
            Waiting for camera permission…
          </p>
          <a href="/" style={{ ...styles.cancelLink, color: isLight ? '#6D28D9' : 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Cancel</a>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Top Leaf / Camera Viewport */}
      <div className="scanner-viewfinder-leaf">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: scanning ? 1 : 0, transition: "opacity 0.5s ease" }}
        />

        <div className="scanner-overlay-reticle">
          {/* Scanning Frame */}
          <div className="scanner-frame-box">
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
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><IconCheckCircle size={54} color="#86EFAC" /></div>
            )}
            {[
              { top: -2, left: -2, borderTop: "4px solid #fff", borderLeft: "4px solid #fff", borderTopLeftRadius: "24px" },
              { top: -2, right: -2, borderTop: "4px solid #fff", borderRight: "4px solid #fff", borderTopRightRadius: "24px" },
              { bottom: -2, left: -2, borderBottom: "4px solid #fff", borderLeft: "4px solid #fff", borderBottomLeftRadius: "24px" },
              { bottom: -2, right: -2, borderBottom: "4px solid #fff", borderRight: "4px solid #fff", borderBottomRightRadius: "24px" },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", width: "36px", height: "36px", ...s }} />
            ))}
          </div>

          <div className="scanner-heading-box">
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 0.4rem", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              {detected ? "QR Code Detected!" : "Align QR Code"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", maxWidth: "240px", margin: "0 auto", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              {detected ? "Loading your offer..." : "Position the merchant QR code within the frame."}
            </p>
          </div>
        </div>
      </div>

      {/* Side / Left Control Deck (Active in Landscape & Duo 2-column mode) */}
      <div className="scanner-side-deck">
        <div className="side-deck-content">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: detected ? "rgba(34,197,94,0.2)" : "rgba(139,92,246,0.2)",
            border: detected ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(139,92,246,0.4)",
            padding: "6px 14px",
            borderRadius: "14px",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: detected ? "#86EFAC" : "#C4B5FD",
            marginBottom: "0.85rem"
          }}>
            {detected ? <><IconCheckCircle size={16} color="#86EFAC" /> QR Code Detected!</> : <><IconSparkles size={16} color="#C4B5FD" /> Scanner Ready</>}
          </div>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0 0 0.5rem", color: "#fff" }}>
            {detected ? "Opening Perk..." : "Scan Merchant QR"}
          </h2>

          <p style={{ margin: "0 0 1.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", maxWidth: "280px", lineHeight: 1.5 }}>
            {detected ? "Fetching available offers for this location..." : "Align the merchant QR code within the camera frame on the right to claim your perks."}
          </p>

          <a href="/" style={{
            display: "inline-block",
            padding: "0.85rem 2.25rem",
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            borderRadius: "20px",
            color: "#fff",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 700,
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}>Cancel / Home</a>
        </div>
      </div>

      {/* Floating Cancel Button for Standard Portrait Mode */}
      <div className="scanner-portrait-cancel">
        <a href="/" style={{
          padding: "0.9rem 2rem",
          background: "rgba(15,23,42,0.65)", backdropFilter: "blur(12px)",
          borderRadius: "24px", color: "#fff", textDecoration: "none",
          fontSize: "0.875rem", fontWeight: 700, border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>Cancel</a>
      </div>

      <style jsx global>{`
        @keyframes scanMove {
          0%   { top: 10%; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }

        .scanner-container {
          position: relative;
          height: 100vh;
          width: 100%;
          background-color: #000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .scanner-viewfinder-leaf {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .scanner-overlay-reticle {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          text-align: center;
          padding: 2rem;
        }

        .scanner-frame-box {
          width: 260px;
          height: 260px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 32px;
          position: relative;
          box-shadow: 0 0 0 4000px rgba(0,0,0,0.65);
          margin-bottom: 1.5rem;
        }

        .scanner-heading-box {
          position: relative;
          z-index: 10;
        }

        .scanner-side-deck {
          display: none;
        }

        .scanner-portrait-cancel {
          position: absolute;
          bottom: calc(36px + env(safe-area-inset-bottom, 0px));
          width: 100%;
          display: flex;
          justify-content: center;
          z-index: 10;
        }

        /* ── Landscape & Duo 2-Column Mode (Left: Side Deck, Right: Scanner) ── */
        @media (orientation: landscape), (horizontal-viewport-segments: 2), (min-width: 600px) and (orientation: landscape) {
          .scanner-container {
            flex-direction: row !important;
            height: 100vh !important;
            width: 100% !important;
            overflow: hidden !important;
          }

          .scanner-side-deck {
            display: flex !important;
            flex: 0 0 45% !important;
            width: 45% !important;
            height: 100% !important;
            order: 1 !important;
            align-items: center !important;
            justify-content: center !important;
            background: linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%) !important;
            padding: 1rem max(1.5rem, env(safe-area-inset-left)) calc(5.5rem + env(safe-area-inset-bottom)) 1.5rem !important;
            text-align: center !important;
            box-sizing: border-box !important;
            z-index: 20 !important;
            border-right: 1px solid rgba(139, 92, 246, 0.3) !important;
          }

          .side-deck-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .scanner-viewfinder-leaf {
            flex: 0 0 55% !important;
            width: 55% !important;
            height: 100% !important;
            order: 2 !important;
            border-bottom: none !important;
            position: relative !important;
          }

          .scanner-overlay-reticle {
            padding-bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px)) !important;
            justify-content: center !important;
          }

          .scanner-frame-box {
            width: 200px !important;
            height: 200px !important;
            margin-bottom: 0 !important;
            border-radius: 28px !important;
          }

          .scanner-heading-box {
            display: none !important;
          }

          .scanner-portrait-cancel {
            display: none !important;
          }
        }

        /* Clamshell / Tabletop Vertical Fold Only */
        @media (vertical-viewport-segments: 2) {
          .scanner-container {
            flex-direction: column !important;
          }
          .scanner-viewfinder-leaf {
            height: 55% !important;
            flex: 0 0 55% !important;
            border-bottom: 1px solid rgba(139, 92, 246, 0.4) !important;
          }
          .scanner-side-deck {
            height: 45% !important;
            flex: 0 0 45% !important;
            border-right: none !important;
          }
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
