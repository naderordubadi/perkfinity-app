// Server component — generateStaticParams() must live here (not in a
// 'use client' file). The actual UI is rendered by PerkDetailClient.
import PerkDetailClient from './PerkDetailClient';

export function generateStaticParams() {
  // Next.js 14 requires at least 1 entry for output:'export' on dynamic routes.
  // The actual ID is resolved at runtime by the Capacitor iOS app.
  return [{ id: '_' }];
}

export default function PerkPage({ params }: { params: { id: string } }) {
  return <PerkDetailClient params={params} />;
}
