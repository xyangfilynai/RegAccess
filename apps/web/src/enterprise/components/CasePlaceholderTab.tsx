import React from 'react';

/**
 * Generic placeholder used by case-detail tabs whose backing features are
 * still gated behind feature flags (Phase 3-5 work).
 *
 * Rendering this from CaseDetailPage today is intentional: it locks in the
 * 7-tab layout the plan calls for so we don't have to re-flow the page
 * when each feature lands.
 */
export const CasePlaceholderTab: React.FC<{
  title: string;
  description: string;
  flagKey?: string;
}> = ({ title, description, flagKey }) => (
  <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
    <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, maxWidth: 480, margin: '0 auto' }}>{description}</div>
    {flagKey && (
      <div
        style={{
          marginTop: 16,
          display: 'inline-block',
          padding: '4px 10px',
          background: '#f3f4f6',
          borderRadius: 999,
          fontSize: 11,
          color: '#6b7280',
          fontFamily: 'monospace',
        }}
      >
        Gated by feature flag: {flagKey}
      </div>
    )}
  </div>
);
