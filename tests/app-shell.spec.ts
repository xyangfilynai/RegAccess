import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAMPLE_CASE_ID,
  SAMPLE_CASE,
  SAMPLE_CASES,
  SAMPLE_CASES_BY_ID,
} from '../src/sampleCase';
import {
  computeDetermination,
  computeDerivedState,
  getBlocks,
  getBlockFields,
} from '../src/lib/assessment-engine';

describe('App shell sample library compatibility', () => {
  it('SAMPLE_CASE remains a compatibility alias for the default source-controlled sample', () => {
    expect(SAMPLE_CASE).toEqual(SAMPLE_CASES_BY_ID[DEFAULT_SAMPLE_CASE_ID].answers);
  });

  it('every source-controlled sample produces a valid determination', () => {
    for (const sampleCase of SAMPLE_CASES) {
      const determination = computeDetermination(sampleCase.answers);
      expect(typeof determination.pathway).toBe('string');
      expect(determination.pathway.length).toBeGreaterThan(0);
    }
  });

  it('every source-controlled sample produces blocks and visible fields without errors', () => {
    for (const sampleCase of SAMPLE_CASES) {
      const derivedState = computeDerivedState(sampleCase.answers);
      const blocks = getBlocks(sampleCase.answers, derivedState);

      expect(blocks.length).toBeGreaterThan(0);

      for (const block of blocks) {
        if (block.id === 'review') continue;
        const fields = getBlockFields(block.id, sampleCase.answers, derivedState);
        expect(fields.length).toBeGreaterThan(0);
      }
    }
  });
});
