"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

export default function BottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Determine whether to hide the nav based on actual user state.
  // Rules:
  //  - Not logged in → always show nav (user needs to get back to /auth)
  //  - /permissions → hide when logged in (only reachable via the gate, never via a nav tab)
  //  - /profile → hide ONLY when profile is incomplete (gate flow).
  //              When complete, user is freely editing → show nav.
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('pf_user_token');
  let isHidden = false;
  if (isLoggedIn) {
    if (pathname.startsWith('/permissions')) {
      isHidden = true;
    } else if (pathname.startsWith('/profile')) {
      try {
        const raw = localStorage.getItem('pf_user_data');
        const u = raw ? JSON.parse(raw) : null;
        isHidden = !u?.full_name || !u?.phone_number || !u?.city || !u?.zip_code;
      } catch { isHidden = false; }
    }
  }

  // Poll unread notification count — hooks must run unconditionally,
  // but we skip the actual fetch when the nav is hidden.
  useEffect(() => {
    if (isHidden) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('pf_user_token') : null;
    if (!token) return;

    const checkUnread = () => {
      fetchApi('/consumers/notifications')
        .then((json) => {
          if (json.success) setUnreadCount(json.unread_count || 0);
        })
        .catch(() => {});
    };

    checkUnread();
    const interval = setInterval(checkUnread, 60000);
    return () => clearInterval(interval);
  }, [pathname, isHidden]);

  // Early return AFTER all hooks (Rules of Hooks requirement).
  if (isHidden) return null;

  const tabs = [
    {
      href: "/",
      label: "Home",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
      match: (p: string) => p === "/",
    },
    {
      href: "/scan",
      label: "Scan",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24">
          <path d="M4 4h7v7H4zm2 2v3h3V6zm5 11h3v3h-3zM4 13h7v7H4zm2 2v3h3v-3zm7-11h7v7h-7zm2 2v3h3V6zm-2 7h3v3h-3zm3 3h3v3h-3zm3-3h3v3h-3zm0 6h3v3h-3z" />
        </svg>
      ),
      match: (p: string) => p.startsWith("/scan"),
    },
    {
      href: "/history",
      label: "History",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24">
          <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
        </svg>
      ),
      match: (p: string) => p.startsWith("/history") || p.startsWith("/notifications"),
      badge: true,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
      ),
      match: (p: string) => p.startsWith("/profile"),
    },
  ];

  return (
    <nav className="glass-nav">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`nav-item${tab.match(pathname) ? " active" : ""}`}
          style={{ position: "relative" }}
        >
          {tab.icon}
          {'badge' in tab && tab.badge && unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: "2px",
              right: "50%",
              transform: "translateX(12px)",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#EF4444",
              border: "2px solid rgba(15,23,42,0.9)",
            }} />
          )}
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
