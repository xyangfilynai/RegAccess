import { useCallback, useEffect, useState } from 'react';
import {
  clearExpiredAccessState,
  readStoredAccessPass,
  removeAccessAndProtectedData,
  removeStoredAccessPass,
  storeAccessPass,
} from './access-storage';
import { ACCESS_PASS_PUBLIC_KEY_PEM, hasConfiguredAccessPassPublicKey } from './public-key';
import type { AccessPassPayload, VerifyAccessPassFailureReason, VerifyAccessPassFn } from './pass-types';
import { verifyAccessPass } from './verify-pass';

interface UseAccessGateOptions {
  publicKeyPem?: string;
  now?: Date;
  verifyPassFn?: VerifyAccessPassFn;
}

interface SubmitPassResult {
  ok: boolean;
  message?: string;
}

interface UseAccessGateResult {
  status: 'checking' | 'locked' | 'unlocked';
  payload: AccessPassPayload | null;
  notice: string | null;
  isSubmitting: boolean;
  canSubmitPass: boolean;
  submitPass: (rawPass: string) => Promise<SubmitPassResult>;
  removeAccessPass: () => void;
}

const buildStoredPassNotice = (reason: VerifyAccessPassFailureReason): string => {
  switch (reason) {
    case 'expired':
      return 'Your temporary access pass expired on this device. Paste a new pass to continue.';
    case 'unconfigured_public_key':
      return 'This build does not have an access-pass public key configured yet.';
    case 'unsupported_crypto':
      return 'This browser cannot verify access passes locally.';
    default:
      return 'Stored access on this device could not be validated. Paste a current signed pass to continue.';
  }
};

export const useAccessGate = ({
  publicKeyPem = ACCESS_PASS_PUBLIC_KEY_PEM,
  now,
  verifyPassFn = verifyAccessPass,
}: UseAccessGateOptions = {}): UseAccessGateResult => {
  const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');
  const [payload, setPayload] = useState<AccessPassPayload | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmitPass = hasConfiguredAccessPassPublicKey(publicKeyPem);

  useEffect(() => {
    let active = true;

    const runStartupVerification = async () => {
      const storedPass = readStoredAccessPass();
      if (!storedPass) {
        if (!active) return;
        setPayload(null);
        setNotice(canSubmitPass ? null : 'This build does not have an access-pass public key configured yet.');
        setStatus('locked');
        return;
      }

      const result = await verifyPassFn(storedPass, { publicKeyPem, now });
      if (!active) return;

      if (result.ok) {
        setPayload(result.payload);
        setNotice(null);
        setStatus('unlocked');
        return;
      }

      if (result.reason === 'expired') {
        clearExpiredAccessState();
      } else if (
        result.reason === 'invalid_format' ||
        result.reason === 'invalid_payload' ||
        result.reason === 'invalid_signature' ||
        result.reason === 'unsupported_version'
      ) {
        removeStoredAccessPass();
      }

      setPayload(null);
      setNotice(buildStoredPassNotice(result.reason));
      setStatus('locked');
    };

    void runStartupVerification();

    return () => {
      active = false;
    };
  }, [canSubmitPass, now, publicKeyPem, verifyPassFn]);

  const submitPass = useCallback(
    async (rawPass: string): Promise<SubmitPassResult> => {
      const normalizedPass = rawPass.trim();
      if (!normalizedPass) {
        return { ok: false, message: 'Paste a signed access pass to continue.' };
      }

      setIsSubmitting(true);
      try {
        const result = await verifyPassFn(normalizedPass, { publicKeyPem, now });
        if (!result.ok) {
          return { ok: false, message: result.message };
        }

        storeAccessPass(result.rawPass);
        setPayload(result.payload);
        setNotice(null);
        setStatus('unlocked');
        return { ok: true };
      } finally {
        setIsSubmitting(false);
      }
    },
    [now, publicKeyPem, verifyPassFn],
  );

  const removeAccessPass = useCallback(() => {
    removeAccessAndProtectedData();
    setPayload(null);
    setNotice('Access pass removed from this device. Paste a new pass to continue.');
    setStatus('locked');
  }, []);

  return {
    status,
    payload,
    notice,
    isSubmitting,
    canSubmitPass,
    submitPass,
    removeAccessPass,
  };
};
