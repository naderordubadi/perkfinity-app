/**
 * getPostLoginRoute — called after every sign-in (Apple, Google, Email).
 *
 * Gate table:
 * ─────────────────────────────────────────────────────────────────
 * Sign-Up (any method)
 *   → Profile is incomplete (no phone/city/zip yet) → /profile
 *   → Profile page saves, then routes to /permissions
 *   → Permissions saves, then routes to /scan (home)
 *
 * Sign-In (any method, existing account)
 *   → Profile incomplete (any of 4 fields missing)    → /profile
 *   → Profile complete, native perms not asked yet    → /permissions
 *   → Profile complete, native perms decided          → / (home)
 *
 * Logged-in (app reopen, already has token)
 *   → No gate — NavigationGuard does NOT re-check.
 * ─────────────────────────────────────────────────────────────────
 *
 * WHY we check native permission state (not DB fields):
 *   The DB columns location_sharing_enabled / push_notifications_enabled
 *   default to FALSE for every new row. Checking typeof === 'boolean'
 *   would always return true and skip the gate. The DEVICE's native
 *   permission status ('prompt' | 'granted' | 'denied') is the only
 *   reliable signal that shows whether the user has made a choice on
 *   THIS device. This also correctly handles device switches: a user
 *   who granted on their old device still sees the permissions screen
 *   on their new device because the new device is at 'prompt'.
 */
export async function getPostLoginRoute(
  user: Record<string, any> | null | undefined,
  pendingQr: string | null
): Promise<string> {
  if (!user) return '/auth';

  // ── 1. Profile completeness (DB-backed, works across devices) ────
  const profileComplete =
    !!user.full_name &&
    !!user.phone_number &&
    !!user.city &&
    !!user.zip_code;

  if (!profileComplete) return '/profile';

  // ── 2. Native permission gate ────────────────────────────────────
  // Only runs on iOS / Android. Skipped silently on web.
  // 'prompt' or 'prompt-with-rationale' = not yet asked on this device.
  // 'granted' or 'denied' = user made a choice → pass through.
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

      const [locStatus, pushStatus] = await Promise.all([
        Geolocation.checkPermissions(),
        FirebaseMessaging.checkPermissions(),
      ]);

      const decided = ['granted', 'denied'];

      // Location: either fine or coarse must be decided.
      const locDecided =
        decided.includes(locStatus.location) ||
        decided.includes(locStatus.coarseLocation);

      const pushDecided = decided.includes(pushStatus.receive);

      if (!locDecided || !pushDecided) return '/permissions';
    }
  } catch {
    // If the permission API throws (e.g. simulator edge case), let user through.
  }

  // ── 3. All clear ─────────────────────────────────────────────────
  if (pendingQr) return `/qr/_/?code=${encodeURIComponent(pendingQr)}`;
  return '/';
}
