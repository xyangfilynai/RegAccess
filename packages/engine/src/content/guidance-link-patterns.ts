/**
 * Regex patterns used by HelpTextWithLinks to auto-link regulatory references
 * in free-text help strings. Each pattern maps matched text to a guidance code
 * that resolves via guidanceLinks in regulatory-sources.ts.
 *
 * Centralised here (rather than inline in ui.tsx) so that content authors can
 * add new patterns without modifying React component code, and so tests can
 * validate pattern-to-code consistency against the guidance link registry.
 */

export interface RefPattern {
  pattern: RegExp;
  code: string;
}

export const guidanceLinkPatterns: RefPattern[] = [
  { pattern: /FDA Software Change Guidance(?:\([^)]*\)|[^.;,)"])*/g, code: 'FDA-SW-510K-2017' },
  { pattern: /FDA(?:'s)? PCCP final guidance(?:\([^)]*\)|[^.;,)"])*/gi, code: 'FDA-PCCP-2025' },
  { pattern: /FDA(?:'s)? AI-DSF(?: Lifecycle)? Guidance(?:\([^)]*\)|[^.;,)"])*/gi, code: 'FDA-LIFECYCLE-2025' },
  { pattern: /FDA(?:'s)? Cybersecurity Guidance(?:\([^)]*\)|[^.;,)"])*/gi, code: 'FDA-CYBER-2026' },
  { pattern: /21 CFR 807\.81(?:\([^)]*\))+/g, code: '21 CFR 807.81(a)(3)' },
  { pattern: /21 CFR 814\.39(?:\([^)]*\)|[^.;,)"\s])*/g, code: '21 CFR 814.39' },
  { pattern: /21 CFR 814\.84/g, code: '21 CFR 814.84' },
  { pattern: /MDCG 2020-3(?:\([^)]*\)|[^.;,)"])*/g, code: 'MDCG-2020-3' },
  { pattern: /MDCG 2025-6(?:\([^)]*\)|[^.;,)"])*/g, code: 'MDCG 2025-6' },
  { pattern: /MDCG 2022-6/g, code: 'MDCG-2022-6' },
  { pattern: /EU AI Act Article(?:\([^)]*\)|[^.;,)"])*/g, code: 'EU AI Act' },
  { pattern: /ISO 14971(?:\([^)]*\)|[^.;,)"])*/g, code: 'ISO 14971:2019' },
  { pattern: /IEC 62304(?:\([^)]*\)|[^.;,)"])*/g, code: 'IEC 62304' },
  { pattern: /ISO 13485(?:\([^)]*\)|[^.;,)"])*/g, code: 'ISO 13485:2016' },
  { pattern: /(?:FDORA|FD&C Act) §515C/g, code: 'FDORA 515C' },
  { pattern: /§524B/g, code: 'FD&C 524B' },
  { pattern: /Pre-Submission \(Q-Sub\)/g, code: 'FDA Q-Sub' },
  { pattern: /QMSR/g, code: 'QMSR' },
];
