import React, { useState } from 'react';
import { BrandMark } from '../components/BrandMark';

interface PassEntryScreenProps {
  notice?: string | null;
  isSubmitting: boolean;
  canSubmitPass: boolean;
  onSubmit: (rawPass: string) => Promise<{ ok: boolean; message?: string }>;
}

export const PassEntryScreen: React.FC<PassEntryScreenProps> = ({ notice, isSubmitting, canSubmitPass, onSubmit }) => {
  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const result = await onSubmit(value);
    if (!result.ok) {
      setErrorMessage(result.message ?? 'Unable to verify that access pass.');
    }
  };

  return (
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
        className="card"
        style={{
          width: '100%',
          maxWidth: 620,
          padding: '32px',
          display: 'grid',
          gap: 20,
        }}
      >
        <BrandMark />

        <div style={{ display: 'grid', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>Access pass required</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Paste a signed access pass to unlock the application.
          </p>
        </div>

        {notice ? (
          <div
            role="status"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              color: 'var(--color-text)',
              lineHeight: 1.5,
            }}
          >
            {notice}
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.22)',
              color: 'var(--color-danger)',
              lineHeight: 1.5,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <label
            htmlFor="access-pass-input"
            style={{ display: 'grid', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}
          >
            Signed access pass
            <textarea
              id="access-pass-input"
              data-testid="access-pass-input"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Paste the full signed pass string here"
              spellCheck={false}
              rows={6}
              style={{
                width: '100%',
                resize: 'vertical',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 13,
                lineHeight: 1.5,
                fontFamily: 'var(--font-mono)',
              }}
            />
          </label>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
              Temporary passes expire 14 days after issue.
            </p>
            <button
              type="submit"
              data-testid="unlock-pass-btn"
              disabled={!canSubmitPass || isSubmitting}
              style={{
                minWidth: 128,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: !canSubmitPass || isSubmitting ? 'var(--color-border)' : 'var(--color-primary)',
                color: !canSubmitPass || isSubmitting ? 'var(--color-text-secondary)' : '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: !canSubmitPass || isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Unlocking…' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
