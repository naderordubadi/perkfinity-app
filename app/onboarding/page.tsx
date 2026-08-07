"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserToken } from "@/lib/user";
import { useTheme } from "../components/ThemeProvider";

const getSteps = (platform: string, isLight: boolean = false) => [
  {
    id: "privacy",
    title: "Privacy-First",
    subtitle: "Your data, protected always",
    description: "Your personal information is encrypted and never shared with merchants. They only see anonymized, ZIP-code level stats.",
    highlight: "Your personal info stays 100% private",
    highlightIcon: "🛡️",
    accentColor: isLight ? "#15803D" : "#6BC17A",
    gradientFrom: "#0F172A",
    gradientTo: "#162032",
    illustration: (
      <svg viewBox="0 0 240 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="120" cy="110" r="90" fill="url(#privacyGlow)" opacity={isLight ? 0.25 : 0.15} />
        <circle cx="120" cy="110" r="75" stroke={isLight ? "#15803D" : "#6BC17A"} strokeWidth="1" strokeDasharray="8 4" opacity={isLight ? 0.7 : 0.4} />
        <path d="M120 45 L160 62 L160 100 C160 128 140 150 120 158 C100 150 80 128 80 100 L80 62 Z" fill="url(#shieldGrad)" stroke={isLight ? "#15803D" : "#6BC17A"} strokeWidth="1.5" />
        <path d="M120 57 L148 70 L148 100 C148 120 136 136 120 143 C104 136 92 120 92 100 L92 70 Z" fill={isLight ? "rgba(21,128,61,0.2)" : "rgba(107,193,122,0.15)"} />
        <path d="M106 102 L116 114 L136 90" stroke={isLight ? "#4ADE80" : "#6BC17A"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="20" y="65" width="48" height="22" rx="11" fill={isLight ? "#DCFCE7" : "rgba(107,193,122,0.15)"} stroke={isLight ? "#86EFAC" : "rgba(107,193,122,0.4)"} strokeWidth="1" />
        <circle cx="31" cy="76" r="5" fill={isLight ? "#15803D" : "#6BC17A"} opacity="0.9" />
        <rect x="38" y="72" width="22" height="3" rx="1.5" fill={isLight ? "#15803D" : "rgba(255,255,255,0.3)"} />
        <rect x="38" y="77" width="16" height="2" rx="1" fill={isLight ? "#166534" : "rgba(255,255,255,0.15)"} />
        <rect x="172" y="55" width="48" height="22" rx="11" fill={isLight ? "#F3E8FF" : "rgba(91,63,165,0.25)"} stroke={isLight ? "#D8B4FE" : "rgba(139,92,246,0.4)"} strokeWidth="1" />
        <circle cx="183" cy="66" r="5" fill={isLight ? "#6D28D9" : "#8B5CF6"} opacity="0.9" />
        <rect x="190" y="62" width="22" height="3" rx="1.5" fill={isLight ? "#6D28D9" : "rgba(255,255,255,0.3)"} />
        <rect x="190" y="67" width="16" height="2" rx="1" fill={isLight ? "#5B21B6" : "rgba(255,255,255,0.15)"} />
        <rect x="30" y="140" width="52" height="22" rx="11" fill={isLight ? "#F3E8FF" : "rgba(91,63,165,0.2)"} stroke={isLight ? "#D8B4FE" : "rgba(139,92,246,0.35)"} strokeWidth="1" />
        <circle cx="42" cy="151" r="5" fill={isLight ? "#6D28D9" : "#8B5CF6"} opacity="0.8" />
        <rect x="50" y="147" width="24" height="3" rx="1.5" fill={isLight ? "#6D28D9" : "rgba(255,255,255,0.25)"} />
        <rect x="50" y="152" width="18" height="2" rx="1" fill={isLight ? "#5B21B6" : "rgba(255,255,255,0.12)"} />
        <circle cx="68" cy="148" r="14" fill={isLight ? "#FFFFFF" : "rgba(15,23,42,0.8)"} stroke={isLight ? "#15803D" : "rgba(107,193,122,0.5)"} strokeWidth="1.5" />
        <path d="M64 148 a4 4 0 0 1 8 0" stroke={isLight ? "#15803D" : "#6BC17A"} strokeWidth="2" fill="none" />
        <rect x="62" y="148" width="8" height="6" rx="1.5" fill={isLight ? "#15803D" : "#6BC17A"} opacity="0.9" />
        <circle cx="175" cy="140" r="14" fill={isLight ? "#FFFFFF" : "rgba(15,23,42,0.8)"} stroke={isLight ? "#6D28D9" : "rgba(139,92,246,0.5)"} strokeWidth="1.5" />
        <path d="M171 140 a4 4 0 0 1 8 0" stroke={isLight ? "#6D28D9" : "#8B5CF6"} strokeWidth="2" fill="none" />
        <rect x="169" y="140" width="8" height="6" rx="1.5" fill={isLight ? "#6D28D9" : "#8B5CF6"} opacity="0.9" />
        <line x1="68" y1="134" x2="92" y2="110" stroke={isLight ? "#15803D" : "rgba(107,193,122,0.25)"} strokeWidth="1" strokeDasharray="4 3" />
        <line x1="175" y1="126" x2="152" y2="106" stroke={isLight ? "#6D28D9" : "rgba(139,92,246,0.25)"} strokeWidth="1" strokeDasharray="4 3" />
        <defs>
          <radialGradient id="privacyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isLight ? "#15803D" : "#6BC17A"} />
            <stop offset="100%" stopColor={isLight ? "#FFFFFF" : "#0F172A"} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="shieldGrad" x1="120" y1="45" x2="120" y2="158" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isLight ? "#166534" : "#1E3A5F"} />
            <stop offset="100%" stopColor={isLight ? "#15803D" : "#0F2340"} />
          </linearGradient>
        </defs>
      </svg>
    )
  },
  {
    id: "easy",
    title: "Redeem Instantly",
    subtitle: "Scan. Show. Save.",
    description: "No plastic cards or loyalty punch cards. Just scan the QR code at any participating store and instantly receive your discount — applied right at checkout.",
    highlight: "Works on all local participating stores instantly",
    highlightIcon: "⚡",
    accentColor: isLight ? "#6D28D9" : "#8B5CF6",
    gradientFrom: "#0F172A",
    gradientTo: "#1A1040",
    illustration: (
      <svg viewBox="0 0 240 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="120" cy="110" r="85" fill="url(#redeemGlow)" opacity={isLight ? 0.25 : 0.12} />
        {/* Phone outer */}
        <rect x="82" y="35" width="76" height="138" rx="16" fill={isLight ? "#FFFFFF" : "#0D1B2E"} stroke={isLight ? "#6D28D9" : "#8B5CF6"} strokeWidth="1.5" />
        {/* Screen */}
        <rect x="90" y="50" width="60" height="108" rx="8" fill={isLight ? "#F8FAFC" : "#0F172A"} />
        {/* Coupon card on screen */}
        <rect x="94" y="58" width="52" height="62" rx="8" fill={isLight ? "#F3E8FF" : "url(#couponGrad)"} stroke={isLight ? "#D8B4FE" : "rgba(107,193,122,0.5)"} strokeWidth="1" />
        {/* Store name */}
        <text x="120" y="72" textAnchor="middle" fill={isLight ? "#64748B" : "rgba(255,255,255,0.5)"} fontSize="5.5" fontWeight="700">ARTISAN TAILOR</text>
        {/* Big discount text */}
        <text x="120" y="92" textAnchor="middle" fill={isLight ? "#6D28D9" : "#fff"} fontSize="18" fontWeight="900">15%</text>
        <text x="120" y="102" textAnchor="middle" fill={isLight ? "#15803D" : "#86EFAC"} fontSize="7.5" fontWeight="800">OFF</text>
        {/* Condition */}
        <text x="120" y="113" textAnchor="middle" fill={isLight ? "#475569" : "rgba(255,255,255,0.45)"} fontSize="5" fontWeight="600">on purchases over $15</text>
        {/* Dashed divider */}
        <line x1="97" y1="118" x2="143" y2="118" stroke={isLight ? "rgba(15,23,42,0.15)" : "rgba(255,255,255,0.15)"} strokeWidth="1" strokeDasharray="3 2" />
        {/* Mini QR */}
        <rect x="107" y="122" width="26" height="26" rx="3" fill={isLight ? "#0F172A" : "white"} opacity="0.9" />
        <rect x="109" y="124" width="7" height="7" rx="0.75" fill={isLight ? "#FFFFFF" : "#0F172A"} />
        <rect x="118" y="124" width="7" height="7" rx="0.75" fill={isLight ? "#FFFFFF" : "#0F172A"} />
        <rect x="109" y="133" width="7" height="7" rx="0.75" fill={isLight ? "#FFFFFF" : "#0F172A"} />
        <rect x="118" y="131" width="3" height="3" rx="0.5" fill={isLight ? "#FFFFFF" : "#0F172A"} />
        <rect x="122" y="134" width="3" height="3" rx="0.5" fill={isLight ? "#FFFFFF" : "#0F172A"} />
        <rect x="118" y="136" width="3" height="3" rx="0.5" fill={isLight ? "#FFFFFF" : "#0F172A"} />
        <rect x="113" y="131" width="3" height="3" rx="0.5" fill={isLight ? "#FFFFFF" : "#0F172A"} />
        <rect x="113" y="136" width="3" height="3" rx="0.5" fill={isLight ? "#FFFFFF" : "#0F172A"} />
        {/* Scan success checkmark burst */}
        <circle cx="164" cy="78" r="18" fill={isLight ? "#DCFCE7" : "rgba(107,193,122,0.15)"} stroke={isLight ? "#86EFAC" : "rgba(107,193,122,0.5)"} strokeWidth="1.5" />
        <path d="M155 78 L161 84 L173 70" stroke={isLight ? "#15803D" : "#6BC17A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Scan lines from left */}
        <line x1="30" y1="96" x2="80" y2="96" stroke={isLight ? "#6D28D9" : "#8B5CF6"} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="22" y1="86" x2="80" y2="96" stroke={isLight ? "#6D28D9" : "#8B5CF6"} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <line x1="22" y1="108" x2="80" y2="96" stroke={isLight ? "#6D28D9" : "#8B5CF6"} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        {/* Coupon tag on left */}
        <rect x="22" y="125" width="46" height="20" rx="10" fill={isLight ? "#DCFCE7" : "rgba(107,193,122,0.12)"} stroke={isLight ? "#86EFAC" : "rgba(107,193,122,0.4)"} strokeWidth="1" />
        <text x="45" y="138" textAnchor="middle" fill={isLight ? "#15803D" : "#86EFAC"} fontSize="6.5" fontWeight="800">💰 Instant Save</text>
        <defs>
          <radialGradient id="redeemGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isLight ? "#6D28D9" : "#8B5CF6"} />
            <stop offset="100%" stopColor={isLight ? "#FFFFFF" : "#0F172A"} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="couponGrad" x1="94" y1="58" x2="146" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A5F" />
            <stop offset="100%" stopColor="#0F2340" />
          </linearGradient>
        </defs>
      </svg>
    )
  },
  {
    id: "online",
    title: "Online Perks Too",
    subtitle: "Shop from anywhere",
    description: "Some merchants are fully online. Browse their offers in the app, tap Reveal & Copy to get your personal discount code, then use it at checkout on their website — no QR scan needed.",
    highlight: "No store visit required — shop from your couch",
    highlightIcon: "🌐",
    accentColor: isLight ? "#BE185D" : "#8B5CF6",
    gradientFrom: "#0F172A",
    gradientTo: "#1A1040",
    illustration: (
      <svg viewBox="0 0 240 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="120" cy="110" r="88" fill="url(#onlineGlow)" opacity={isLight ? 0.25 : 0.12} />
        {/* Phone */}
        <rect x="76" y="32" width="78" height="148" rx="16" fill={isLight ? "#FFFFFF" : "#0D1B2E"} stroke={isLight ? "#BE185D" : "#8B5CF6"} strokeWidth="1.5" />
        <rect x="84" y="47" width="62" height="118" rx="8" fill={isLight ? "#F8FAFC" : "#0F172A"} />
        {/* Code reveal box */}
        <rect x="88" y="60" width="54" height="58" rx="8" fill={isLight ? "#FCE7F3" : "rgba(139,92,246,0.12)"} stroke={isLight ? "#F472B6" : "rgba(139,92,246,0.4)"} strokeWidth="1" />
        <text x="115" y="74" textAnchor="middle" fill={isLight ? "#9D174D" : "rgba(255,255,255,0.4)"} fontSize="5.5" fontWeight="700">YOUR DISCOUNT CODE</text>
        <rect x="92" y="78" width="46" height="22" rx="5" fill={isLight ? "#FBCFE8" : "rgba(139,92,246,0.2)"} />
        <text x="115" y="93" textAnchor="middle" fill={isLight ? "#BE185D" : "#C4B5FD"} fontSize="9.5" fontWeight="800" letterSpacing="1">HELLO50OFF</text>
        <text x="115" y="108" textAnchor="middle" fill={isLight ? "#15803D" : "#86EFAC"} fontSize="5.5" fontWeight="700">Auto-copied ✓</text>
        {/* Copy button */}
        <rect x="97" y="112" width="36" height="10" rx="5" fill={isLight ? "#BE185D" : "rgba(139,92,246,0.25)"} stroke={isLight ? "#9D174D" : "rgba(139,92,246,0.5)"} strokeWidth="0.75" />
        <text x="115" y="119.5" textAnchor="middle" fill={isLight ? "#FFFFFF" : "#C4B5FD"} fontSize="5" fontWeight="800">Copy Again</text>
        {/* Browser bar at bottom of screen */}
        <rect x="88" y="135" width="62" height="22" rx="6" fill={isLight ? "#F1F5F9" : "rgba(255,255,255,0.04)"} stroke={isLight ? "#CBD5E1" : "rgba(255,255,255,0.08)"} strokeWidth="0.75" />
        <circle cx="96" cy="146" r="3.5" fill={isLight ? "#15803D" : "rgba(107,193,122,0.6)"} />
        <rect x="102" y="143.5" width="30" height="3" rx="1.5" fill={isLight ? "#64748B" : "rgba(255,255,255,0.2)"} />
        <rect x="102" y="148.5" width="22" height="2" rx="1" fill={isLight ? "#94A3B8" : "rgba(255,255,255,0.1)"} />
        {/* Wi-fi signal arcs */}
        <path d="M182 46 a26 26 0 0 1 0 32" stroke={isLight ? "#BE185D" : "#8B5CF6"} strokeWidth="1.75" fill="none" strokeLinecap="round" opacity={isLight ? 0.6 : 0.4} />
        <path d="M182 55 a17 17 0 0 1 0 14" stroke={isLight ? "#BE185D" : "#8B5CF6"} strokeWidth="1.75" fill="none" strokeLinecap="round" opacity={isLight ? 0.85 : 0.65} />
        <circle cx="182" cy="62" r="3.5" fill={isLight ? "#BE185D" : "#8B5CF6"} opacity="0.9" />
        {/* Shopping bag — bottom right */}
        <rect x="160" y="130" width="42" height="36" rx="8" fill={isLight ? "#FCE7F3" : "rgba(139,92,246,0.1)"} stroke={isLight ? "#F472B6" : "rgba(139,92,246,0.4)"} strokeWidth="1.25" />
        <path d="M170 130 C170 122 192 122 192 130" stroke={isLight ? "#BE185D" : "rgba(139,92,246,0.6)"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="181" y="154" textAnchor="middle" fontSize="14">🛍️</text>
        {/* URL bar hint — left */}
        <rect x="16" y="60" width="50" height="18" rx="9" fill={isLight ? "#FCE7F3" : "rgba(139,92,246,0.1)"} stroke={isLight ? "#F472B6" : "rgba(139,92,246,0.3)"} strokeWidth="1" />
        <circle cx="26" cy="69" r="3.5" fill={isLight ? "#BE185D" : "#8B5CF6"} opacity="0.8" />
        <rect x="32" y="66.5" width="26" height="3" rx="1.5" fill={isLight ? "#9D174D" : "rgba(255,255,255,0.2)"} />
        <rect x="32" y="71.5" width="18" height="2" rx="1" fill={isLight ? "#BE185D" : "rgba(255,255,255,0.1)"} />
        {/* Dashed connecting lines */}
        <line x1="66" y1="69" x2="76" y2="80" stroke={isLight ? "#BE185D" : "rgba(139,92,246,0.3)"} strokeWidth="1" strokeDasharray="3 2" />
        <line x1="154" y1="115" x2="164" y2="133" stroke={isLight ? "#BE185D" : "rgba(139,92,246,0.3)"} strokeWidth="1" strokeDasharray="3 2" />
        {/* Discount tag — left bottom */}
        <rect x="16" y="145" width="48" height="20" rx="10" fill={isLight ? "#DCFCE7" : "rgba(107,193,122,0.1)"} stroke={isLight ? "#86EFAC" : "rgba(107,193,122,0.4)"} strokeWidth="1" />
        <text x="40" y="158" textAnchor="middle" fill={isLight ? "#15803D" : "#86EFAC"} fontSize="6.5" fontWeight="800">💰 50% Off</text>
        <defs>
          <radialGradient id="onlineGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isLight ? "#BE185D" : "#8B5CF6"} />
            <stop offset="100%" stopColor={isLight ? "#FFFFFF" : "#0F172A"} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: "multi",
    title: "One App, Many Stores",
    subtitle: "Your neighborhood in one place",
    description: "Perkfinity connects you to a growing network of local businesses. One scan gets you instant discounts wherever you shop.",
    highlight: "Growing network of local merchants",
    highlightIcon: "🏪",
    accentColor: isLight ? "#15803D" : "#6BC17A",
    gradientFrom: "#0F172A",
    gradientTo: "#0D2318",
    illustration: (
      <svg viewBox="0 0 260 210" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="130" cy="105" r="80" fill="url(#hubGlow)" opacity={isLight ? 0.25 : 0.12} />
        {/* Dashed spoke lines from center to each store */}
        <line x1="130" y1="105" x2="52" y2="45" stroke={isLight ? "#BE185D" : "rgba(107,193,122,0.35)"} strokeWidth="1.2" strokeDasharray="5 3" />
        <line x1="130" y1="105" x2="210" y2="48" stroke={isLight ? "#15803D" : "rgba(107,193,122,0.35)"} strokeWidth="1.2" strokeDasharray="5 3" />
        <line x1="130" y1="105" x2="42" y2="135" stroke={isLight ? "#6D28D9" : "rgba(139,92,246,0.35)"} strokeWidth="1.2" strokeDasharray="5 3" />
        <line x1="130" y1="105" x2="220" y2="138" stroke={isLight ? "#15803D" : "rgba(107,193,122,0.35)"} strokeWidth="1.2" strokeDasharray="5 3" />

        {/* Center hub — real app icon */}
        <circle cx="130" cy="105" r="28" fill={isLight ? "#FFFFFF" : "rgba(255,255,255,0.05)"} stroke={isLight ? "#15803D" : "#6BC17A"} strokeWidth="2" />
        <circle cx="130" cy="105" r="24" fill={isLight ? "#F8FAFC" : "#0F172A"} />
        <defs>
          <clipPath id="centerIconClip">
            <rect x="108" y="83" width="44" height="44" rx="10" />
          </clipPath>
        </defs>
        <image x="104" y="79" width="52" height="52" href={platform === 'android' ? "/app-icon.png" : "/app-icon.png"} clipPath="url(#centerIconClip)"/>

        {/* Store: Flower Shop — top left */}
        <g transform="translate(27, 23)">
          <rect x="0" y="12" width="50" height="34" rx="4" fill={isLight ? "#FCE7F3" : "rgba(236,72,153,0.08)"} stroke={isLight ? "#F472B6" : "rgba(236,72,153,0.4)"} strokeWidth="1.5" />
          <path d="M -2 12 L 52 12 L 48 2 L 2 2 Z" fill={isLight ? "#FBCFE8" : "rgba(236,72,153,0.2)"} stroke={isLight ? "#BE185D" : "rgba(236,72,153,0.6)"} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="8" y="26" width="12" height="20" rx="2" fill={isLight ? "#F472B6" : "rgba(236,72,153,0.15)"} />
          <rect x="26" y="22" width="16" height="14" rx="2" fill={isLight ? "#F472B6" : "rgba(236,72,153,0.15)"} />
          <text x="34" y="32.5" textAnchor="middle" fontSize="9">💐</text>
          <text x="25" y="60" textAnchor="middle" fill={isLight ? "#BE185D" : "#F9A8D4"} fontSize="6.5" fontWeight="800">FLOWER SHOP</text>
        </g>

        {/* Store: Spa — top right */}
        <g transform="translate(185, 26)">
          <rect x="0" y="12" width="50" height="34" rx="4" fill={isLight ? "#DCFCE7" : "rgba(107,193,122,0.08)"} stroke={isLight ? "#86EFAC" : "rgba(107,193,122,0.4)"} strokeWidth="1.5" />
          <path d="M -2 12 L 52 12 L 48 2 L 2 2 Z" fill={isLight ? "#BBF7D0" : "rgba(107,193,122,0.2)"} stroke={isLight ? "#15803D" : "rgba(107,193,122,0.6)"} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="8" y="26" width="12" height="20" rx="2" fill={isLight ? "#86EFAC" : "rgba(107,193,122,0.15)"} />
          <rect x="26" y="22" width="16" height="14" rx="2" fill={isLight ? "#86EFAC" : "rgba(107,193,122,0.15)"} />
          <text x="34" y="32.5" textAnchor="middle" fontSize="9">🧖</text>
          <text x="25" y="60" textAnchor="middle" fill={isLight ? "#15803D" : "#86EFAC"} fontSize="6.5" fontWeight="800">SPA</text>
        </g>

        {/* Store: Hair Salon — bottom left */}
        <g transform="translate(17, 113)">
          <rect x="0" y="12" width="50" height="34" rx="4" fill={isLight ? "#F3E8FF" : "rgba(139,92,246,0.08)"} stroke={isLight ? "#D8B4FE" : "rgba(139,92,246,0.4)"} strokeWidth="1.5" />
          <path d="M -2 12 L 52 12 L 48 2 L 2 2 Z" fill={isLight ? "#DDD6FE" : "rgba(139,92,246,0.2)"} stroke={isLight ? "#6D28D9" : "rgba(139,92,246,0.6)"} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="8" y="26" width="12" height="20" rx="2" fill={isLight ? "#C4B5FD" : "rgba(139,92,246,0.15)"} />
          <rect x="26" y="22" width="16" height="14" rx="2" fill={isLight ? "#C4B5FD" : "rgba(139,92,246,0.15)"} />
          <text x="34" y="32.5" textAnchor="middle" fontSize="9">💇</text>
          <text x="25" y="60" textAnchor="middle" fill={isLight ? "#6D28D9" : "#C4B5FD"} fontSize="6.5" fontWeight="800">HAIR SALON</text>
        </g>

        {/* Store: Tailor — bottom right */}
        <g transform="translate(195, 116)">
          <rect x="0" y="12" width="50" height="34" rx="4" fill={isLight ? "#DCFCE7" : "rgba(107,193,122,0.08)"} stroke={isLight ? "#86EFAC" : "rgba(107,193,122,0.4)"} strokeWidth="1.5" />
          <path d="M -2 12 L 52 12 L 48 2 L 2 2 Z" fill={isLight ? "#BBF7D0" : "rgba(107,193,122,0.2)"} stroke={isLight ? "#15803D" : "rgba(107,193,122,0.6)"} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="8" y="26" width="12" height="20" rx="2" fill={isLight ? "#86EFAC" : "rgba(107,193,122,0.15)"} />
          <rect x="26" y="22" width="16" height="14" rx="2" fill={isLight ? "#86EFAC" : "rgba(107,193,122,0.15)"} />
          <text x="34" y="32.5" textAnchor="middle" fontSize="9">✂️</text>
          <text x="25" y="60" textAnchor="middle" fill={isLight ? "#15803D" : "#86EFAC"} fontSize="6.5" fontWeight="800">TAILOR</text>
        </g>

        {/* Midpoint dots on spokes */}
        <circle cx="91" cy="75" r="3" fill={isLight ? "#BE185D" : "#6BC17A"} opacity="0.8" />
        <circle cx="170" cy="76" r="3" fill={isLight ? "#15803D" : "#6BC17A"} opacity="0.8" />
        <circle cx="86" cy="120" r="3" fill={isLight ? "#6D28D9" : "#8B5CF6"} opacity="0.8" />
        <circle cx="175" cy="121" r="3" fill={isLight ? "#15803D" : "#8B5CF6"} opacity="0.8" />

        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isLight ? "#15803D" : "#6BC17A"} />
            <stop offset="100%" stopColor={isLight ? "#FFFFFF" : "#0F172A"} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    )
  }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [platform, setPlatform] = useState<string>('ios');
  const router = useRouter();
  
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  
  const steps = getSteps(platform, isLight);
  const step = steps[currentStep];

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      const p = Capacitor.getPlatform();
      setPlatform(p);
    }).catch(() => {});
  }, []);

  const nextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // If already signed in → go to Scan so they know what to do next; if not → sign up
      const isSignedIn = !!getUserToken();
      router.push(isSignedIn ? "/scan" : "/auth");
    }
  };

  return (
    <div style={{
      height: '100vh',
      background: isLight ? 'var(--bg-gradient)' : `linear-gradient(160deg, ${step.gradientFrom} 0%, ${step.gradientTo} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      color: isLight ? '#0F172A' : '#fff',
      fontFamily: 'Outfit, sans-serif',
      overflow: 'hidden',
      transition: 'background 0.6s ease'
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--safe-top, 44px) 1.5rem 0'
      }}>
        <img src={platform === 'android' ? "/app-icon.png" : "/app-icon.png"} alt="Perkfinity" width={36} height={36} style={{ borderRadius: '10px' }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === currentStep ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i === currentStep ? (isLight ? '#6D28D9' : step.accentColor) : (isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.2)'),
              transition: 'all 0.4s ease'
            }} />
          ))}
        </div>
        <button
          onClick={() => router.push(getUserToken() ? "/scan" : "/auth")}
          style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : 'rgba(255,255,255,0.4)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem 2rem',
        maxHeight: '260px',
        animation: 'fadeIn 0.5s ease'
      }}>
        {step.illustration}
      </div>

      {/* Text Content */}
      <div style={{ padding: '0 1.5rem 1rem', animation: 'slideUp 0.4s ease' }}>
        <p style={{
          color: isLight ? '#6D28D9' : step.accentColor,
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          margin: '0 0 6px'
        }}>
          {step.subtitle}
        </p>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          margin: '0 0 0.75rem',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: isLight ? '#0F172A' : '#fff'
        }}>
          {step.title}
        </h1>
        <p style={{
          fontSize: '0.975rem',
          lineHeight: '1.6',
          color: isLight ? '#475569' : 'rgba(255,255,255,0.6)',
          margin: '0 0 1rem',
          fontWeight: 500
        }}>
          {step.description}
        </p>

        {/* Highlight box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0.875rem 1rem',
          background: isLight
            ? (step.id === 'easy' ? '#F3E8FF' : '#DCFCE7')
            : (step.id === 'easy' ? 'rgba(139,92,246,0.15)' : 'rgba(107,193,122,0.13)'),
          border: isLight
            ? (step.id === 'easy' ? '1px solid #D8B4FE' : '1px solid #86EFAC')
            : (step.id === 'easy' ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(107,193,122,0.35)'),
          borderRadius: '14px',
          marginBottom: '1.25rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>{step.highlightIcon}</span>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: isLight
              ? (step.id === 'easy' ? '#6D28D9' : '#15803D')
              : (step.id === 'easy' ? '#C4B5FD' : '#86EFAC')
          }}>
            {step.highlight}
          </span>
        </div>

        {/* CTA Button */}
        <button
          onClick={nextStep}
          style={{
            width: '100%',
            padding: '1.1rem',
            background: `linear-gradient(135deg, ${step.accentColor}, ${step.id === 'easy' ? '#6D28D9' : '#3B9A52'})`,
            border: 'none',
            borderRadius: '18px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.01em',
            boxShadow: `0 8px 24px ${step.accentColor}40`,
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {currentStep === steps.length - 1 ? (getUserToken() ? "Back to App →" : "Let's Go! →") : "Continue →"}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
