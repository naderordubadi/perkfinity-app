"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [method, setMethod] = useState<"choice" | "email">("choice");
  const router = useRouter();

  const handleAuth = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // In a real app, this would trigger the actual OAuth or Email flow
    router.push("/onboarding/pii");
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
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome to Perkfinity</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2.5rem' }}>Choose how you'd like to sign in.</p>

        {method === "choice" ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={handleAuth} style={btnStyle("#fff", "#000")}>
              <span style={{ marginRight: '12px' }}></span> Sign in with Apple
            </button>
            <button onClick={handleAuth} style={btnStyle("#fff", "#000")}>
              <span style={{ marginRight: '12px' }}>G</span> Sign in with Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
              <div style={lineStyle} />
              <span style={{ padding: '0 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>OR</span>
              <div style={lineStyle} />
            </div>
            <button onClick={() => setMethod("email")} style={btnStyle("rgba(255,255,255,0.1)", "#fff", "1px solid rgba(255,255,255,0.1)")}>
              Continue with Email
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Email Address</label>
              <input type="email" placeholder="name@example.com" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Password</label>
              <input type="password" placeholder="••••••••" style={inputStyle} />
            </div>
            <button onClick={handleAuth} style={btnStyle("#8B5CF6", "#fff")}>
              Sign In
            </button>
            <button onClick={() => setMethod("choice")} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
              Go Back
            </button>
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', paddingBottom: '2rem' }}>
        By continuing, you agree to Perkfinity's <br/><strong>Terms of Service</strong> and <strong>Privacy Policy</strong>.
      </p>
    </div>
  );
}

const btnStyle = (bg: string, color: string, border = "none") => ({
  width: '100%',
  padding: '1rem',
  borderRadius: '16px',
  background: bg,
  color: color,
  border: border,
  fontSize: '1rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
});

const inputStyle = {
  width: '100%',
  padding: '1rem',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: '1rem',
  outline: 'none'
};

const lineStyle = {
  flex: 1,
  height: '1px',
  background: 'rgba(255,255,255,0.1)'
};
