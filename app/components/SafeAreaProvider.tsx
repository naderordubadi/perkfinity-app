"use client";

/**
 * SafeAreaProvider
 *
 * Sets --safe-top on :root so every page can use it as a reliable top inset.
 *
 * Strategy:
 *  1. Default: CSS env(safe-area-inset-top) works well on iOS.
 *  2. Android: env(safe-area-inset-top) often resolves to 0 when
 *     @capacitor/status-bar is not configured with overlaysWebView:true.
 *     We detect Android via Capacitor and apply a safe fallback (32px).
 *  3. Web: use env() directly.
 *
 * This component renders nothing — it just runs the side effect once.
 */
import { useEffect } from "react";

export default function SafeAreaProvider() {
  useEffect(() => {
    const setInsets = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        const platform = Capacitor.getPlatform();

        if (platform === "android") {
          // On Android the WebView typically sits below the status bar
          // (no overlaysWebView), so env(safe-area-inset-top) = 0.
          // Samsung Galaxy status bars are 24-28px; 32px is a safe universal
          // fallback that prevents any clipping on any Android device.
          const androidStatusBarHeight = 32;
          document.documentElement.style.setProperty(
            "--safe-top",
            `${androidStatusBarHeight}px`
          );
        } else if (platform === "ios") {
          // iOS exposes env(safe-area-inset-top) correctly via viewport-fit=cover
          // Fall back to 44px if it ever resolves to 0 (older devices / no notch).
          const iosDefault = 44;
          document.documentElement.style.setProperty(
            "--safe-top",
            `max(env(safe-area-inset-top, ${iosDefault}px), ${iosDefault}px)`
          );
        } else {
          // Web — no status bar; a small padding for visual breathing room.
          document.documentElement.style.setProperty("--safe-top", "16px");
        }
      } catch {
        // Capacitor not available (pure web build) — use CSS env() fallback.
        document.documentElement.style.setProperty(
          "--safe-top",
          "env(safe-area-inset-top, 16px)"
        );
      }
    };

    setInsets();
  }, []);

  return null;
}
