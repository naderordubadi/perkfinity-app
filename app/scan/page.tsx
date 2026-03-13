"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
          setScanning(true);
          
          // Simulate a "Successful Scan" after 3 seconds for demo purposes
          setTimeout(() => {
            router.push("/perk/tailor-20");
          }, 3500);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasPermission(false);
      }
    }

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{
      position: 'relative',
      height: '100vh',
      backgroundColor: '#000',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Camera View */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: scanning ? 1 : 0,
          transition: 'opacity 0.5s ease'
        }}
      />

      {/* Overlay UI */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 150px, rgba(0,0,0,0.6) 150px)',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        textAlign: 'center',
        padding: '2rem'
      }}>
        {/* Scanning Frame */}
        <div style={{
          width: '260px',
          height: '260px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderRadius: '40px',
          position: 'relative',
          boxShadow: '0 0 0 4000px rgba(15, 23, 42, 0.4)',
          marginBottom: '2rem'
        }}>
          {/* Animated Scanning Line */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '10%',
            width: '80%',
            height: '2px',
            background: 'linear-gradient(to right, transparent, #8B5CF6, transparent)',
            boxShadow: '0 0 15px #8B5CF6',
            animation: 'scanMove 2.5s infinite ease-in-out'
          }} />
          
          {/* Corner accents */}
          {[
            { top: -2, left: -2, borderTop: '4px solid #fff', borderLeft: '4px solid #fff', borderTopLeftRadius: '24px' },
            { top: -2, right: -2, borderTop: '4px solid #fff', borderRight: '4px solid #fff', borderTopRightRadius: '24px' },
            { bottom: -2, left: -2, borderBottom: '4px solid #fff', borderLeft: '4px solid #fff', borderBottomLeftRadius: '24px' },
            { bottom: -2, right: -2, borderBottom: '4px solid #fff', borderRight: '4px solid #fff', borderBottomRightRadius: '24px' }
          ].map((style, i) => (
            <div key={i} style={{ position: 'absolute', width: '40px', height: '40px', ...style }} />
          ))}
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Align QR Code</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', maxWidth: '200px' }}>
          Position the merchant QR code within the frame to reveal your reward.
        </p>

        {/* Permission State */}
        {hasPermission === false && (
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.2)',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <p style={{ color: '#FCA5A5', margin: 0, fontSize: '0.875rem' }}>
              Camera access denied. Please enable it in browser settings.
            </p>
          </div>
        )}
      </div>

      {/* Footer / Close */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 10
      }}>
        <a href="/" style={{
          padding: '1rem 2rem',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          color: '#fff',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Cancel
        </a>
      </div>

      <style jsx global>{`
        @keyframes scanMove {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
