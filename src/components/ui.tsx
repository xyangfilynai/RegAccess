import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import {
  glossary,
  guidanceLinks,
  findGuidanceLink,
} from '../lib/content';

/* ── Collapsible ── */

interface CollapsibleProps {
  label: React.ReactNode;
  icon?: string;
  color?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  label,
  icon,
  color,
  defaultOpen = false,
  children,
  badge,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: color || 'var(--color-text-tertiary)',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          padding: '4px 0',
          width: '100%',
          textAlign: 'left',
        }}
      >
        {icon && <Icon name={icon} size={12} color={color || 'var(--color-text-tertiary)'} />}
        <span style={{ flex: 1 }}>{label}</span>
        {badge && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
              background: 'var(--color-bg-hover)',
              color: 'var(--color-text-tertiary)',
              marginRight: 4,
            }}
          >
            {badge}
          </span>
        )}
        <span
          style={{
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .15s ease',
            display: 'inline-flex',
            flexShrink: 0,
          }}
        >
          <Icon name="arrow" size={10} color={color || 'var(--color-text-tertiary)'} />
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 6, animation: 'fadeIn .15s ease' }}>
          {children}
        </div>
      )}
    </div>
  );
};

/* ── ReportSection ── */

interface ReportSectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
  accentColor?: string;
  subtitle?: string;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  icon,
  defaultOpen = false,
  children,
  count,
  accentColor,
  subtitle,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const accent = accentColor || '#334155';
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '14px 20px',
          background: open ? 'var(--color-bg-elevated)' : '#fafafa',
          border: `1px solid ${open ? 'var(--color-border)' : 'var(--color-border)'}`,
          borderRadius: open ? '10px 10px 0 0' : 10,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'all .15s ease',
        }}
      >
        <Icon name={icon || 'info'} size={15} color={accent} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
            {title}
          </span>
          {subtitle && (
            <span
              style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginLeft: 8 }}
            >
              {subtitle}
            </span>
          )}
        </span>
        {count !== undefined && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              background:
                accent === 'var(--color-danger)'
                  ? 'var(--color-danger-border)'
                  : accent === 'var(--color-warning)'
                    ? 'var(--color-warning-border)'
                    : 'var(--color-bg-hover)',
              color:
                accent === 'var(--color-danger)'
                  ? 'var(--color-danger)'
                  : accent === 'var(--color-warning)'
                    ? 'var(--color-warning)'
                    : 'var(--color-text-tertiary)',
            }}
          >
            {count}
          </span>
        )}
        <span
          style={{
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .2s ease',
            display: 'inline-flex',
          }}
        >
          <Icon name="arrow" size={12} color="var(--color-text-tertiary)" />
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: '18px 20px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            animation: 'fadeIn .15s ease',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

/* ── Debounced input hook (shared by DebouncedText & DebouncedNumber) ── */

function useDebouncedValue(value: string, onChange: (value: string) => void) {
  const [local, setLocal] = useState(value || '');
  const committed = useRef(value || '');
  useEffect(() => {
    if (value !== committed.current) {
      setLocal(value || '');
      committed.current = value || '';
    }
  }, [value]);
  const commit = () => {
    if (local !== committed.current) {
      committed.current = local;
      onChange(local);
    }
  };
  return { local, setLocal, commit };
}

/* ── DebouncedText ── */

interface DebouncedTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export const DebouncedText: React.FC<DebouncedTextProps> = ({
  value,
  onChange,
  placeholder,
  rows,
}) => {
  const { local, setLocal, commit } = useDebouncedValue(value, onChange);
  return (
    <textarea
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      placeholder={placeholder || 'Describe in detail...'}
      rows={rows || 3}
      style={{
        padding: '10px 14px',
        borderRadius: 7,
        border: '1.5px solid var(--color-border)',
        fontSize: 14,
        fontFamily: 'var(--font-sans)',
        width: '100%',
        outline: 'none',
        resize: 'vertical',
        lineHeight: 1.6,
        boxSizing: 'border-box',
      }}
    />
  );
};

/* ── DebouncedNumber ── */

