import React, { useCallback } from 'react';
import { BrandMark } from '../components/BrandMark';
import type { VerifyAccessPassFn } from './pass-types';
import { PassEntryScreen } from './PassEntryScreen';
import { useAccessGate } from './useAccessGate';

interface AccessGateProps {
  children: React.ReactNode;
  publicKeyPem?: string;
  now?: Date;
  verifyPassFn?: VerifyAccessPassFn;
}

const LoadingScreen: React.FC = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      background: 'var(--color-bg)',
    }}
  >
    <div
      className="card-sm"
      style={{
        minWidth: 260,
        display: 'grid',
        gap: 16,
        padding: '24px',
        justifyItems: 'center',
        textAlign: 'center',
      }}
    >
      <BrandMark />
      <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>Checking local access pass…</div>
    </div>
  </div>
);

export const AccessGate: React.FC<AccessGateProps> = ({ children, publicKeyPem, now, verifyPassFn }) => {
  const { status, notice, isSubmitting, canSubmitPass, submitPass, removeAccessPass } = useAccessGate({
    publicKeyPem,
    now,
    verifyPassFn,
  });

  const handleRemoveAccess = useCallback(() => {
    if (
      window.confirm(
        'Remove the access pass from this device and clear local assessment data? This will relock the app.',
      )
    ) {
      removeAccessPass();
    }
  }, [removeAccessPass]);

  if (status === 'checking') {
    return <LoadingScreen />;
  }

  if (status === 'locked') {
    return (
      <PassEntryScreen
        notice={notice}
        isSubmitting={isSubmitting}
        canSubmitPass={canSubmitPass}
        onSubmit={submitPass}
      />
    );
  }

  return (
    <>
      {children}
      <div
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 60,
          pointerEvents: 'none',
        }}
      >
        <button
          type="button"
          onClick={handleRemoveAccess}
          style={{
            pointerEvents: 'auto',
            padding: '10px 12px',
            borderRadius: '999px',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            background: 'rgba(255, 255, 255, 0.95)',
            color: 'var(--color-text)',
            fontSize: 12,
            fontWeight: 600,
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
            cursor: 'pointer',
          }}
        >
          Remove access pass
        </button>
      </div>
    </>
  );
};
