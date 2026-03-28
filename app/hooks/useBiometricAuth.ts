'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Perkfinity — Face ID / Biometric Auth Hook
 * 
 * Uses @aparajita/capacitor-biometric-auth for native Face ID / Touch ID.
 * Compatible with Capacitor 6+.
 * Falls back gracefully on web or devices without biometrics.
 */

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') { setChecked(true); return; }

      try {
        const { BiometricAuth, BiometryType } = await import('@aparajita/capacitor-biometric-auth');
        const result = await BiometricAuth.checkBiometry();

        if (result.isAvailable) {
          setIsAvailable(true);
          // BiometryType: 0=none, 1=touchId, 2=faceId, 3=fingerprint, 4=faceAuth, 5=iris
          const typeMap: Record<number, string> = {
            1: 'Touch ID',
            2: 'Face ID',
            3: 'Fingerprint',
            4: 'Face',
            5: 'Iris'
          };
          setBiometryType(typeMap[result.biometryType as number] || 'Biometric');
        }
      } catch (err) {
        console.log('[Biometric] Not available on this device:', err);
        setIsAvailable(false);
      }

      // Check local enrollment preference
      const enrolled = localStorage.getItem('pf_biometric_enrolled') === 'true';
      setIsEnrolled(enrolled);
      setChecked(true);
    })();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      await BiometricAuth.authenticate({
        reason: 'Verify your identity to access Perkfinity',
        allowDeviceCredential: true,
      });
      return true; // authenticate resolves on success, rejects on failure
    } catch (err) {
      console.error('[Biometric] Auth failed:', err);
      return false;
    }
  }, []);

  const enroll = useCallback(() => {
    localStorage.setItem('pf_biometric_enrolled', 'true');
    setIsEnrolled(true);
  }, []);

  const unenroll = useCallback(() => {
    localStorage.removeItem('pf_biometric_enrolled');
    setIsEnrolled(false);
  }, []);

  return {
    isAvailable,
    biometryType,
    isEnrolled,
    checked,
    authenticate,
    enroll,
    unenroll
  };
}