interface DebouncedNumberProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const DebouncedNumber: React.FC<DebouncedNumberProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const { local, setLocal, commit } = useDebouncedValue(value, onChange);
  return (
    <input
      type="number"
      min="0"
      max="999"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      placeholder={placeholder || 'Enter number'}
      style={{
        padding: '10px 14px',
        borderRadius: 7,
        border: '1.5px solid var(--color-border)',
        fontSize: 14,
        fontFamily: 'var(--font-sans)',
        width: 140,
        outline: 'none',
      }}
    />
  );
};

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

export const GuidanceRef: React.FC<GuidanceRefProps> = ({
  code,
  showSection = true,
}) => {
  const link = findGuidanceLink(code);
  if (!link)
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{code}</span>
    );
  const section = code
    .replace(link.shortName, '')
    .replace(code.split(' ')[0], '')
    .trim();
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
      title={link.fullName + (section ? ` — ${section}` : '')}
    >
      {link.fullName}
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

interface RefPattern {
  pattern: RegExp;
  code: string;
}

interface HelpTextWithLinksProps {
  text: string;
}

export const HelpTextWithLinks: React.FC<HelpTextWithLinksProps> = ({
  text,
}) => {
  if (!text) return null;

  const refPatterns: RefPattern[] = [
    { pattern: /FDA Software Change Guidance[^.;,)"]*/g, code: 'FDA-SW-510K-2017' },
    { pattern: /FDA PCCP Final Guidance[^.;,)"]*/g, code: 'FDA-PCCP-2025' },
    { pattern: /FDA AI-DSF Guidance[^.;,)"]*/g, code: 'FDA-LIFECYCLE-2025' },
    { pattern: /FDA Cybersecurity Guidance[^.;,)"]*/g, code: 'FDA-CYBER-2026' },
    { pattern: /21 CFR 807\.81\(a\)\(3\)/g, code: '21 CFR 807.81(a)(3)' },
    { pattern: /21 CFR 814\.39[^.;,)"\s]*/g, code: '21 CFR 814.39' },
    { pattern: /21 CFR 814\.84/g, code: '21 CFR 814.84' },
    { pattern: /MDCG 2020-3[^.;,)"]*/g, code: 'MDCG-2020-3' },
    { pattern: /MDCG 2025-6[^.;,)"]*/g, code: 'MDCG 2025-6' },
    { pattern: /MDCG 2022-6/g, code: 'MDCG-2022-6' },
    { pattern: /EU AI Act Article[^.;,)"]*/g, code: 'EU AI Act' },
    { pattern: /ISO 14971[^.;,)"]*/g, code: 'ISO 14971:2019' },
    { pattern: /IEC 62304[^.;,)"]*/g, code: 'IEC 62304' },
    { pattern: /ISO 13485[^.;,)"]*/g, code: 'ISO 13485:2016' },
    { pattern: /FDORA §515C/g, code: 'FDORA 515C' },
    { pattern: /§524B/g, code: 'FD&C 524B' },
    { pattern: /Pre-Submission \(Q-Sub\)/g, code: 'FDA Q-Sub' },
    { pattern: /QMSR/g, code: 'QMSR' },
  ];

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
      segments.push({
        type: 'link',
        value: link.fullName,
        url: link.url,
        fullName: link.fullName,
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

/* ── ConfBadge ── */

interface ConfBadgeProps {
  level: 'HIGH' | 'MODERATE' | 'LOW';
  size?: 'md' | 'lg';
}

const confBadgeLabels: Record<string, string> = {
  HIGH: 'CONSISTENT',
  MODERATE: 'REVIEW NEEDED',
  LOW: 'INCOMPLETE',
};

export const ConfBadge: React.FC<ConfBadgeProps> = ({
  level,
  size = 'md',
}) => {
  const colors: Record<string, { bg: string; color: string; border: string }> =
    {
      HIGH: { bg: '#d1fae5', color: 'var(--color-success)', border: '#C6E7D4' },
      MODERATE: { bg: 'var(--color-warning-border)', color: 'var(--color-warning)', border: '#F5E6B8' },
      LOW: { bg: 'var(--color-danger-border)', color: 'var(--color-danger)', border: '#F5CACA' },
    };
  const c = colors[level] || colors.MODERATE;
  const s =
    size === 'lg'
      ? { px: 16, py: 8, fs: 14 }
      : { px: 10, py: 4, fs: 11 };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: `${s.py}px ${s.px}px`,
        background: c.bg,
        color: c.color,
        borderRadius: 6,
        fontSize: s.fs,
        fontWeight: 700,
        letterSpacing: '.6px',
        border: `1px solid ${c.border}`,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: c.color,
          flexShrink: 0,
        }}
      />{' '}
      {confBadgeLabels[level] || level}
    </span>
  );
};

/* ── AuthorityTag ── */

interface AuthorityTagProps {
  level: string;
  compact?: boolean;
}

export const AuthorityTag: React.FC<AuthorityTagProps> = ({
  level,
  compact = false,
}) => {
  const levels: Record<
    string,
    { label: string; bg: string; color: string; border: string; icon: string }
  > = {
    regulation: {
      label: 'REGULATION',
      bg: '#EFF6FF',
      color: '#2563EB',
      border: '#D0E3FF',
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

/* ── RadioRow ── */

interface RadioRowProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export const RadioRow: React.FC<RadioRowProps> = ({
  name,
  value,
  onChange,
  options,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {options.map((opt) => (
      <label
        key={opt}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          padding: '6px 10px',
          borderRadius: 6,
          background: value === opt ? 'var(--color-info-border)' : 'transparent',
          border: `1px solid ${value === opt ? '#BFDBFE' : 'transparent'}`,
          transition: 'all .1s',
        }}
      >
        <input
          type="radio"
          name={name}
          value={opt}
          checked={value === opt}
          onChange={() => onChange(opt)}
          style={{ accentColor: 'var(--color-primary)' }}
        />
        <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{opt}</span>
      </label>
    ))}
  </div>
);

/* ── CheckboxGroup ── */

interface CheckboxGroupProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  values,
  onChange,
  options,
}) => {
  const toggle = (opt: string) => {
    const current = values || [];
    onChange(
      current.includes(opt)
        ? current.filter((v) => v !== opt)
        : [...current, opt],
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {options.map((opt) => (
        <label
          key={opt}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: 6,
            background: (values || []).includes(opt)
              ? 'var(--color-info-border)'
              : 'transparent',
            border: `1px solid ${(values || []).includes(opt) ? '#BFDBFE' : 'transparent'}`,
            transition: 'all .1s',
          }}
        >
          <input
            type="checkbox"
            checked={(values || []).includes(opt)}
            onChange={() => toggle(opt)}
            style={{ accentColor: 'var(--color-primary)' }}
          />
          <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{opt}</span>
        </label>
      ))}
    </div>
  );
};

/* ── GlossaryPanel ── */

interface GlossaryPanelProps {
  searchTerm?: string;
}

export const GlossaryPanel: React.FC<GlossaryPanelProps> = ({ searchTerm = '' }) => {
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  const filteredTerms = Object.entries(glossary).filter(([term, definition]) => {
    const search = localSearch.toLowerCase();
    return term.toLowerCase().includes(search) || definition.toLowerCase().includes(search);
  });

  const toggleTerm = (term: string) => {
    const newSet = new Set(expandedTerms);
    if (newSet.has(term)) {
      newSet.delete(term);
    } else {
      newSet.add(term);
    }
    setExpandedTerms(newSet);
  };

  return (
    <div>
      {/* Search input */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search glossary..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 7,
            border: '1.5px solid var(--color-border)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Terms list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredTerms.length === 0 ? (
          <div style={{
            padding: 16,
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 13,
          }}>
            No glossary terms match your search.
          </div>
        ) : (
          filteredTerms.map(([term, definition]) => {
            const isExpanded = expandedTerms.has(term);
            return (
              <div key={term} style={{
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => toggleTerm(term)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '12px 16px',
                    background: isExpanded ? '#fafafa' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                  }}>
                    {term}
                  </span>
                  <span style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform .15s ease',
                    display: 'inline-flex',
                    flexShrink: 0,
                  }}>
                    <Icon name="arrow" size={12} color="var(--color-text-tertiary)" />
                  </span>
                </button>
                {isExpanded && (
                  <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: 'var(--color-text)',
                    animation: 'fadeIn .15s ease',
                  }}>
                    <HelpTextWithLinks text={definition} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
