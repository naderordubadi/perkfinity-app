"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { setUserToken, setUserData } from "@/lib/user";
import { getPostLoginRoute } from "@/lib/postLoginRoute";
import { useTheme } from "@/app/components/ThemeProvider";

export default function AuthPage() {
  const [method, setMethod] = useState<"choice" | "login" | "signup" | "forgot">("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [platform, setPlatform] = useState<string>("ios");
  const [platformLoaded, setPlatformLoaded] = useState(false);
  const [hasSavedCred, setHasSavedCred] = useState<{u:string;p:string}|null>(null);
  const router = useRouter();

  // Detect platform on mount — redirect web visitors to download page
  useEffect(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      const p = Capacitor.getPlatform();
      setPlatform(p);
      if (p === "web") {
        router.replace("/download");
      } else {
        setPlatformLoaded(true);
      }
    }).catch(() => {
      // Can't load Capacitor — must be web
      router.replace("/download");
    });
  }, []);

  // ── Check for saved credentials when the login form opens ───────
  useEffect(() => {
    if (method !== 'login') return;
    setHasSavedCred(null); // reset on each open
    const checkSaved = async () => {
      // Layer 1: native CredentialManager (Android)
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() === 'android') {
          const { SavePassword } = await import('@capgo/capacitor-autofill-save-password');
          const saved = await SavePassword.readPassword();
          if (saved?.username && saved?.password) {
            setEmail(saved.username);
            setPassword(saved.password);
            return;
          }
        }
      } catch { /* no native cred — fall through */ }

      // Layer 2: our own localStorage fallback
      try {
        const raw = localStorage.getItem('pf_cred');
        if (raw) {
          const cred = JSON.parse(raw);
          if (cred?.u && cred?.p) setHasSavedCred(cred);
        }
      } catch { /* corrupt — ignore */ }
    };
    checkSaved();
  }, [method]);

  // ── Apple Sign-In (native Capacitor via @capgo/capacitor-social-login) ─
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      await SocialLogin.initialize({
        apple: {
          clientId: 'net.perkfinity.app',
          redirectUrl: '',  // empty string = no redirect on iOS (required)
        },
      });
      const response = await SocialLogin.login({
        provider: 'apple',
        options: { scopes: ['name', 'email'] },
      });
      const credential = response.result;
      const identityToken = credential.idToken;
      if (!identityToken) throw new Error("No identity token returned from Apple");
      const fullName = [credential.profile?.givenName, credential.profile?.familyName]
        .filter(Boolean)
        .join(" ");
      const pendingQr = localStorage.getItem("pending_qr");
      const res = await fetchApi("/consumers/apple-signin", {
        method: "POST",
        body: JSON.stringify({
          identityToken,
          authorizationCode: credential.authorizationCode,
          fullName,
          qrCode: pendingQr || undefined,
        }),
      });
      if (res.success && res.data?.accessToken) {
        setUserToken(res.data.accessToken);
        localStorage.setItem("pf_has_account", "true");
        if (res.data.user) setUserData(res.data.user);
        const pqr = localStorage.getItem("pending_qr");
        const dest = await getPostLoginRoute(res.data.user, pqr);
        const returnPath = new URLSearchParams(window.location.search).get('return');
        router.push(returnPath && dest === '/' ? returnPath : dest);
      } else {
        setError(res.error || "Apple Sign-In failed");
      }
    } catch (err: any) {
      // USER_CANCELLED = user dismissed the Apple sheet — silent, no error shown.
      if (err?.code !== 'USER_CANCELLED') {
        setError("Apple Sign-In failed. Please try email instead.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In (native Capacitor via @capgo/capacitor-social-login) ─
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      await SocialLogin.initialize({
        google: {
          // iOSClientId: the iOS OAuth client ID from Google Cloud Console
          iOSClientId: '694850202109-s20crmd2atktq14hr6ji0uh11utuf4bj.apps.googleusercontent.com',
          // webClientId: web/Android OAuth client ID — required for Android idToken return
          webClientId: '694850202109-2t65brhnd8ce819s1rosqjvcc53ik1jn.apps.googleusercontent.com',
        },
      });
      const response = await SocialLogin.login({ provider: 'google', options: {} });
      const googleResult = response.result;
      // Narrow to online mode response (we don't use offline mode)
      if (googleResult.responseType !== 'online') {
        throw new Error("Unexpected Google response type: " + googleResult.responseType);
      }
      const idToken = googleResult.idToken;
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
        const pqr = localStorage.getItem("pending_qr");
        const dest = await getPostLoginRoute(res.data.user, pqr);
        const returnPath = new URLSearchParams(window.location.search).get('return');
        router.push(returnPath && dest === '/' ? returnPath : dest);
      } else {
        setError(res.error || "Google Sign-In failed");
      }
    } catch (err: any) {
      // USER_CANCELLED = user dismissed the Google picker — silent, no error shown.
      if (err?.code !== 'USER_CANCELLED') {
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

        // Attempt native credential save — fire-and-forget, never blocks navigation.
        try {
          const { Capacitor } = await import('@capacitor/core');
          const cp = Capacitor.getPlatform();
          if (cp === 'ios' || cp === 'android') {
            const { SavePassword } = await import('@capgo/capacitor-autofill-save-password');
            await SavePassword.promptDialog({ username: email, password, url: 'app.perkfinity.net' });
          }
        } catch { /* native save failed — proceed without saving */ }

        const pqr = localStorage.getItem('pending_qr');
        const navTarget = await getPostLoginRoute(res.data.user, pqr);
        const returnPath = new URLSearchParams(window.location.search).get('return');
        router.push(returnPath && navTarget === '/' ? returnPath : navTarget);

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

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  // Dynamic style helpers for Light/Dark mode
  const dynamicInputStyle = {
    ...inputStyle,
    background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
    border: isLight ? '1px solid rgba(15,23,42,0.18)' : '1px solid rgba(255,255,255,0.1)',
    color: isLight ? '#0F172A' : '#fff',
    boxShadow: isLight ? '0 2px 6px rgba(15,23,42,0.04)' : 'none',
  };

  const dynamicLineStyle = {
    ...lineStyle,
    background: isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.1)',
  };

  // Don't render anything until we know the platform (prevents flash on web)
  if (!platformLoaded) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      color: 'var(--text-main)',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        <img
          src={platform === 'android' ? "/app-icon.png" : "/assets/logo.png"}
          alt="Perkfinity Logo"
          style={{ width: '100%', maxWidth: platform === 'android' ? '64px' : '280px', margin: '0 auto 1.5rem', display: 'block', objectFit: 'contain', borderRadius: platform === 'android' ? '12px' : '0' }}
        />
        <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.6)', marginBottom: '2.5rem', textAlign: 'center', fontWeight: 600 }}>
          {method === "choice"
            ? "Choose how you'd like to sign in."
            : method === "login"
            ? "Sign in to your account."
            : method === "signup"
            ? "Create your account."
            : ""}
        </p>

        {method === "choice" ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Apple Sign-In — native iOS only */}
            {platform === 'ios' && (
              <button
                onClick={handleAppleSignIn}
                disabled={loading}
                style={btnStyle(isLight ? "#0F172A" : "#fff", isLight ? "#fff" : "#000")}
              >
                <span style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 384 512" width="18" height="18" fill="currentColor" style={{ flexShrink: 0, minWidth: '18px', display: 'block' }}>
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.1-44.6-35.9-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                </span>
                {loading ? "Signing in..." : "Sign in with Apple"}
              </button>
            )}

            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={btnStyle(isLight ? "#FFFFFF" : "#fff", isLight ? "#0F172A" : "#1a1a1a", isLight ? "1px solid rgba(15,23,42,0.18)" : "none")}
            >
              <span style={{ marginRight: '12px', fontWeight: 800, color: '#4285F4' }}>G</span>
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
              <div style={dynamicLineStyle} />
              <span style={{ padding: '0 1rem', color: isLight ? '#64748B' : 'rgba(255,255,255,0.3)', fontSize: '0.875rem', fontWeight: 700 }}>OR</span>
              <div style={dynamicLineStyle} />
            </div>
            <button onClick={() => setMethod("signup")} style={btnStyle(isLight ? "#6D28D9" : "rgba(255,255,255,0.1)", "#fff", "none")}>
              Sign Up with Email
            </button>
            <button onClick={() => setMethod("login")} style={{ ...btnStyle("transparent", isLight ? "#6D28D9" : "rgba(255,255,255,0.7)"), padding: '0.5rem', fontWeight: 700 }}>
              Already registered? Sign in
            </button>
          </div>

        ) : method === "forgot" ? (
          // ── Reset Password ─────────────────────────────────────
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {forgotSuccess ? (
              <>
                <div style={{
                  background: isLight ? '#DCFCE7' : 'rgba(107,193,122,0.12)',
                  border: isLight ? '1px solid #86EFAC' : '1px solid rgba(107,193,122,0.35)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✉️</div>
                  <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, color: isLight ? '#15803D' : '#86EFAC' }}>Check Your Email</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: isLight ? '#15803D' : 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    If an account exists for <strong style={{ color: isLight ? '#0F172A' : '#fff' }}>{email}</strong>, we&apos;ve sent a password reset link. Check your inbox and spam folder.
                  </p>
                </div>
                <button
                  onClick={() => { setMethod("login"); setError(""); setForgotSuccess(false); }}
                  style={btnStyle(isLight ? "#6D28D9" : "#8B5CF6", "#fff")}
                >
                  Back to Sign In
                </button>
              </>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1.25rem', color: isLight ? '#0F172A' : '#fff' }}>Reset Password</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>
                </div>
                {error && <div style={{ color: isLight ? '#DC2626' : '#FCA5A5', fontSize: '0.875rem', background: isLight ? '#FEE2E2' : 'rgba(252, 165, 165, 0.1)', padding: '12px', borderRadius: '8px', fontWeight: 600 }}>{error}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', color: isLight ? '#0F172A' : 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={dynamicInputStyle}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} style={btnStyle(isLight ? "#6D28D9" : "#8B5CF6", "#fff")}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod("login"); setError(""); }}
                  style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : 'rgba(255,255,255,0.5)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>

        ) : (
          // ── Login / Sign-Up ────────────────────────────────────
          <form onSubmit={handleAuthSubmit} action="#" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && <div style={{ color: isLight ? '#DC2626' : '#FCA5A5', fontSize: '0.875rem', background: isLight ? '#FEE2E2' : 'rgba(252, 165, 165, 0.1)', padding: '12px', borderRadius: '8px', fontWeight: 600 }}>{error}</div>}

            {/* Saved credentials chip */}
            {method === 'login' && hasSavedCred && (
              <button
                type="button"
                onClick={() => {
                  setEmail(hasSavedCred.u);
                  try { setPassword(atob(hasSavedCred.p)); } catch { setPassword(hasSavedCred.p); }
                  setHasSavedCred(null);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: isLight ? '#F3E8FF' : 'rgba(139,92,246,0.12)', border: isLight ? '1px solid #D8B4FE' : '1px solid rgba(139,92,246,0.4)',
                  borderRadius: '12px', padding: '12px 16px', color: isLight ? '#6D28D9' : '#C4B5FD',
                  fontSize: '0.875rem', cursor: 'pointer', width: '100%', textAlign: 'left'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>🔑</span>
                <div>
                  <div style={{ fontWeight: 700, color: isLight ? '#0F172A' : '#fff', fontSize: '0.875rem' }}>Use saved credentials</div>
                  <div style={{ fontSize: '0.75rem', color: isLight ? '#475569' : 'rgba(255,255,255,0.7)' }}>{hasSavedCred.u}</div>
                </div>
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: isLight ? '#0F172A' : 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={dynamicInputStyle}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
              <label style={{ fontSize: '0.875rem', color: isLight ? '#0F172A' : 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...dynamicInputStyle, paddingRight: '46px' }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '16px',
                    background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', opacity: 0.8
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {method === "signup" && password.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', marginTop: '-0.5rem', fontWeight: 600 }}>
                <span style={{ color: hasUpper ? (isLight ? '#15803D' : '#6BC17A') : (isLight ? '#DC2626' : '#FCA5A5') }}>{hasUpper ? '✓' : '✗'} One uppercase letter</span>
                <span style={{ color: hasLower ? (isLight ? '#15803D' : '#6BC17A') : (isLight ? '#DC2626' : '#FCA5A5') }}>{hasLower ? '✓' : '✗'} One lowercase letter</span>
                <span style={{ color: hasNum ? (isLight ? '#15803D' : '#6BC17A') : (isLight ? '#DC2626' : '#FCA5A5') }}>{hasNum ? '✓' : '✗'} One number</span>
                <span style={{ color: hasLength ? (isLight ? '#15803D' : '#6BC17A') : (isLight ? '#DC2626' : '#FCA5A5') }}>{hasLength ? '✓' : '✗'} At least 8 characters</span>
              </div>
            )}

            <button type="submit" disabled={loading} style={btnStyle(isLight ? "#6D28D9" : "#8B5CF6", "#fff")}>
              {loading ? "Please wait..." : method === "login" ? "Sign In" : "Create Account"}
            </button>
            {method === "login" && (
              <button
                type="button"
                onClick={() => { setMethod("forgot"); setError(""); setForgotSuccess(false); }}
                style={{ background: 'none', border: 'none', color: isLight ? '#6D28D9' : '#8B5CF6', fontSize: '0.875rem', cursor: 'pointer', marginTop: '-0.5rem', fontWeight: 700 }}
              >
                Forgot Password?
              </button>
            )}
            <button type="button" onClick={() => setMethod("choice")} style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : 'rgba(255,255,255,0.5)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
              Go Back
            </button>
          </form>
        )}
      </div>

      {(method === "choice" || method === "signup") && (
        <div style={{ padding: '0 1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: isLight ? '#475569' : 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', lineHeight: '1.4', margin: 0, fontWeight: 500 }}>
            <strong style={{color: isLight ? '#B45309' : '#FBBF24'}}>Note:</strong> Your account is not active until you finish setup. Incomplete accounts are deleted after 48 hours.
          </p>
        </div>
      )}
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: isLight ? '#64748B' : 'rgba(255,255,255,0.4)', paddingBottom: '1rem', fontWeight: 500 }}>
        By continuing, you agree to Perkfinity&apos;s <br/>
        <button
          onClick={() => window.open('https://www.perkfinity.net/terms-of-use.html', '_system')}
          style={{ background: 'none', border: 'none', padding: 0, color: isLight ? '#6D28D9' : 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
        >Terms of Use</button>
        {' '}and{' '}
        <button
          onClick={() => window.open('https://www.perkfinity.net/privacy-policy.html', '_system')}
          style={{ background: 'none', border: 'none', padding: 0, color: isLight ? '#6D28D9' : 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
        >Privacy Policy</button>.
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
