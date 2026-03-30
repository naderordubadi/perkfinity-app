"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [state, setState] = useState<"confirm" | "deleting" | "done" | "error">("confirm");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    setState("deleting");
    try {
      await fetchApi("/consumers/account", { method: "DELETE" });
      setState("done");

      // Clear ALL localStorage so the user gets the fresh onboarding experience
      localStorage.clear();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete account. Please try again.");
      setState("error");
    }
  };

  const handleReturnHome = () => {
    // Navigate to onboarding (fresh download experience with 3 banners)
    // localStorage is already cleared, so / will redirect to /onboarding
    window.location.href = "/";
  };

  // ── SUCCESS STATE ──────────────────────────────────────────────────
  if (state === "done") {
    return (
      <div style={styles.page}>
        {/* Green checkmark */}
        <div style={{
          width: '100px', height: '100px', borderRadius: '28px',
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '3rem', boxShadow: '0 0 40px rgba(34,197,94,0.2)',
        }}>
          ✅
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={styles.heading}>Account Deleted</h1>
          <p style={styles.body}>
            You are more than welcome to come back and create a brand new account at any time.
          </p>
        </div>

        <button onClick={handleReturnHome} style={styles.primaryBtn}>
          Return to Home Page
        </button>
      </div>
    );
  }

  // ── CONFIRM / ERROR STATE ────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Back link */}
      <div style={{ alignSelf: 'flex-start', width: '100%', maxWidth: '340px' }}>
        <a
          onClick={(e) => { e.preventDefault(); router.back(); }}
          href="#"
          style={{ color: '#8B5CF6', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 600 }}
        >
          ← Profile
        </a>
      </div>

      {/* Warning icon */}
      <div style={{
        width: '100px', height: '100px', borderRadius: '28px',
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '3rem', boxShadow: '0 0 30px rgba(239,68,68,0.1)',
      }}>
        ⚠️
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={styles.heading}>Delete Your Account?</h1>
        <p style={{ ...styles.body, fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
          We&apos;re sorry to see you go.
        </p>
        <p style={{ ...styles.body, color: 'rgba(255,255,255,0.45)' }}>
          This action is permanent and cannot be undone.
        </p>
      </div>

      {/* Deletion details card */}
      <div style={{
        padding: '1.25rem 1.25rem',
        background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '16px',
        maxWidth: '320px',
        width: '100%',
      }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>
          The following will be permanently deleted:
        </p>
        <ul style={{
          margin: 0, paddingLeft: '1.25rem',
          fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.8, listStyleType: 'disc',
        }}>
          <li>Your personal information (name, email, phone, city, and zip code)</li>
          <li>All merchant connections and member lists</li>
          <li>Your offer and redemption history</li>
          <li>All notification history</li>
          <li>Push notification delivery</li>
          <li style={{ color: '#FCA5A5', fontWeight: 600 }}>
            You will need to create a new account and start over if you want to come back
          </li>
        </ul>
      </div>

      {/* Error message */}
      {state === "error" && (
        <div style={{
          padding: '12px 16px', background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px',
          color: '#FCA5A5', fontSize: '0.85rem', textAlign: 'center', maxWidth: '320px', width: '100%',
        }}>
          {errorMsg}
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={state === "deleting"}
        style={{
          ...styles.deleteBtn,
          opacity: state === "deleting" ? 0.6 : 1,
          cursor: state === "deleting" ? 'not-allowed' : 'pointer',
        }}
      >
        {state === "deleting" ? "Deleting..." : "Delete My Account"}
      </button>

      {/* Cancel */}
      <a
        onClick={(e) => { e.preventDefault(); router.back(); }}
        href="#"
        style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textDecoration: 'none' }}
      >
        Cancel
      </a>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: 'Outfit, sans-serif',
    color: '#fff',
    gap: '1.25rem',
  },
  heading: {
    margin: '0 0 0.5rem',
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  body: {
    margin: 0,
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    maxWidth: '280px',
  },
  primaryBtn: {
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    border: 'none',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(109,40,217,0.4)',
    width: '100%',
    maxWidth: '320px',
  },
  deleteBtn: {
    padding: '1rem 2rem',
    background: '#EF4444',
    border: 'none',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    width: '100%',
    maxWidth: '320px',
    boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
  },
};
