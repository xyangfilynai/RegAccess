import { describe, expect, it } from 'vitest';
import {
  computeDetermination,
  computeDerivedState,
  getBlocks,
  getBlockFields,
  Pathway,
} from '../src/lib/assessment-engine';
import { SAMPLE_CASES } from '../src/sample-cases';

import type { Answers } from '../src/lib/assessment-engine';

const getVisibleQuestionIds = (answers: Answers) => {
  const derivedState = computeDerivedState(answers);
  const blocks = getBlocks(answers, derivedState);
  const visibleQuestionIds: string[] = [];

  for (const block of blocks) {
    if (block.id === 'review') continue;
    for (const field of getBlockFields(block.id, answers, derivedState)) {
      if (!field.sectionDivider && !field.skip) {
        visibleQuestionIds.push(field.id);
      }
    }
  }

  return visibleQuestionIds;
};

describe('source-controlled sample library', () => {
  it('contains exactly 9 sample cases', () => {
    expect(SAMPLE_CASES).toHaveLength(9);
  });

  it('stores polished metadata for every sample', () => {
    for (const sampleCase of SAMPLE_CASES) {
      expect(sampleCase.title.trim().length).toBeGreaterThan(0);
      expect(sampleCase.shortScenario.trim().length).toBeGreaterThan(0);
      expect(sampleCase.tags.length).toBeGreaterThan(0);
      expect(sampleCase.tags.every((tag) => tag.trim().length > 0)).toBe(true);
    }
  });

  it('covers all 6 pathway outcomes', () => {
    const coveredPathways = new Set(SAMPLE_CASES.map((sampleCase) => sampleCase.expectedPathway));
    expect(coveredPathways).toEqual(
      new Set([
        Pathway.LetterToFile,
        Pathway.ImplementPCCP,
        Pathway.NewSubmission,
        Pathway.PMASupplementRequired,
        Pathway.PMAAnnualReport,
        Pathway.AssessmentIncomplete,
      ]),
    );
  });

  it('matches the required pathway distribution', () => {
    const counts = SAMPLE_CASES.reduce<Record<string, number>>((acc, sampleCase) => {
      acc[sampleCase.expectedPathway] = (acc[sampleCase.expectedPathway] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts[Pathway.LetterToFile]).toBe(2);
    expect(counts[Pathway.ImplementPCCP]).toBe(2);
    expect(counts[Pathway.PMAAnnualReport]).toBe(1);
    expect(counts[Pathway.PMASupplementRequired]).toBe(1);
    expect(counts[Pathway.NewSubmission]).toBe(2);
    expect(counts[Pathway.AssessmentIncomplete]).toBe(1);
  });

  it('includes at least 2 New Submission cases that recommend PCCP', () => {
    const count = SAMPLE_CASES.filter(
      (sampleCase) =>
        sampleCase.expectedPathway === Pathway.NewSubmission &&
        sampleCase.expectedPccpRecommendation,
    ).length;

    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('stores complete visible-question inventories for every sample', () => {
    for (const sampleCase of SAMPLE_CASES) {
      const visibleQuestionIds = getVisibleQuestionIds(sampleCase.answers);

      expect(sampleCase.visibleQuestionIds).toEqual(visibleQuestionIds);

      for (const questionId of visibleQuestionIds) {
        expect(sampleCase.answers[questionId]).not.toBeUndefined();
        expect(sampleCase.answers[questionId]).not.toBe('');
      }
    }
  });

  it('computes the declared pathway and PCCP recommendation for every sample', () => {
    for (const sampleCase of SAMPLE_CASES) {
      const determination = computeDetermination(sampleCase.answers);

      expect(determination.pathway).toBe(sampleCase.expectedPathway);
      expect(Boolean(determination.pccpRecommendation)).toBe(sampleCase.expectedPccpRecommendation);
    }
  });
});
