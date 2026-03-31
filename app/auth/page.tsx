"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { setUserToken, setUserData } from "@/lib/user";

export default function AuthPage() {
  const [method, setMethod] = useState<"choice" | "login" | "signup" | "forgot">("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const router = useRouter();

  // ── Apple Sign-In (native Capacitor) ────────────────────────────
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      // Dynamic import so Next.js static export doesn't fail on web
      const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
      const result = await SignInWithApple.authorize({
        clientId: "net.perkfinity.app",
        redirectURI: "",   // required by types; ignored by native iOS
        scopes: "email name",
      });
      const credential = result.response;
      const fullName = [credential.givenName, credential.familyName].filter(Boolean).join(" ");
      const pendingQr = localStorage.getItem("pending_qr");
      const res = await fetchApi("/consumers/apple-signin", {
        method: "POST",
        body: JSON.stringify({
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          fullName,
          qrCode: pendingQr || undefined
        }),
      });
      if (res.success && res.data?.accessToken) {
        setUserToken(res.data.accessToken);
        localStorage.setItem("pf_has_account", "true");
        if (res.data.user) setUserData(res.data.user);
        const pendingQr = localStorage.getItem("pending_qr");
        if (!res.data.user?.zip_code) {
          router.push("/profile");
        } else if (pendingQr) {
          router.push(`/qr/_/?code=${encodeURIComponent(pendingQr)}`);
        } else {
          router.push("/");
        }
      } else {
        setError(res.error || "Apple Sign-In failed");
      }
    } catch (err: any) {
      // User cancelled = no error to display
      if (err?.message !== "The operation couldn't be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)") {
        setError("Apple Sign-In failed. Please try email instead.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In (native Capacitor) ───────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
      await GoogleAuth.initialize({
        clientId: "1053337094970-c38gunb5oljfncb4avar8c6fc4jg5kjg.apps.googleusercontent.com",
        scopes: ["profile", "email"],
        grantOfflineAccess: true,
      });
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication?.idToken;
      if (!idToken) throw new Error("No ID token returned from Google");
      const pendingQr = localStorage.getItem("pending_qr");
      const res = await fetchApi("/consumers/google-signin", {
        method: "POST",
        body: JSON.stringify({ idToken, qrCode: pendingQr || undefined }),
      });
      if (res.success && res.data?.accessToken) {
        setUserToken(res.data.accessToken);
        localStorage.setItem("pf_has_account", "true");
        if (res.data.user) setUserData(res.data.user);
        const pendingQr = localStorage.getItem("pending_qr");
        if (!res.data.user?.zip_code) {
          router.push("/profile");
        } else if (pendingQr) {
          router.push(`/qr/_/?code=${encodeURIComponent(pendingQr)}`);
        } else {
          router.push("/");
        }
      } else {
        setError(res.error || "Google Sign-In failed");
      }
    } catch (err: any) {
      if (err?.message && !err.message.includes("cancelled")) {
        setError("Google Sign-In failed. Please try email instead.");
      }
    } finally {
      setLoading(false);
    }
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
        localStorage.setItem('pf_has_account', 'true');
        if (res.data.user) {
          setUserData(res.data.user);
        }

        // ── Trigger iOS Keychain "Save Password?" prompt ──────────
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.isNativePlatform()) {
            const { SavePassword } = await import('@capgo/capacitor-autofill-save-password');
            await SavePassword.promptDialog({
              username: email,
              password: password,
              url: 'app.perkfinity.net',
            });
          }
        } catch (saveErr) {
          // Non-fatal — don't block login if save prompt fails
          console.warn('[Auth] Keychain save prompt skipped:', saveErr);
        }
        
        // Next Step Logic
        let target = method === "signup" ? "/profile" : "/scan"; 
        
        // If login but missing profile demographic data, force them to profile routing
        if (method === "login" && res.data.user && !res.data.user.zip_code) {
          target = "/profile";
        }
        
        const pendingQr = localStorage.getItem('pending_qr');
        if (target === "/profile") {
          router.push("/profile");
        } else if (pendingQr) {
          router.push(`/qr/_/?code=${encodeURIComponent(pendingQr)}`);
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

  // ── Forgot Password ─────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email address");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return setError("Please enter a valid email address");
    try {
      setLoading(true);
      setError("");
      const res = await fetchApi('/consumers/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      if (res.success) {
        setForgotSuccess(true);
      } else {
        setError(res.error || "Failed to send reset email");
      }
    } catch (err: any) {
      // Show generic success even on error to not leak user existence
      setForgotSuccess(true);
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
          {method === "choice" ? "Choose how you'd like to sign in." : method === "login" ? "Sign in to your account." : "Create your account."}
        </p>

        {method === "choice" ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Apple Sign-In — real native Capacitor plugin */}
            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              style={btnStyle("#fff", "#000")}
            >
              <span style={{ marginRight: '12px' }}></span>
              {loading ? "Signing in..." : "Sign in with Apple"}
            </button>

            {/* Google Sign-In — real native Capacitor plugin */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={btnStyle("#fff", "#1a1a1a")}
            >
              <span style={{ marginRight: '12px' }}>G</span>
              {loading ? "Signing in..." : "Sign in with Google"}
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
              Already registered? Sign in
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
                autoComplete="email"
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
                  autoComplete="current-password"
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
            {method === "login" && (
              <button
                type="button"
                onClick={() => { setMethod("forgot"); setError(""); setForgotSuccess(false); }}
                style={{ background: 'none', border: 'none', color: '#8B5CF6', fontSize: '0.875rem', cursor: 'pointer', marginTop: '-0.5rem' }}
              >
                Forgot Password?
              </button>
            )}
            <button type="button" onClick={() => setMethod("choice")} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', cursor: 'pointer' }}>
              Go Back
            </button>
          </form>
        )}

        {method === "forgot" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {forgotSuccess ? (
              <>
                <div style={{
                  background: 'rgba(107,193,122,0.12)',
                  border: '1px solid rgba(107,193,122,0.35)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✉️</div>
                  <h3 style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#86EFAC' }}>Check Your Email</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    If an account exists for <strong style={{ color: '#fff' }}>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
                  </p>
                </div>
                <button
                  onClick={() => { setMethod("login"); setError(""); setForgotSuccess(false); }}
                  style={btnStyle("#8B5CF6", "#fff")}
                >
                  Back to Sign In
                </button>
              </>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.25rem' }}>Reset Password</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
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
                <button type="submit" disabled={loading} style={btnStyle("#8B5CF6", "#fff")}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod("login"); setError(""); }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', paddingBottom: '2rem' }}>
        By continuing, you agree to Perkfinity&apos;s <br/>
        <a href="https://perkfinity.net/terms-of-use.html" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Terms of Use</a>
        {' '}and{' '}
        <a href="https://perkfinity.net/privacy-policy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Privacy Policy</a>.
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
