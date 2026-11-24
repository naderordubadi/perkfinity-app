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
    let platform = "web";
    let cancelled = false;

    const applyInsets = () => {
      if (cancelled || typeof window === "undefined") return;
      const isLandscape = window.innerWidth > window.innerHeight;

      if (platform === "android") {
        // On Android the WebView typically sits below the status bar
        // (no overlaysWebView), so env(safe-area-inset-top) = 0.
        const androidStatusBarHeight = isLandscape ? 20 : 32;
        document.documentElement.style.setProperty(
          "--safe-top",
          `${androidStatusBarHeight}px`
        );
      } else if (platform === "ios") {
        // In portrait, iPhones have notch/Dynamic Island at top (fallback 44px).
        // In landscape, Dynamic Island is on the side (--safe-left/--safe-right) and top inset is 0.
        document.documentElement.style.setProperty(
          "--safe-top",
          isLandscape
            ? "max(env(safe-area-inset-top, 0px), 10px)"
            : "max(env(safe-area-inset-top, 44px), 44px)"
        );
      } else {
        document.documentElement.style.setProperty("--safe-top", "16px");
      }

      document.documentElement.style.setProperty(
        "--safe-left",
        "env(safe-area-inset-left, 0px)"
      );
      document.documentElement.style.setProperty(
        "--safe-right",
        "env(safe-area-inset-right, 0px)"
      );
      document.documentElement.style.setProperty(
        "--safe-bottom",
        "env(safe-area-inset-bottom, 0px)"
      );
    };

    const init = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        platform = Capacitor.getPlatform();
      } catch {
        platform = "web";
      }
      applyInsets();
    };

    init();
    window.addEventListener("resize", applyInsets);
    window.addEventListener("orientationchange", applyInsets);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", applyInsets);
      window.removeEventListener("orientationchange", applyInsets);
    };
  }, []);

  return null;
}
