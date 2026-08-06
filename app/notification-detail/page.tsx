"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useTheme } from "../components/ThemeProvider";

interface OfferItem {
  store_name: string;
  logo_url: string | null;
  title: string;
  body: string | null;
  store_address: string | null;
  website: string | null;
  is_online_merchant: boolean;
  promo_code: string | null;
  campaign_id: string;
  merchant_id: string;
  offer_expires_at: string | null;
  disclaimer: string | null;
}

interface NotificationDetail {
  id: string;
  title: string;
  body: string | null;
  type: string;
  payload: OfferItem[];
  read: boolean;
  created_at: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  } else {
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
}

// Per-offer claim state
type ClaimState = 'idle' | 'loading' | 'revealed' | 'error';

interface OfferCardProps {
  offer: OfferItem;
  platform: 'ios' | 'android' | 'web';
  router: ReturnType<typeof useRouter>;
}

function OfferCard({ offer, platform, router }: OfferCardProps) {
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy Again');
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const isOnline = offer.is_online_merchant === true;
  const isMobile = !isOnline && offer.store_address === 'Mobile Business';

  const mapsUrl = offer.store_address && offer.store_address !== 'Mobile Business'
    ? platform === 'android'
      ? `https://maps.google.com/maps?q=${encodeURIComponent(offer.store_address)}`
      : `maps://maps.apple.com/?q=${encodeURIComponent(offer.store_address)}`
    : null;

  const handleReveal = async () => {
    setClaimState('loading');
    try {
      const json = await fetchApi('/redemptions/claim', {
        method: 'POST',
        body: JSON.stringify({ campaign_id: offer.campaign_id }),
      });
      const code = json.data?.promo_code || offer.promo_code || '';
      setRevealedCode(code);
      setClaimState('revealed');
      try {
        await navigator.clipboard.writeText(code);
      } catch { /* ignore */ }
    } catch {
      setClaimState('error');
    }
  };

  const handleCopyAgain = async () => {
    if (!revealedCode) return;
    try {
      await navigator.clipboard.writeText(revealedCode);
      setCopyLabel('Copied! ✓');
      setTimeout(() => setCopyLabel('Copy Again'), 2500);
    } catch { /* ignore */ }
  };

  const cardBg = isLight
    ? (isOnline ? '#F5F3FF' : '#FFFFFF')
    : 'rgba(255,255,255,0.04)';

  const cardBorder = isLight
    ? (isOnline ? '1px solid rgba(109,40,217,0.3)' : '1px solid rgba(15,23,42,0.12)')
    : (isOnline ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(255,255,255,0.1)');

  return (
    <div style={{
      padding: "1rem 1.25rem",
      background: cardBg,
      border: cardBorder,
      borderRadius: "18px",
      display: "flex",
      alignItems: "flex-start",
      gap: "0.75rem",
      boxShadow: isLight ? "0 4px 14px rgba(15,23,42,0.05)" : "none",
    }}>
      {/* Logo */}
      <div style={{
        width: "44px", height: "44px", borderRadius: "50%",
        background: isLight ? '#EDE9FE' : 'rgba(139,92,246,0.2)',
        border: isLight ? '1px solid #DDD6FE' : '1px solid rgba(139,92,246,0.4)',
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", flexShrink: 0,
      }}>
        {offer.logo_url ? (
          <img src={offer.logo_url} alt={offer.store_name}
            style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: "1.2rem" }}>{isOnline ? '🌐' : '🏪'}</span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: "0.9rem", color: isLight ? "#0F172A" : "#fff", marginBottom: "2px" }}>
          {offer.store_name}
        </div>
        <div style={{ fontSize: "0.8rem", color: isLight ? "#334155" : "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
          {offer.title}
        </div>

        {/* Address / Website */}
        {offer.website && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              const url = offer.website!.startsWith('http') ? offer.website! : `https://${offer.website}`;
              window.open(url, '_blank');
            }}
            style={{ cursor: "pointer", fontSize: "0.75rem", color: isLight ? "#6D28D9" : "#8B5CF6", marginTop: "4px", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}
          >
            🌐 {offer.website.replace(/^https?:\/\//, '')}
          </div>
        )}
        {offer.store_address && offer.store_address !== 'Mobile Business' ? (
          <div
            onClick={(e) => { e.stopPropagation(); if (mapsUrl) window.open(mapsUrl, '_blank'); }}
            style={{ cursor: "pointer", fontSize: "0.75rem", color: isLight ? "#6D28D9" : "#8B5CF6", marginTop: "4px", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}
          >
            📍 {offer.store_address}
          </div>
        ) : offer.store_address === 'Mobile Business' ? (
          <div style={{ fontSize: "0.75rem", color: isLight ? "#475569" : "rgba(255,255,255,0.35)", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
            🚐 Mobile Business
          </div>
        ) : null}

        {offer.disclaimer && (
          <div style={{ fontSize: "0.7rem", color: isLight ? "#64748B" : "rgba(255,255,255,0.35)", marginTop: "4px", fontStyle: "italic", lineHeight: 1.3 }}>
            {offer.disclaimer}
          </div>
        )}

        {/* Revealed code block */}
        {claimState === 'revealed' && revealedCode && (
          <div style={{ marginTop: "10px", padding: "10px 12px", background: isLight ? "#F3E8FF" : "rgba(139,92,246,0.15)", border: isLight ? "1px solid #D8B4FE" : "1px solid rgba(139,92,246,0.4)", borderRadius: "10px" }}>
            <div style={{ fontSize: "0.65rem", color: isLight ? "#475569" : "rgba(255,255,255,0.5)", marginBottom: "4px", fontWeight: 700 }}>YOUR DISCOUNT CODE</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: isLight ? "#6D28D9" : "#C4B5FD", fontFamily: "monospace", letterSpacing: "2px" }}>{revealedCode}</div>
            <div style={{ fontSize: "0.65rem", color: isLight ? "#64748B" : "rgba(255,255,255,0.4)", marginTop: "2px" }}>Auto-copied to clipboard ✓</div>
            <button
              onClick={handleCopyAgain}
              style={{ marginTop: "8px", padding: "5px 14px", background: isLight ? "#6D28D9" : "rgba(139,92,246,0.3)", border: "none", borderRadius: "8px", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
            >
              {copyLabel}
            </button>
          </div>
        )}

        {claimState === 'error' && (
          <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "#DC2626" }}>
            Failed to reveal code. Please try again.
          </div>
        )}
      </div>

      {/* Right action button */}
      {isOnline ? (
        // Online: Reveal Code button (or claimed state)
        claimState === 'revealed' ? (
          <div style={{
            padding: "8px 10px", background: isLight ? "#F3E8FF" : "rgba(139,92,246,0.15)", borderRadius: "8px",
            color: isLight ? "#6D28D9" : "#A78BFA", fontSize: "0.7rem", fontWeight: 700, textAlign: "center",
            lineHeight: 1.35, flexShrink: 0, maxWidth: "90px", border: isLight ? "1px solid #D8B4FE" : "none"
          }}>
            ✓ Claimed
          </div>
        ) : (
          <button
            onClick={handleReveal}
            disabled={claimState === 'loading'}
            style={{
              padding: "8px 10px",
              background: claimState === 'loading' ? (isLight ? "#E2E8F0" : "rgba(139,92,246,0.1)") : "linear-gradient(135deg, #6D28D9, #4C1D95)",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "0.7rem",
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.35,
              flexShrink: 0,
              maxWidth: "90px",
              cursor: claimState === 'loading' ? "default" : "pointer",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            {claimState === 'loading' ? '...' : '🛍️ Tap to Reveal Code'}
          </button>
        )
      ) : (
        // Physical/Mobile: navigate to scan tab
        <button
          onClick={() => router.push('/scan')}
          style={{
            padding: "8px 12px",
            background: isLight ? "#DCFCE7" : "#E8FAEB",
            border: isLight ? "1px solid #86EFAC" : "none",
            borderRadius: "8px",
            color: isLight ? "#15803D" : "#1E5E34",
            fontSize: "0.75rem",
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.35,
            flexShrink: 0,
            maxWidth: "110px",
            cursor: "pointer",
            fontFamily: "Outfit, sans-serif",
          }}
        >
          {isMobile ? 'Scan QR when you find us' : 'Scan the QR code in store to unlock it'}
        </button>
      )}
    </div>
  );
}

function NotificationDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notifId = searchParams.get("id");
  const [notif, setNotif] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('ios');

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      setPlatform(Capacitor.getPlatform() as 'ios' | 'android' | 'web');
    }).catch(() => setPlatform('web'));

    const token = localStorage.getItem("pf_user_token");
    if (!token) { router.push("/auth"); return; }
    if (!notifId) { router.push("/history?tab=notifications"); return; }

    fetchApi("/consumers/notifications")
      .then((json) => {
        if (json.success && json.data) {
          const found = json.data.find((n: NotificationDetail) => n.id === notifId);
          if (found) {
            setNotif(found);
            if (!found.read) {
              fetchApi("/consumers/notifications/read", {
                method: "POST",
                body: JSON.stringify({ id: notifId }),
              }).catch(() => {});
            }
          } else {
            setError("Notification not found");
          }
        }
      })
      .catch(() => setError("Failed to load notification"))
      .finally(() => setLoading(false));
  }, [notifId, router]);

  const emoji = notif?.type === "digest" ? "🎉" : "🔔";
  const offers: OfferItem[] = notif?.payload || [];
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-gradient)",
      fontFamily: "Outfit, sans-serif",
      color: "var(--text-main)",
      padding: "var(--safe-top, 44px) 1.5rem 10rem",
    }}>
      {/* Back button */}
      <button
        onClick={() => router.push("/history?tab=notifications")}
        style={{
          background: "none", border: "none", color: isLight ? "#6D28D9" : "#8B5CF6",
          fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
          padding: "0", marginBottom: "1.5rem", display: "flex",
          alignItems: "center", gap: "0.3rem",
        }}
      >
        ← History
      </button>

      {loading && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Loading...</p>
      )}

      {error && (
        <p style={{ color: "#EF4444", fontSize: "0.9rem" }}>{error}</p>
      )}

      {notif && (
        <>
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.3rem", lineHeight: 1.2 }}>
              {emoji} {notif.title}
            </h1>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
              {formatDate(notif.created_at)}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            height: "1px",
            background: "rgba(255,255,255,0.08)",
            marginBottom: "1.25rem",
          }} />

          {/* Body text */}
          {offers.length > 1 && (
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", marginTop: 0, marginBottom: "1.25rem" }}>
              {offers.length} new perks from your local stores
            </p>
          )}

          {/* Offer cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {offers.map((offer, i) => (
              <OfferCard key={i} offer={offer} platform={platform} router={router} />
            ))}
          </div>

          {/* Empty state for single notifications without payload */}
          {offers.length === 0 && notif.body && (
            <div style={{
              padding: "1.5rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "18px",
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.5,
            }}>
              {notif.body}
            </div>
          )}
        </>
      )}

      <style>{`
        body { background-color: #0F172A; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

export default function NotificationDetailPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)",
        fontFamily: "Outfit, sans-serif",
        color: "#fff",
        padding: "2rem 1.5rem",
      }}>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading...</p>
      </div>
    }>
      <NotificationDetailContent />
    </Suspense>
  );
}
