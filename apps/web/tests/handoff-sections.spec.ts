import { describe, expect, it } from 'vitest';

import { Answer, computeDetermination } from '../src/lib/assessment-engine';
import { getSections } from '../src/lib/handoff-checklist';
import { base510k, baseDeNovo, basePMA } from './helpers';

describe('getSections', () => {
  describe('PCCP Implementation pathway', () => {
    it('returns PCCP-specific sections for 510(k) PCCP implementation', () => {
      const answers = base510k({
        A2: Answer.Yes,
        C3: Answer.Yes,
        P1: Answer.Yes,
        P2: Answer.Yes,
        P3: Answer.Yes,
        P4: Answer.Yes,
        P5: Answer.Yes,
      });
      const det = computeDetermination(answers);
      expect(det.isPCCPImpl).toBe(true);

      const sections = getSections(det, answers);
      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe('Scope Verification Record');
      expect(sections[1].title).toBe('Validation per PCCP Protocol');
      expect(sections[2].title).toBe('Risk, Labeling & Monitoring');
    });

    it('includes PMA Annual Report reference for PMA PCCP implementation', () => {
      const answers = basePMA({
        A2: Answer.Yes,
        C_PMA1: Answer.Yes,
        P1: Answer.Yes,
        P2: Answer.Yes,
        P3: Answer.Yes,
        P4: Answer.Yes,
        P5: Answer.Yes,
      });
      const det = computeDetermination(answers);
      expect(det.isPCCPImpl).toBe(true);

      const sections = getSections(det, answers);
      const riskSection = sections[2];
      const pmaItem = riskSection.items.find((i) => i.includes('PMA Annual Report'));
      expect(pmaItem).toBeDefined();
    });
  });

  describe('PMA Annual Report pathway', () => {
    it('returns PMA Annual Report sections', () => {
      const answers = basePMA({ C_PMA1: Answer.No });
      const det = computeDetermination(answers);
      expect(det.isPMAAnnualReport).toBe(true);

      const sections = getSections(det, answers);
      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe('Letter to File & Annual Report');
      expect(sections[0].items.some((i) => i.includes('21 CFR 814.84'))).toBe(true);
    });
  });

  describe('Letter to File pathway', () => {
    it('returns LTF sections for non-significant change', () => {
      const answers = base510k();
      const det = computeDetermination(answers);
      expect(det.isLetterToFile).toBe(true);

      const sections = getSections(det, answers);
      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe('Letter to File');
      expect(sections[0].items.some((i) => i.includes('non-significant'))).toBe(true);
    });

    it('uses cybersecurity-only basis when applicable', () => {
      const answers = base510k({ C1: Answer.Yes });
      const det = computeDetermination(answers);
      expect(det.isCyberOnly).toBe(true);

      const sections = getSections(det, answers);
      expect(sections[0].items.some((i) => i.includes('cybersecurity-only'))).toBe(true);
    });

    it('uses restore-to-spec basis for bug fixes', () => {
      const answers = base510k({ C1: Answer.No, C2: Answer.Yes });
      const det = computeDetermination(answers);
      expect(det.isBugFix).toBe(true);

      const sections = getSections(det, answers);
      expect(sections[0].items.some((i) => i.includes('restore to cleared specification'))).toBe(true);
    });
  });

  describe('PMA Supplement pathway', () => {
    it('returns PMA supplement sections', () => {
      const answers = basePMA({ C_PMA1: Answer.Yes, C_PMA4: '180-Day Supplement (§814.39(a))' });
      const det = computeDetermination(answers);
      expect(det.pmaRequiresSupplement).toBe(true);

      const sections = getSections(det, answers);
      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe('Supplement Type');
      expect(sections[0].items[0]).toContain('180-Day Supplement');
    });
  });

  describe('New Submission pathway', () => {
    it('returns 510(k) predicate strategy sections', () => {
      const answers = base510k({ B3: Answer.Yes });
      const det = computeDetermination(answers);

      const sections = getSections(det, answers);
      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe('Predicate Strategy');
      expect(sections[0].items.some((i) => i.includes('predicate'))).toBe(true);
    });

    it('returns De Novo device-type strategy sections', () => {
      const answers = baseDeNovo({ B3: Answer.Yes });
      const det = computeDetermination(answers);

      const sections = getSections(det, answers);
      expect(sections[0].title).toBe('Device-Type / Submission Strategy');
      expect(sections[0].items.some((i) => i.includes('De Novo'))).toBe(true);
    });
  });

  describe('all pathways', () => {
    it('every section has sequential numbering starting at 1', () => {
      const cases = [
        base510k(),
        basePMA({ C_PMA1: Answer.No }),
        basePMA({ C_PMA1: Answer.Yes }),
        base510k({ B3: Answer.Yes }),
        baseDeNovo({ B3: Answer.Yes }),
      ];
      for (const answers of cases) {
        const det = computeDetermination(answers);
        const sections = getSections(det, answers);
        sections.forEach((s, i) => {
          expect(s.n).toBe(i + 1);
        });
      }
    });

    it('every section has a non-empty title, detail, and at least one item', () => {
      const cases = [
        base510k(),
        basePMA({ C_PMA1: Answer.No }),
        basePMA({ C_PMA1: Answer.Yes }),
        base510k({ B3: Answer.Yes }),
      ];
      for (const answers of cases) {
        const det = computeDetermination(answers);
        const sections = getSections(det, answers);
        for (const s of sections) {
          expect(s.title.length).toBeGreaterThan(0);
          expect(s.detail.length).toBeGreaterThan(0);
          expect(s.items.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
