export type SourceClass =
  | 'Statute'
  | 'Regulation'
  | 'Final guidance'
  | 'Draft guidance'
  | 'Standard'
  | 'Internal conservative policy'
  | 'Best practice';

export function classifySource(source: string): SourceClass {
  if (/FD&C Act|FDORA|21 U\.S\.C\.|§\d{3}[A-Z]/i.test(source)) return 'Statute';
  if (/21 CFR|QMSR|Part \d{3}/.test(source)) return 'Regulation';
  if (/draft/i.test(source)) return 'Draft guidance';
  if (/ISO|IEC|IMDRF/.test(source)) return 'Standard';
  if (/FDA-|Guidance|guidance|MDCG/.test(source)) return 'Final guidance';
  if (/[Oo]rganization|[Ii]nternal/.test(source)) return 'Internal conservative policy';
  return 'Best practice';
}
