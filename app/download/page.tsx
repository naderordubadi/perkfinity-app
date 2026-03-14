"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function DownloadPage() {
  const router = useRouter();
  const [pendingQr, setPendingQr] = useState<string | null>(null);

  useEffect(() => {
    // If they were redirected here from a QR scan, we saved it.
    const qr = localStorage.getItem('pending_qr');
    if (qr) setPendingQr(qr);
  }, []);

  const handleDownload = () => {
    // Simulate App Store installation
    localStorage.setItem('app_installed', 'true');
    
    // Once "installed", they open the app and see the onboarding banners
    router.push('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      color: '#000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Fake App Store Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #E5E5EA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        fontWeight: 600
      }}>
        App Store
      </div>

      <div style={{ padding: '2rem 1.5rem', flex: 1 }}>
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* App Icon */}
          <div style={{
            width: '120px',
            height: '120px',
            background: '#0F172A',
            borderRadius: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
          }}>
            <Image src="/assets/logo.png" alt="Icon" width={80} height={80} style={{ objectFit: 'contain' }} />
          </div>
          
          {/* App Title & Get Button */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Perkfinity</h1>
            <p style={{ margin: '0 0 1rem', color: '#8E8E93', fontSize: '0.9rem' }}>Local Rewards & Deals</p>
            
            <button 
              onClick={handleDownload}
              style={{
                background: '#007AFF',
                color: '#fff',
                border: 'none',
                padding: '8px 24px',
                borderRadius: '20px',
                fontSize: '0.95rem',
                fontWeight: 700,
                width: 'fit-content',
                cursor: 'pointer'
              }}
            >
              GET
            </button>
          </div>
        </div>

        {/* Fake Screenshots/Preview */}
        <div style={{ borderTop: '1px solid #E5E5EA', paddingTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Preview</h2>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            <div style={{
              width: '200px', height: '400px', flexShrink: 0, background: '#F2F2F7', borderRadius: '24px', padding: '12px'
            }}>
              <div style={{
                width: '100%', height: '100%', background: '#0F172A', borderRadius: '16px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛍️</div>
                <div style={{ fontWeight: 600 }}>Earn Rewards</div>
              </div>
            </div>
            <div style={{
              width: '200px', height: '400px', flexShrink: 0, background: '#F2F2F7', borderRadius: '24px', padding: '12px'
            }}>
              <div style={{
                width: '100%', height: '100%', background: '#0F172A', borderRadius: '16px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💸</div>
                <div style={{ fontWeight: 600 }}>Save Money</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
