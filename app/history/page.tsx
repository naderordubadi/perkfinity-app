"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

interface HistoryItem {
  id: string;
  token: string;
  issued_at: string;
  expires_at: string;
  redeemed: boolean;
  redeemed_at: string | null;
  campaign_title: string;
  merchant_name: string;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatus(item: HistoryItem): "Redeemed" | "Expired" {
  if (item.redeemed) return "Redeemed";
  return "Expired";
}

function getStatusTimestamp(item: HistoryItem): string {
  if (item.redeemed && item.redeemed_at) return formatTimestamp(item.redeemed_at);
  return formatTimestamp(item.expires_at);
}

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("pf_user_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    fetchApi('/consumers/history')
      .then((json) => {
        if (json.success) {
          // Only show entries that are redeemed OR expired (expires_at is in the past)
          const now = new Date();
          const finished = (json.data as HistoryItem[]).filter(
            (item) => item.redeemed || new Date(item.expires_at) < now
          );
          setItems(finished);
        } else {
          setError(json.error || "Failed to load history");
        }
      })
      .catch(() => setError("Network error loading history"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)",
      fontFamily: "Outfit, sans-serif",
      color: "#fff",
      padding: "2rem 1.5rem 10rem",
    }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.25rem" }}>History</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 0, marginBottom: "1.5rem" }}>
        Your past redeemed or expired perks will appear here.
      </p>

      {loading && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Loading...</p>
      )}

      {!loading && error && (
        <p style={{ color: "#EF4444", fontSize: "0.9rem" }}>{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{
          padding: "2rem",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          textAlign: "center",
          color: "rgba(255,255,255,0.35)",
          fontSize: "0.9rem",
        }}>
          Your past redeemed or expired perks will appear here.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.map((item) => {
          const status = getStatus(item);
          const isRedeemed = status === "Redeemed";
          return (
            <div key={item.id} style={{
              padding: "1rem 1.25rem",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${isRedeemed ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}`,
              borderRadius: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>
                  {item.merchant_name}
                </span>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: "20px",
                  background: isRedeemed ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  border: `1px solid ${isRedeemed ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                  color: isRedeemed ? "#10B981" : "#EF4444",
                }}>
                  {isRedeemed ? "✅ Redeemed" : "⏰ Expired"}
                </span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
                {item.campaign_title}
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                {isRedeemed ? "Redeemed" : "Expired"}: {getStatusTimestamp(item)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
