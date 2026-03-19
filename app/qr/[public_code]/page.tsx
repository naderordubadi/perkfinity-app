// Server component — generateStaticParams() must live here (not in a
// 'use client' file). The actual UI is rendered by QRResolveClient.
import QRResolveClient from './QRResolveClient';

export function generateStaticParams() {
  // Next.js 14 requires at least 1 entry for output:'export' on dynamic routes.
  // The actual QR code is resolved at runtime by the Capacitor iOS app.
  return [{ public_code: '_' }];
}

export default function QRPage({ params }: { params: { public_code: string } }) {
  return <QRResolveClient params={params} />;
}
