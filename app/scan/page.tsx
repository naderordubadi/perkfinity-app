"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
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

    // Use jsQR from the global window object (loaded via script tag in layout)
    const jsQR = (window as any).jsQR;
    if (!jsQR) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      // QR code detected!
      setDetected(true);
      stopCamera();

      // Extract the public_code from the scanned URL
      // Expected format: https://perkfinity-app.vercel.app/qr/XXXXXXXXX
      // or any URL ending with /qr/XXXXXXXXX
      const scannedUrl = code.data;
      const qrMatch = scannedUrl.match(/\/qr\/([a-zA-Z0-9_-]+)/);

      if (qrMatch && qrMatch[1]) {
        // Navigate to the real QR resolve page with the live public_code
        router.push(`/qr/${qrMatch[1]}`);
      } else {
        // The scanned QR is not a Perkfinity QR — maybe an external URL?
        // Try to open it or stay on page with an error
        try {
          window.location.href = scannedUrl;
        } catch {
          // fallback - just go home
          router.push("/");
        }
      }
      return;
    }

    // Keep scanning
    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [router, stopCamera]);

  useEffect(() => {
    // Load jsQR library dynamically
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    script.async = true;
    document.head.appendChild(script);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setHasPermission(true);
            setScanning(true);
            // Start the real QR scan loop once the video is ready
            animFrameRef.current = requestAnimationFrame(scanFrame);
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasPermission(false);
      }
    }

    startCamera();

    return () => {
      stopCamera();
      document.head.removeChild(script);
    };
  }, [scanFrame, stopCamera]);

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        backgroundColor: "#000",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Hidden canvas used for QR frame decoding */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Camera View */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: scanning ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      />

      {/* Overlay UI */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, transparent 150px, rgba(0,0,0,0.6) 150px)",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        {/* Scanning Frame */}
        <div
          style={{
            width: "260px",
            height: "260px",
            border: "2px solid rgba(255,255,255,0.3)",
            borderRadius: "40px",
            position: "relative",
            boxShadow: "0 0 0 4000px rgba(15, 23, 42, 0.4)",
            marginBottom: "2rem",
          }}
        >
          {/* Animated Scanning Line */}
          {!detected && (
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "10%",
                width: "80%",
                height: "2px",
                background:
                  "linear-gradient(to right, transparent, #8B5CF6, transparent)",
                boxShadow: "0 0 15px #8B5CF6",
                animation: "scanMove 2.5s infinite ease-in-out",
              }}
            />
          )}

          {/* Success overlay when detected */}
          {detected && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(107, 193, 122, 0.3)",
                borderRadius: "38px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem",
              }}
            >
              ✅
            </div>
          )}

          {/* Corner accents */}
          {[
            {
              top: -2,
              left: -2,
              borderTop: "4px solid #fff",
              borderLeft: "4px solid #fff",
              borderTopLeftRadius: "24px",
            },
            {
              top: -2,
              right: -2,
              borderTop: "4px solid #fff",
              borderRight: "4px solid #fff",
              borderTopRightRadius: "24px",
            },
            {
              bottom: -2,
              left: -2,
              borderBottom: "4px solid #fff",
              borderLeft: "4px solid #fff",
              borderBottomLeftRadius: "24px",
            },
            {
              bottom: -2,
              right: -2,
              borderBottom: "4px solid #fff",
              borderRight: "4px solid #fff",
              borderBottomRightRadius: "24px",
            },
          ].map((style, i) => (
            <div
              key={i}
              style={{ position: "absolute", width: "40px", height: "40px", ...style }}
            />
          ))}
        </div>

        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
          {detected ? "QR Code Detected!" : "Align QR Code"}
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.875rem",
            maxWidth: "200px",
          }}
        >
          {detected
            ? "Loading your offer..."
            : "Position the merchant QR code within the frame to reveal your reward."}
        </p>

        {/* Permission State */}
        {hasPermission === false && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              background: "rgba(239, 68, 68, 0.2)",
              borderRadius: "16px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <p style={{ color: "#FCA5A5", margin: 0, fontSize: "0.875rem" }}>
              Camera access denied. Please enable it in browser settings.
            </p>
          </div>
        )}
      </div>

      {/* Footer / Close */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <a
          href="/"
          style={{
            padding: "1rem 2rem",
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(12px)",
            borderRadius: "24px",
            color: "#fff",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          Cancel
        </a>
      </div>

      <style jsx global>{`
        @keyframes scanMove {
          0% {
            top: 10%;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            top: 90%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
