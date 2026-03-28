import { describe, expect, it } from 'vitest';
import { SAMPLE_CASES } from '../src/sample-cases';
import {
  computeDetermination,
  computeDerivedState,
  getBlocks,
  getBlockFields,
} from '../src/lib/assessment-engine';

describe('App shell sample library compatibility', () => {
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
