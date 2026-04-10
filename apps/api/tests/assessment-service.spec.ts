import { describe, it, expect } from 'vitest';
import { executeEngine } from '../src/services/engine-executor';
import { Answer, AuthPathway, Pathway } from '@changepath/engine';

describe('assessmentService.executeEngine', () => {
  it('returns Letter to File for straightforward 510(k) with no significant changes', () => {
    const answers = {
      A1: AuthPathway.FiveOneZeroK,
      A1b: 'K123456',
      A1c: 'v1.0',
      A1d: 'Authorized IFU statement',
      A2: Answer.No,
      A6: ['Traditional ML (e.g., random forest, SVM)'],
      B3: Answer.No,
      C1: Answer.No,
      C2: Answer.No,
      C3: Answer.No,
      C4: Answer.No,
      C5: Answer.No,
      C6: Answer.No,
    };

    const result = executeEngine(answers);

    expect(result.determination.pathway).toBe(Pathway.LetterToFile);
    expect(result.derivedState.hasGenAI).toBe(false);
    expect(result.derivedState.isPMA).toBe(false);
    expect(result.completenessStatus).toBeDefined();
    expect(result.completenessStatus.blocks).toBeInstanceOf(Array);
  });

  it('returns New Submission Required for intended use change', () => {
    const answers = {
      A1: AuthPathway.FiveOneZeroK,
      A1b: 'K123456',
      A1c: 'v1.0',
      A1d: 'Authorized IFU statement',
      A2: Answer.No,
      A6: ['Traditional ML (e.g., random forest, SVM)'],
      B1: 'Intended Use / Indications for Use',
      B3: Answer.Yes,
    };

    const result = executeEngine(answers);

    expect(result.determination.pathway).toBe(Pathway.NewSubmission);
    expect(result.determination.isIntendedUseChange).toBe(true);
    expect(result.derivedState.isCatIntendedUse).toBe(true);
  });

  it('correctly identifies PMA pathway baseline', () => {
    const answers = {
      A1: AuthPathway.PMA,
      A1b: 'P123456',
      A1c: 'v1.0',
      A1d: 'Authorized IFU statement',
      A2: Answer.No,
      A6: ['Traditional ML (e.g., random forest, SVM)'],
      B3: Answer.No,
    };

    const result = executeEngine(answers);

    expect(result.derivedState.isPMA).toBe(true);
    expect(result.derivedState.isDeNovo).toBe(false);
    // PMA with incomplete answers should be either incomplete or PMA-specific
    expect(result.determination.pathway).toBeDefined();
  });

  it('correctly computes completeness status', () => {
    const answers = {
      A1: AuthPathway.FiveOneZeroK,
      // Only partial answers
    };

    const result = executeEngine(answers);

    expect(result.completenessStatus.overallComplete).toBe(false);
    expect(result.completenessStatus.blocks.length).toBeGreaterThan(0);
  });

  it('handles empty answers gracefully', () => {
    const result = executeEngine({});

    expect(result.determination.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(result.derivedState).toBeDefined();
    expect(result.completenessStatus.overallComplete).toBe(false);
  });

  it('detects GenAI state from answer A6', () => {
    const answers = {
      A1: AuthPathway.FiveOneZeroK,
      A6: ['LLM / Large Language Model'],
    };

    const result = executeEngine(answers);
    expect(result.derivedState.hasGenAI).toBe(true);
  });
});
