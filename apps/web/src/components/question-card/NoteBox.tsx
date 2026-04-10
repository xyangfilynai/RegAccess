import React from 'react';
import { Icon } from '../Icon';

/** Reusable note box for contextual information (guidance, warnings, info notes). */
export const NoteBox: React.FC<{
  variant: 'info' | 'warning' | 'success' | 'neutral';
  icon?: string;
  label?: string;
  children: React.ReactNode;
}> = ({ variant, icon, label, children }) => {
  const variantMap = {
    info: { bg: 'var(--color-info-bg)', border: 'var(--color-info-border)', color: 'var(--color-info)' },
    warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)', color: 'var(--color-warning)' },
    success: { bg: 'var(--color-success-bg)', border: 'var(--color-success-border)', color: 'var(--color-success)' },
    neutral: { bg: 'var(--color-bg-hover)', border: 'var(--color-border)', color: 'var(--color-text-secondary)' },
  };
  const v = variantMap[variant];
  return (
    <div
      style={{
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        background: v.bg,
        border: `1px solid ${v.border}`,
        marginBottom: 'var(--space-md)',
        display: icon ? 'flex' : 'block',
        gap: 'var(--space-sm)',
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
      }}
    >
      {icon && <Icon name={icon} size={16} color={v.color} style={{ flexShrink: 0, marginTop: 2 }} />}
      <div>
        {label && (
          <>
            <strong style={{ color: v.color }}>{label}:</strong>{' '}
          </>
        )}
        {children}
      </div>
    </div>
  );
};
