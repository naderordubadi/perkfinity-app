// Server component — generateStaticParams() must live here (not in a
// 'use client' file). The actual UI is rendered by QRResolveClient.
import { Suspense } from 'react';
import QRResolveClient from './QRResolveClient';

export function generateStaticParams() {
  // Next.js 14 requires at least 1 entry for output:'export' on dynamic routes.
  // The actual QR code is resolved at runtime by the Capacitor iOS app.
  return [{ public_code: '_' }];
}

export default function QRPage({ params }: { params: { public_code: string } }) {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
        Loading...
      </div>
    }>
      <QRResolveClient params={params} />
    </Suspense>
  );
}
