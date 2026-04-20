"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

interface OfferItem {
  store_name: string;
  logo_url: string | null;
  title: string;
  body: string | null;
  store_address: string | null;
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)",
      fontFamily: "Outfit, sans-serif",
      color: "#fff",
      padding: "var(--safe-top, 44px) 1.5rem 10rem",
    }}>
      {/* Back button */}
      <button
        onClick={() => router.push("/history?tab=notifications")}
        style={{
          background: "none", border: "none", color: "#8B5CF6",
          fontSize: "0.9rem", fontWeight: 600, cursor: "pointer",
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
              <div key={i} style={{
                padding: "1rem 1.25rem",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}>
                {/* Logo */}
                <div style={{
                  width: "44px", height: "44px", borderRadius: "50%",
                  background: "rgba(139,92,246,0.2)",
                  border: "1px solid rgba(139,92,246,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0,
                }}>
                  {offer.logo_url ? (
                    <img src={offer.logo_url} alt={offer.store_name}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: "1.2rem" }}>🏪</span>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff", marginBottom: "2px" }}>
                    {offer.store_name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                    {offer.title}
                  </div>
                  {offer.store_address && (() => {
                    const mapsUrl = platform === 'android'
                      ? `https://maps.google.com/maps?q=${encodeURIComponent(offer.store_address)}`
                      : `maps://maps.apple.com/?q=${encodeURIComponent(offer.store_address)}`;
                    return (
                      <div 
                        onClick={(e) => { e.stopPropagation(); window.open(mapsUrl, '_blank'); }}
                        style={{ cursor: "pointer", fontSize: "0.75rem", color: "#8B5CF6", marginTop: "4px", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px" }}
                      >
                        📍 {offer.store_address}
                      </div>
                    );
                  })()}
                  {offer.disclaimer && (
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: "4px", fontStyle: "italic", lineHeight: 1.3 }}>
                      {offer.disclaimer}
                    </div>
                  )}
                </div>

                {/* Scan instruction note */}
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#E8FAEB",
                    borderRadius: "8px",
                    color: "#1E5E34",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.35,
                    flexShrink: 0,
                    maxWidth: "110px",
                  }}
                >
                  Scan the QR code in store to unlock it
                </div>
              </div>
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
