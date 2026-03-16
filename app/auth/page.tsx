"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { setUserToken, setUserData } from "@/lib/user";

export default function AuthPage() {
  const [method, setMethod] = useState<"choice" | "login" | "signup">("choice");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleOAuth = (e: React.MouseEvent<HTMLButtonElement>, provider: string) => {
    e.preventDefault();
    alert(`${provider} login is mocked for this demo. Use Email to test end-to-end.`);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Please enter email and password");

    if (method === "signup") {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNum = /[0-9]/.test(password);
      if (password.length < 8 || !hasUpper || !hasLower || !hasNum) {
        return setError("Password does not meet complexity requirements.");
      }
    }

    try {
      setLoading(true);
      setError("");
      const endpoint = method === "login" ? "/consumers/login" : "/consumers/signup";
      
      const pendingQr = localStorage.getItem('pending_qr');
      const res = await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password, qrCode: pendingQr || undefined })
      });
      
      if (res.success && res.data?.accessToken) {
        setUserToken(res.data.accessToken);
        localStorage.setItem('pf_has_account', 'true'); // Flag used by QR state machine
        if (res.data.user) {
          setUserData(res.data.user);
        }
        
        // Next Step Logic
        let target = method === "signup" ? "/profile" : "/scan"; 
        
        // If login but missing profile demographic data, force them to profile routing
        if (method === "login" && res.data.user && !res.data.user.full_name) {
          target = "/profile";
        }
        
        const pendingQr = localStorage.getItem('pending_qr');
        if (target === "/profile") {
          router.push("/profile");
        } else if (pendingQr) {
          router.push(`/qr/${pendingQr}`);
        } else {
          router.push(target);
        }
      } else {
        setError(res.error || "Authentication failed");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Password validation checks
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasLength = password.length >= 8;

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
        <img 
          src="/assets/logo.png" 
          alt="Perkfinity Logo" 
          style={{ width: '100%', maxWidth: '280px', margin: '0 auto 1.5rem', display: 'block', objectFit: 'contain' }} 
        />
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2.5rem', textAlign: 'center' }}>
          {method === "choice" ? "Choose how you'd like to sign in." : method === "login" ? "Log in to your account." : "Create your account."}
        </p>

        {method === "choice" ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={(e) => handleOAuth(e, "Apple")} style={btnStyle("#fff", "#000")}>
              <span style={{ marginRight: '12px' }}></span> Sign in with Apple
            </button>
            <button onClick={(e) => handleOAuth(e, "Google")} style={btnStyle("#fff", "#000")}>
              <span style={{ marginRight: '12px' }}>G</span> Sign in with Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
              <div style={lineStyle} />
              <span style={{ padding: '0 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>OR</span>
              <div style={lineStyle} />
            </div>
            <button onClick={() => setMethod("signup")} style={btnStyle("rgba(255,255,255,0.1)", "#fff", "1px solid rgba(255,255,255,0.1)")}>
              Sign Up with Email
            </button>
            <button onClick={() => setMethod("login")} style={{ ...btnStyle("transparent", "rgba(255,255,255,0.7)"), padding: '0.5rem' }}>
              Already registered? Log in
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && <div style={{ color: '#FCA5A5', fontSize: '0.875rem', background: 'rgba(252, 165, 165, 0.1)', padding: '12px', borderRadius: '8px' }}>{error}</div>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Email Address</label>
              <input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle} 
                required
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '46px' }} 
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '16px',
                    background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', opacity: 0.7
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {method === "signup" && password.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', marginTop: '-0.5rem' }}>
                <span style={{ color: hasUpper ? '#6BC17A' : '#FCA5A5' }}>{hasUpper ? '✓' : '✗'} One uppercase letter</span>
                <span style={{ color: hasLower ? '#6BC17A' : '#FCA5A5' }}>{hasLower ? '✓' : '✗'} One lowercase letter</span>
                <span style={{ color: hasNum ? '#6BC17A' : '#FCA5A5' }}>{hasNum ? '✓' : '✗'} One number</span>
                <span style={{ color: hasLength ? '#6BC17A' : '#FCA5A5' }}>{hasLength ? '✓' : '✗'} At least 8 characters</span>
              </div>
            )}

            <button type="submit" disabled={loading} style={btnStyle("#8B5CF6", "#fff")}>
              {loading ? "Please wait..." : method === "login" ? "Sign In" : "Create Account"}
            </button>
            <button type="button" onClick={() => setMethod("choice")} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', cursor: 'pointer' }}>
              Go Back
            </button>
          </form>
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
  cursor: 'pointer',
  transition: 'transform 0.1s'
});

const inputStyle = {
  width: '100%',
  padding: '1rem',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box' as const
};

const lineStyle = {
  flex: 1,
  height: '1px',
  background: 'rgba(255,255,255,0.1)'
};
