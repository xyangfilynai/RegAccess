import React from 'react';

export const BrandMark: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
    <img
      src="/logo.png"
      alt="RegAccess Logo"
      style={{ width: 36, height: 36, objectFit: 'contain' }}
    />
    <span style={{
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--color-text)',
      letterSpacing: '-0.02em',
    }}>
      RegAccess
    </span>
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      padding: '2px 6px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--color-primary-muted)',
      color: 'var(--color-primary)',
      marginLeft: 4,
    }}>
      AI/ML
    </span>
  </div>
);
