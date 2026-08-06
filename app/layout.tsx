import type { Metadata, Viewport } from "next";
import NavigationGuard from "./components/NavigationGuard";
import BottomNav from "./components/BottomNav";
import PushHandler from "./components/PushHandler";
import SafeAreaProvider from "./components/SafeAreaProvider";
import ThemeProvider from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "Perkfinity | Rewards & Experiences",
  description: "Scan, Claim, and Enjoy exclusive perks from your favorite local merchants.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Perkfinity",
  },
};

export const viewport: Viewport = {
  themeColor: "#6D28D9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
        <style>{`
          :root, :root[data-theme="dark"] {
            --primary: #6D28D9;
            --primary-light: #8B5CF6;
            --secondary: #EC4899;
            --bg: #0F172A;
            --bg-gradient: linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F2318 100%);
            --card-bg: rgba(30, 41, 59, 0.7);
            --card-solid: #1E293B;
            --border: rgba(255, 255, 255, 0.1);
            --text-main: #F8FAFC;
            --text-muted: #94A3B8;
            --nav-bg: rgba(15, 23, 42, 0.85);
            --nav-border: rgba(255, 255, 255, 0.12);
            --input-bg: rgba(15, 23, 42, 0.6);
            --safe-top: env(safe-area-inset-top, 44px);
          }

          :root[data-theme="light"] {
            --primary: #6D28D9;
            --primary-light: #7C3AED;
            --secondary: #DB2777;
            --bg: #F8FAFC;
            --bg-gradient: linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 60%, #F0FDF4 100%);
            --card-bg: #FFFFFF;
            --card-solid: #F1F5F9;
            --border: rgba(15, 23, 42, 0.14);
            --text-main: #0F172A;
            --text-muted: #475569;
            --nav-bg: rgba(255, 255, 255, 0.95);
            --nav-border: rgba(15, 23, 42, 0.15);
            --input-bg: #F1F5F9;
            --safe-top: env(safe-area-inset-top, 44px);
          }

          /* Light Mode contrast & visibility overrides — Dark mode remains 100% untouched */
          [data-theme="light"] body {
            background-color: #F8FAFC !important;
            color: #0F172A !important;
          }

          [data-theme="light"] .glass-nav {
            box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12) !important;
          }

          [data-theme="light"] input, 
          [data-theme="light"] select, 
          [data-theme="light"] textarea {
            color: #0F172A !important;
            background-color: #F1F5F9 !important;
            border-color: rgba(15, 23, 42, 0.18) !important;
          }

          [data-theme="light"] input::placeholder {
            color: #94A3B8 !important;
          }

          [data-theme="light"] div[style*="background: 'rgba(255,255,255"],
          [data-theme="light"] div[style*='background: "rgba(255,255,255'],
          [data-theme="light"] div[style*="background: 'rgba(255, 255, 255"],
          [data-theme="light"] div[style*='background: "rgba(255, 255, 255'] {
            background: #FFFFFF !important;
            border-color: rgba(15, 23, 42, 0.14) !important;
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
          }

          [data-theme="light"] div[style*="color: '#fff'"],
          [data-theme="light"] div[style*='color: "#fff"'],
          [data-theme="light"] div[style*="color: #fff"],
          [data-theme="light"] span[style*="color: '#fff'"],
          [data-theme="light"] span[style*='color: "#fff"'],
          [data-theme="light"] span[style*="color: #fff"],
          [data-theme="light"] h1[style*="color: '#fff'"],
          [data-theme="light"] h2[style*="color: '#fff'"],
          [data-theme="light"] h3[style*="color: '#fff'"],
          [data-theme="light"] p[style*="color: '#fff'"] {
            color: #0F172A !important;
          }

          [data-theme="light"] div[style*="color: 'rgba(255,255,255"],
          [data-theme="light"] div[style*='color: "rgba(255,255,255'],
          [data-theme="light"] span[style*="color: 'rgba(255,255,255"],
          [data-theme="light"] span[style*='color: "rgba(255,255,255'],
          [data-theme="light"] p[style*="color: 'rgba(255,255,255"],
          [data-theme="light"] p[style*='color: "rgba(255,255,255'] {
            color: #475569 !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
            transition: background-color 0.3s ease, color 0.3s ease;
          }

          * {
            box-sizing: border-box;
          }

          .glass-nav {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            width: calc(100% - 48px);
            max-width: 400px;
            height: 72px;
            background: var(--nav-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--nav-border);
            border-radius: 24px;
            display: flex;
            justify-content: space-around;
            align-items: center;
            z-index: 1000;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
            transition: background 0.3s ease, border-color 0.3s ease;
          }

          .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            text-decoration: none;
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .nav-item.active {
            color: var(--primary-light);
          }

          .nav-icon {
            width: 24px;
            height: 24px;
            fill: currentColor;
          }

          main {
            min-height: 100vh;
            max-width: 500px;
            margin: 0 auto;
            position: relative;
            padding-bottom: 120px;
          }

          .mesh-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background: 
              radial-gradient(circle at 0% 0%, rgba(109, 40, 217, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 100% 100%, rgba(236, 72, 153, 0.1) 0%, transparent 50%);
          }
        `}</style>
      </head>
      <body>
        <ThemeProvider>
          <SafeAreaProvider />
          <NavigationGuard />
          <PushHandler />

          <div className="mesh-bg" />
          <main>
            {children}
          </main>
          
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  )
}
