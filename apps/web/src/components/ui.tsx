import React from 'react';
import { guidanceLinks, findGuidanceLink, guidanceLinkPatterns, type RefPattern } from '../lib/content';

/* ── Shared external-link icon (used by GuidanceRef & HelpTextWithLinks) ── */

const ExternalLinkIcon: React.FC<{ size?: number; opacity?: number }> = ({ size = 10, opacity = 0.6 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{
      display: 'inline-block',
      verticalAlign: 'middle',
      marginLeft: size > 9 ? 3 : 2,
      flexShrink: 0,
      opacity,
    }}
  >
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeWidth="2" stroke="currentColor" fill="none" />
    <polyline points="15,3 21,3 21,9" strokeWidth="2" stroke="currentColor" fill="none" />
    <line x1="10" y1="14" x2="21" y2="3" strokeWidth="2" stroke="currentColor" />
  </svg>
);

/* ── GuidanceRef ── */

interface GuidanceRefProps {
  code: string;
  showSection?: boolean;
}

export const GuidanceRef: React.FC<GuidanceRefProps> = ({ code, showSection = true }) => {
  const link = findGuidanceLink(code);
  if (!link) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{code}</span>;
  const linkLabel = link.fullName || link.shortName || code;
  const shortName = link.shortName || '';
  const section = code.replace(shortName, '').replace(code.split(' ')[0], '').trim();
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--color-primary)',
        textDecoration: 'none',
        borderBottom: '1px solid rgba(8, 145, 178, 0.2)',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        display: 'inline',
      }}
      title={linkLabel + (section ? ` — ${section}` : '')}
    >
      {linkLabel}
      {showSection && section ? ` ${section}` : ''}
      <ExternalLinkIcon />
    </a>
  );
};

/* ── HelpTextWithLinks ── */

interface HelpTextSegment {
  type: 'text' | 'link';
  value: string;
  url?: string;
  fullName?: string;
}

interface HelpTextWithLinksProps {
  text: string;
}

export const HelpTextWithLinks: React.FC<HelpTextWithLinksProps> = ({ text }) => {
  if (!text) return null;

  const refPatterns = guidanceLinkPatterns;

  const segments: HelpTextSegment[] = [];
  let remaining = text;
  let safetyCounter = 0;

  while (remaining.length > 0 && safetyCounter < 200) {
    safetyCounter++;
    let earliestMatch: RegExpExecArray | null = null;
    let earliestIndex = remaining.length;
    let matchedPattern: RefPattern | null = null;

    for (const ref of refPatterns) {
      const regex = new RegExp(ref.pattern.source, 'g');
      const match = regex.exec(remaining);
      if (match && match.index < earliestIndex) {
        earliestMatch = match;
        earliestIndex = match.index;
        matchedPattern = ref;
      }
    }

    if (!earliestMatch || !matchedPattern) {
      segments.push({ type: 'text', value: remaining });
      break;
    }

    if (earliestIndex > 0) {
      segments.push({
        type: 'text',
        value: remaining.substring(0, earliestIndex),
      });
    }
    const link = guidanceLinks[matchedPattern.code];
    if (link) {
      const displayLabel = earliestMatch[0];
      const hoverLabel = link.fullName || link.shortName || displayLabel;
      segments.push({
        type: 'link',
        value: displayLabel,
        url: link.url,
        fullName: hoverLabel,
      });
    } else {
      segments.push({ type: 'text', value: earliestMatch[0] });
    }
    remaining = remaining.substring(earliestIndex + earliestMatch[0].length);
  }

  return (
    <span>
      {segments.map((seg, i) =>
        seg.type === 'link' ? (
          <a
            key={i}
            href={seg.url}
            target="_blank"
            rel="noopener noreferrer"
            title={seg.fullName}
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              borderBottom: '1px dotted rgba(8, 145, 178, 0.33)',
              fontWeight: 500,
            }}
          >
            {seg.value}
            <ExternalLinkIcon size={9} opacity={0.5} />
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </span>
  );
};

/* ── AuthorityTag ── */

interface AuthorityTagProps {
  level: string;
  compact?: boolean;
}

export const AuthorityTag: React.FC<AuthorityTagProps> = ({ level, compact = false }) => {
  const levels: Record<string, { label: string; bg: string; color: string; border: string; icon: string }> = {
    regulation: {
      label: 'REGULATION',
      bg: '#EFF6FF',
      color: '#2563EB',
      border: '#D0E3FF',
      icon: '\u2696',
    },
    statute: {
      label: 'STATUTE',
      bg: '#EDE9FE',
      color: '#6D28D9',
      border: '#C4B5FD',
      icon: '\u2696',
    },
    final_guidance: {
      label: 'FINAL GUIDANCE',
      bg: '#E7F5EE',
      color: '#1B7D56',
      border: '#C6E7D4',
      icon: '\u2713',
    },
    draft_guidance: {
      label: 'DRAFT GUIDANCE',
      bg: '#FEF7E0',
      color: '#B8860B',
      border: '#F5E6B8',
      icon: '\u25D0',
    },
    best_practice: {
      label: 'BEST PRACTICE',
      bg: '#F8F6F1',
      color: '#64748B',
      border: '#E2DED5',
      icon: '\u25CB',
    },
    internal_policy: {
      label: 'CONSERVATIVE POLICY',
      bg: '#FFF8F0',
      color: '#9B7D5C',
      border: '#F0DCC8',
      icon: '\u25C7',
    },
    standard: {
      label: 'STANDARD',
      bg: '#F0F0FF',
      color: '#6B5CE7',
      border: '#D8D5F0',
      icon: '\u25AA',
    },
  };
  const l = levels[(level || '').toLowerCase()] || levels.final_guidance;
  const isDashed = (level || '').toLowerCase() === 'internal_policy';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 3 : 4,
        padding: compact ? '1px 5px' : '2px 8px',
        borderRadius: 4,
        fontSize: compact ? 8.5 : 9.5,
        fontWeight: 700,
        letterSpacing: '.5px',
        background: l.bg,
        color: l.color,
        border: `1px ${isDashed ? 'dashed' : 'solid'} ${l.border}`,
        lineHeight: 1,
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: compact ? 7 : 8 }}>{l.icon}</span> {l.label}
    </span>
  );
};
