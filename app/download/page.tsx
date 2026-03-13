"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SmartRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // In a real PWA, we'd check if the app is "installed" via window.matchMedia('(display-mode: standalone)')
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

    if (isMobile && !isInstalled) {
      // Redirect to a placeholder App Store / Play Store page
      // For now, we'll just show an informative screen
      console.log("User should be redirected to App Store");
    } else {
      router.push("/onboarding");
    }
  }, [router]);

  return (
    <div style={{
      height: '100vh',
      background: '#0F172A',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#fff',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '2rem' }}>📱</div>
      <h1 style={{ marginBottom: '1rem' }}>Download Perkfinity</h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '300px', marginBottom: '3rem' }}>
        For the best experience, please download the Perkfinity app from the App Store or Play Store.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '280px' }}>
        <button style={btnStyle}>Download on App Store</button>
        <button style={btnStyle}>Get it on Google Play</button>
        <button onClick={() => router.push("/onboarding")} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', marginTop: '1rem' }}>
          Continue in Browser
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '1rem',
  background: '#fff',
  color: '#000',
  borderRadius: '12px',
  fontWeight: 700,
  border: 'none',
  width: '100%'
};
