import { describe, expect, it } from 'vitest';
import { Answer, AuthPathway, type Answers } from '../src/lib/assessment-engine';
import { applyCascadeClearing } from '../src/hooks/useCascadeClearing';

describe('Cascade clearing rules', () => {
  describe('A1 change', () => {
    it('clears all downstream B/C/P/D/E/F fields when A1 changes', () => {
      const prev: Answers = {
        A1: AuthPathway.FiveOneZeroK,
        A2: Answer.No,
        B1: 'Software',
        B2: 'Bug fix',
        C1: Answer.No,
        P1: Answer.Yes,
        D1: 'some data',
        E1: Answer.No,
        F1: 'file ref',
      };
      const result = applyCascadeClearing('A1', AuthPathway.PMA, prev);

      expect(result.A1).toBe(AuthPathway.PMA);
      expect(result.A2).toBe(Answer.No); // A-prefixed fields NOT cleared
      expect(result.B1).toBeUndefined();
      expect(result.B2).toBeUndefined();
      expect(result.C1).toBeUndefined();
      expect(result.P1).toBeUndefined();
      expect(result.D1).toBeUndefined();
      expect(result.E1).toBeUndefined();
      expect(result.F1).toBeUndefined();
    });

    it('does not clear when A1 is set to the same value', () => {
      const prev: Answers = {
        A1: AuthPathway.FiveOneZeroK,
        B1: 'Software',
        C1: Answer.No,
      };
      const result = applyCascadeClearing('A1', AuthPathway.FiveOneZeroK, prev);

      expect(result.B1).toBe('Software');
      expect(result.C1).toBe(Answer.No);
    });
  });

  describe('B1 change', () => {
    it('clears B2 and all C/P/D/E/F fields when B1 changes', () => {
      const prev: Answers = {
        A1: AuthPathway.FiveOneZeroK,
        B1: 'Software',
        B2: 'Bug fix',
        B3: Answer.Yes,
        C1: Answer.No,
        P1: Answer.Yes,
      };
      const result = applyCascadeClearing('B1', 'Hardware', prev);

      expect(result.B1).toBe('Hardware');
      expect(result.B2).toBeUndefined();
      expect(result.B3).toBe(Answer.Yes); // B3 NOT cleared (not Intended Use)
      expect(result.C1).toBeUndefined();
      expect(result.P1).toBeUndefined();
      expect(result.A1).toBe(AuthPathway.FiveOneZeroK); // A fields preserved
    });

    it('does not clear when B1 is set to the same value', () => {
      const prev: Answers = {
        B1: 'Software',
        B2: 'Bug fix',
        C1: Answer.No,
      };
      const result = applyCascadeClearing('B1', 'Software', prev);

      expect(result.B2).toBe('Bug fix');
      expect(result.C1).toBe(Answer.No);
    });

    it('clears B3 when changing away from Intended Use', () => {
      const prev: Answers = {
        B1: 'Intended Use / Indications for Use',
        B3: Answer.Yes,
      };
      const result = applyCascadeClearing('B1', 'Software', prev);

      expect(result.B3).toBeUndefined();
    });

    it('does not clear B3 when changing TO Intended Use', () => {
      const prev: Answers = {
        B1: 'Software',
        B3: Answer.Yes,
      };
      const result = applyCascadeClearing('B1', 'Intended Use / Indications for Use', prev);

      expect(result.B3).toBe(Answer.Yes);
    });
  });

  describe('non-cascade fields', () => {
    it('does not trigger cascade for other field changes', () => {
      const prev: Answers = {
        A1: AuthPathway.FiveOneZeroK,
        B1: 'Software',
        C1: Answer.No,
        C2: Answer.Yes,
      };
      const result = applyCascadeClearing('C1', Answer.Yes, prev);

      expect(result.C1).toBe(Answer.Yes);
      expect(result.C2).toBe(Answer.Yes);
      expect(result.B1).toBe('Software');
    });
  });
});
