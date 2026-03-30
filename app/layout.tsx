import type { Metadata, Viewport } from "next";
import NavigationGuard from "./components/NavigationGuard";
import BottomNav from "./components/BottomNav";
import PushHandler from "./components/PushHandler";

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
        <NavigationGuard />
        <PushHandler />

        <div className="mesh-bg" />
        <main>
          {children}
        </main>
        
        <BottomNav />
      </body>
    </html>
  )
}
