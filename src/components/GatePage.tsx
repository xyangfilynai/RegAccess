import React, { useState } from 'react';

interface GatePageProps {
  onEnter: () => void;
}

export const GatePage: React.FC<GatePageProps> = ({ onEnter }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter your invite code.');
      return;
    }
    if (trimmed.length < 3) {
      setError("That doesn\u2019t look like a valid invite code.");
      return;
    }
    onEnter();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f9fafb',
      padding: 'var(--space-xl)',
    }}>
      <div style={{
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo lockup - matches app header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 32,
        }}>
          <img 
            src="/logo.png" 
            alt="RegAssess" 
            style={{
              width: 40,
              height: 40,
              objectFit: 'contain',
            }}
          />
          <span style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#111827',
            letterSpacing: '-0.01em',
          }}>
            RegAssess
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 4,
            background: '#f0fdf4',
            color: '#15803d',
            letterSpacing: '0.02em',
          }}>
            AI/ML
          </span>
        </div>
        <p style={{
          fontSize: 14,
          color: '#6b7280',
          lineHeight: 1.6,
          margin: '0 0 32px',
        }}>
          Regulatory change assessment for AI/ML medical devices.
          Enter your invite code to continue.
        </p>

        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 12,
        }}>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. RA-7K2M"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 6,
              border: `1px solid ${error ? '#ef4444' : '#e5e7eb'}`,
              fontSize: 14,
              outline: 'none',
              background: '#ffffff',
              transition: 'border-color 0.15s ease',
            }}
          />
          <button
            onClick={handleSubmit}
            style={{
              padding: '12px 24px',
              borderRadius: 6,
              background: '#111827',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#111827';
            }}
          >
            Continue
          </button>
        </div>

        {error && (
          <p style={{
            fontSize: 13,
            color: '#ef4444',
            margin: '0 0 12px',
          }}>
            {error}
          </p>
        )}

        <p style={{
          fontSize: 12,
          color: '#9ca3af',
          margin: 0,
        }}>
          Check your invitation email for this code.
        </p>
      </div>
    </div>
  );
};
