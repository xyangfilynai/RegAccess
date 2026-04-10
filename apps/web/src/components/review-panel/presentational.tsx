/**
 * Presentational subcomponents for ReviewPanel.
 *
 * These are pure rendering components with no business logic.
 * They receive data via props and render styled elements.
 */

import React from 'react';
import { GuidanceRef, HelpTextWithLinks } from '../ui';
import { findGuidanceLink, getSourceBadge } from '../../lib/content';
import type { MergedBlockerItem, AssessmentRecordFact } from '../../hooks/useReviewPanelData';

/* ------------------------------------------------------------------ */
/*  Layout primitives                                                  */
/* ------------------------------------------------------------------ */

export const SectionCard: React.FC<{
  children: React.ReactNode;
  accentColor?: string;
  background?: string;
  borderColor?: string;
  dataTestId?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  accentColor,
  background = 'var(--color-bg-elevated)',
  borderColor = 'var(--color-border)',
  dataTestId,
  style,
}) => (
  <div
    data-testid={dataTestId}
    style={{
      background,
      border: `1px solid ${borderColor}`,
      borderLeft: accentColor ? `4px solid ${accentColor}` : `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2
    style={{
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--color-text)',
      margin: 0,
      lineHeight: 1.25,
    }}
  >
    {children}
  </h2>
);

export const SubsectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--color-text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: 8,
    }}
  >
    {children}
  </div>
);

export const CompactBadge: React.FC<{ label: string; bg: string; border: string; text: string }> = ({
  label,
  bg,
  border,
  text,
}) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 999,
      background: bg,
      color: text,
      border: `1px solid ${border}`,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Data display components                                            */
/* ------------------------------------------------------------------ */

export const SummaryField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="card-sm">
    <SubsectionLabel>{label}</SubsectionLabel>
    {children}
  </div>
);

export const RecordFactBlock: React.FC<{ fact: AssessmentRecordFact }> = ({ fact }) => (
  <div
    style={{
      padding: fact.isLongText ? '12px 14px' : '10px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 6,
      }}
    >
      {fact.label}
    </div>
    <div
      style={{
        fontSize: 13,
        color: fact.isMissing ? 'var(--color-text-muted)' : 'var(--color-text)',
        lineHeight: 1.6,
        whiteSpace: fact.isLongText ? 'pre-wrap' : 'normal',
        wordBreak: 'break-word',
      }}
    >
      <HelpTextWithLinks text={fact.value} />
    </div>
  </div>
);

export const TraceStep: React.FC<{
  index: number;
  text: string;
}> = ({ index, text }) => (
  <div
    className="card-sm"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
    }}
  >
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 999,
        background: 'var(--color-primary-muted)',
        color: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      {index + 1}
    </div>
    <div
      style={{
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
        minWidth: 0,
      }}
    >
      <HelpTextWithLinks text={text} />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Source references                                                   */
/* ------------------------------------------------------------------ */

export const EvidenceGapSourceRef: React.FC<{ code: string }> = ({ code }) => {
  const link = findGuidanceLink(code);
  const sourceMeta = getSourceBadge(code);

  if (link) {
    return <GuidanceRef code={code} />;
  }

  return (
    <span
      style={{
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5,
      }}
      title={sourceMeta.full}
    >
      {sourceMeta.full}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Issue card                                                         */
/* ------------------------------------------------------------------ */

export const IssueCard: React.FC<{
  item: MergedBlockerItem;
}> = ({ item }) => {
  const uniqueSources = Array.from(new Set(item.sourceRefs));
  const accent =
    item.kind === 'expert'
      ? {
          bg: 'var(--color-warning-bg)',
          border: 'var(--color-warning-border)',
          badgeBg: '#fef3c7',
          badgeText: '#92400e',
        }
      : {
          bg: '#fff7ed',
          border: '#fed7aa',
          badgeBg: '#ffedd5',
          badgeText: '#9a3412',
        };

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: accent.bg,
        border: `1px solid ${accent.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text)',
            lineHeight: 1.45,
            flex: 1,
            minWidth: 0,
          }}
        >
          <HelpTextWithLinks text={item.title} />
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: accent.badgeText,
            background: accent.badgeBg,
            borderRadius: 999,
            padding: '3px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {item.kind === 'expert' ? 'Expert Review' : 'Evidence Gap'}
        </span>
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {item.meta}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <SubsectionLabel>Why It Matters</SubsectionLabel>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <HelpTextWithLinks text={item.whyThisMatters} />
          </div>
        </div>

        <div>
          <SubsectionLabel>{item.actionLabel}</SubsectionLabel>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <HelpTextWithLinks text={item.actionText} />
          </div>
        </div>

        {uniqueSources.length > 0 && (
          <div>
            <SubsectionLabel>Basis</SubsectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {uniqueSources.map((source) => (
                <div key={`${item.title}-${source}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: 'var(--color-text-muted)', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                  <EvidenceGapSourceRef code={source} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
