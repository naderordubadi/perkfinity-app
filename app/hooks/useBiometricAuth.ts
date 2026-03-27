'use client';

import { useState, useEffect } from 'react';

/**
 * Perkfinity — Face ID / Biometric Auth Hook
 * 
 * Uses capacitor-native-biometric plugin for native Face ID / Touch ID.
 * Falls back gracefully on web or devices without biometrics.
 */

interface NativeBiometricPlugin {
  isAvailable: () => Promise<{ isAvailable: boolean; biometryType?: number }>;
  verifyIdentity: (options: { reason: string; title: string; fallbackTitle?: string }) => Promise<void>;
}

let NativeBiometric: NativeBiometricPlugin | null = null;

async function loadPlugin(): Promise<NativeBiometricPlugin | null> {
  if (typeof window === 'undefined') return null;
  try {
    const mod = await import('capacitor-native-biometric');
    return mod.NativeBiometric || null;
  } catch {
    return null;
  }
}

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('');
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      NativeBiometric = await loadPlugin();
      if (!NativeBiometric) return;

      try {
        const result = await NativeBiometric.isAvailable();
        setIsAvailable(result.isAvailable);
        // biometryType: 1 = Touch ID, 2 = Face ID, 3 = Fingerprint, 4 = Face/Iris
        const typeMap: Record<number, string> = { 1: 'Touch ID', 2: 'Face ID', 3: 'Fingerprint', 4: 'Face' };
        setBiometryType(typeMap[result.biometryType || 0] || 'Biometric');
        
        const enrolled = localStorage.getItem('pf_biometric_enrolled') === 'true';
        setIsEnrolled(enrolled);
      } catch {
        setIsAvailable(false);
      }
    })();
  }, []);

  const authenticate = async (): Promise<boolean> => {
    if (!NativeBiometric || !isAvailable) return false;
    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Verify your identity to access Perkfinity',
        title: 'Perkfinity',
        fallbackTitle: 'Use Passcode'
      });
      return true; // verifyIdentity resolves on success, rejects on failure
    } catch (err) {
      console.error('Biometric auth failed:', err);
      return false;
    }
  };

  const enroll = () => {
    localStorage.setItem('pf_biometric_enrolled', 'true');
    setIsEnrolled(true);
  };

  const unenroll = () => {
    localStorage.removeItem('pf_biometric_enrolled');
    setIsEnrolled(false);
  };

  return {
    isAvailable,
    biometryType,
    isEnrolled,
    authenticate,
    enroll,
    unenroll
  };
}
