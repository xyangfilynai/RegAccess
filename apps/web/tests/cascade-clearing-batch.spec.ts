import { describe, expect, it } from 'vitest';
import {
  Answer,
  AuthPathway,
  applyCascadeClearingBatch,
  type Answers,
} from '@changepath/engine';

describe('applyCascadeClearingBatch (server-side defence)', () => {
  it('clears downstream when only A1 changed in the candidate', () => {
    const baseline: Answers = {
      A1: AuthPathway.FiveOneZeroK,
      B1: 'Software',
      C1: Answer.No,
      P1: Answer.Yes,
    };
    const candidate: Answers = {
      A1: AuthPathway.PMA, // changed
      B1: 'Software', // unchanged in client payload
      C1: Answer.No,
      P1: Answer.Yes,
    };

    const result = applyCascadeClearingBatch(candidate, baseline);

    expect(result.A1).toBe(AuthPathway.PMA);
    // Even though the client did NOT clear these, the server defence does.
    expect(result.B1).toBeUndefined();
    expect(result.C1).toBeUndefined();
    expect(result.P1).toBeUndefined();
  });

  it('preserves a downstream field that was explicitly changed in the same save', () => {
    const baseline: Answers = {
      A1: AuthPathway.FiveOneZeroK,
      B1: 'Software',
      C1: Answer.No,
    };
    // User changed both A1 and B1 in the same save. The new B1 should
    // survive even though its parent A1 also changed — the user clearly
    // intends for it to be the new value.
    const candidate: Answers = {
      A1: AuthPathway.PMA,
      B1: 'Hardware',
      C1: Answer.No, // unchanged from baseline → considered implicit
    };

    const result = applyCascadeClearingBatch(candidate, baseline);

    expect(result.A1).toBe(AuthPathway.PMA);
    expect(result.B1).toBe('Hardware');
    // C1 was not explicitly changed → cleared by both A1 and B1 cascades.
    expect(result.C1).toBeUndefined();
  });

  it('preserves new candidate fields that have no cascade rule', () => {
    const baseline: Answers = {
      A1: AuthPathway.FiveOneZeroK,
    };
    const candidate: Answers = {
      A1: AuthPathway.FiveOneZeroK,
      A2: Answer.Yes, // brand-new field, no cascade
    };

    const result = applyCascadeClearingBatch(candidate, baseline);

    expect(result.A2).toBe(Answer.Yes);
    expect(result.A1).toBe(AuthPathway.FiveOneZeroK);
  });

  it('treats removal as a change to undefined', () => {
    const baseline: Answers = {
      A1: AuthPathway.FiveOneZeroK,
      B1: 'Software',
      C1: Answer.No,
    };
    // Candidate omits B1 entirely.
    const candidate: Answers = {
      A1: AuthPathway.FiveOneZeroK,
      C1: Answer.No,
    };

    const result = applyCascadeClearingBatch(candidate, baseline);

    // B1 → undefined triggers downstream clearing (C1).
    expect(result.B1).toBeUndefined();
    expect(result.C1).toBeUndefined();
  });

  it('is a no-op when candidate equals baseline', () => {
    const baseline: Answers = {
      A1: AuthPathway.FiveOneZeroK,
      B1: 'Software',
      C1: Answer.No,
    };
    const result = applyCascadeClearingBatch({ ...baseline }, baseline);

    expect(result).toEqual(baseline);
  });
});
