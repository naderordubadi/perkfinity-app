"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  payload: Array<{ store_name: string; logo_url: string | null; title: string }>;
  read: boolean;
  created_at: string;
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

function formatNotifDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "notifications" ? "notifications" : "perks";
  const [activeTab, setActiveTab] = useState<"perks" | "notifications">(initialTab);

  // Perk History state
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState("");

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifError, setNotifError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("pf_user_token");
    if (!token) { router.push("/auth"); return; }

    // Fetch perk history
    fetchApi('/consumers/history')
      .then((json) => {
        if (json.success) {
          const now = new Date();
          const finished = (json.data as HistoryItem[]).filter(
            (item) => item.redeemed || new Date(item.expires_at) < now
          );
          setItems(finished);
        } else {
          setHistError(json.error || "Failed to load history");
        }
      })
      .catch(() => setHistError("Network error loading history"))
      .finally(() => setHistLoading(false));

    // Fetch notifications
    fetchApi('/consumers/notifications')
      .then((json) => {
        if (json.success) {
          setNotifications(json.data || []);
          setUnreadCount(json.unread_count || 0);
        } else {
          setNotifError(json.error || "Failed to load notifications");
        }
      })
      .catch(() => setNotifError("Network error loading notifications"))
      .finally(() => setNotifLoading(false));
  }, [router]);

  const handleMarkAllRead = async () => {
    try {
      await fetchApi('/consumers/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      // Clear app icon badge on native
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Badge } = await import('@capawesome/capacitor-badge');
          await Badge.clear();
        }
      } catch { /* ignore in web */ }
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleNotifTap = (notif: NotificationItem) => {
    // Mark as read locally
    if (!notif.read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    router.push(`/notification-detail?id=${notif.id}`);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%)",
      fontFamily: "Outfit, sans-serif",
      color: "#fff",
      padding: "max(env(safe-area-inset-top, 44px), 44px) 1.5rem 10rem",
    }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.25rem" }}>History</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 0, marginBottom: "1.25rem" }}>
        Your past redeemed or expired perks and notifications.
      </p>

      {/* Tab Toggle */}
      <div style={{
        display: "flex",
        gap: "0",
        marginBottom: "1.25rem",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <button
          onClick={() => setActiveTab("perks")}
          style={{
            flex: 1,
            padding: "0.75rem 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "perks" ? "2px solid #8B5CF6" : "2px solid transparent",
            color: activeTab === "perks" ? "#fff" : "rgba(255,255,255,0.4)",
            fontSize: "0.9rem",
            fontWeight: activeTab === "perks" ? 700 : 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Perk History
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          style={{
            flex: 1,
            padding: "0.75rem 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "notifications" ? "2px solid #8B5CF6" : "2px solid transparent",
            color: activeTab === "notifications" ? "#fff" : "rgba(255,255,255,0.4)",
            fontSize: "0.9rem",
            fontWeight: activeTab === "notifications" ? 700 : 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
            position: "relative",
          }}
        >
          Notifications
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: "8px",
              marginLeft: "4px",
              background: "#EF4444",
              color: "#fff",
              fontSize: "0.6rem",
              fontWeight: 800,
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ═══ PERK HISTORY TAB ═══ */}
      {activeTab === "perks" && (
        <>
          {histLoading && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Loading...</p>
          )}

          {!histLoading && histError && (
            <p style={{ color: "#EF4444", fontSize: "0.9rem" }}>{histError}</p>
          )}

          {!histLoading && !histError && items.length === 0 && (
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
        </>
      )}

      {/* ═══ NOTIFICATIONS TAB ═══ */}
      {activeTab === "notifications" && (
        <>
          {/* Mark All Read */}
          {unreadCount > 0 && (
            <div style={{ textAlign: "right", marginBottom: "0.75rem" }}>
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8B5CF6",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Mark All Read
              </button>
            </div>
          )}

          {notifLoading && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Loading...</p>
          )}

          {!notifLoading && notifError && (
            <p style={{ color: "#EF4444", fontSize: "0.9rem" }}>{notifError}</p>
          )}

          {!notifLoading && !notifError && notifications.length === 0 && (
            <div style={{
              padding: "2rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              fontSize: "0.9rem",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔔</div>
              No notifications yet. When merchants near you create new offers, you&apos;ll see them here.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {notifications.map((notif) => {
              const emoji = notif.type === "digest" ? "🎉" : "🔔";
              const previewText = notif.payload && notif.payload.length > 0
                ? notif.payload.map(p => p.store_name).join(", ")
                : notif.body || "";
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotifTap(notif)}
                  style={{
                    padding: "0.9rem 1rem",
                    background: notif.read ? "rgba(255,255,255,0.03)" : "rgba(139,92,246,0.06)",
                    border: notif.read ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(139,92,246,0.2)",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                >
                  {/* Unread dot */}
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: notif.read ? "transparent" : "#3B82F6",
                    flexShrink: 0,
                  }} />

                  {/* Logo / emoji */}
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "rgba(139,92,246,0.15)",
                    border: "1px solid rgba(139,92,246,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}>
                    {notif.payload && notif.payload.length === 1 && notif.payload[0].logo_url ? (
                      <img src={notif.payload[0].logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      emoji
                    )}
                  </div>

                  {/* Text content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: notif.read ? 600 : 700,
                      fontSize: "0.88rem",
                      color: "#fff",
                      marginBottom: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {notif.title}
                    </div>
                    <div style={{
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.45)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {previewText}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.3)",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}>
                    {formatNotifDate(notif.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        body { background-color: #0F172A; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default function History() {
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
      <HistoryContent />
    </Suspense>
  );
}
