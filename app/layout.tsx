import type { Metadata, Viewport } from "next";
import Link from "next/link";
import NavigationGuard from "./components/NavigationGuard";
import PushNotificationSetup from "./components/PushNotificationSetup";

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
          :root {
            --primary: #6D28D9;
            --primary-light: #8B5CF6;
            --secondary: #EC4899;
            --bg: #0F172A;
            --card-bg: rgba(30, 41, 59, 0.7);
            --border: rgba(255, 255, 255, 0.1);
            --text-main: #F8FAFC;
            --text-muted: #94A3B8;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
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
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: 24px;
            display: flex;
            justify-content: space-around;
            align-items: center;
            z-index: 1000;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
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
        <PushNotificationSetup />
        <NavigationGuard />
        <div className="mesh-bg" />
        <main>
          {children}
        </main>
        
        <nav className="glass-nav">
          <Link href="/" className="nav-item active">
            <svg className="nav-icon" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>Home</span>
          </Link>
          <Link href="/scan" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24"><path d="M4 4h7v7H4zm2 2v3h3V6zm5 11h3v3h-3zM4 13h7v7H4zm2 2v3h3v-3zm7-11h7v7h-7zm2 2v3h3V6zm-2 7h3v3h-3zm3 3h3v3h-3zm3-3h3v3h-3zm0 6h3v3h-3z"/></svg>
            <span>Scan</span>
          </Link>
          <Link href="/history" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
            <span>History</span>
          </Link>
          <Link href="/profile" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            <span>Profile</span>
          </Link>
        </nav>
      </body>
    </html>
  )
}
