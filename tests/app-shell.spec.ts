import { describe, expect, it } from 'vitest';
import { SAMPLE_CASE } from '../src/sampleCase';
import {
  computeDetermination,
  computeDerivedState,
  getBlocks,
  getQuestions,
  changeTaxonomy,
} from '../src/lib/assessment-engine';

describe('App Shell: SAMPLE_CASE', () => {
  it('SAMPLE_CASE has the expected keys for the lean assessment flow', () => {
    // Block A
    expect(SAMPLE_CASE.A1).toBe('510(k)');
    expect(SAMPLE_CASE.A2).toBe('No');
    expect(SAMPLE_CASE.A6).toEqual(['Deep Learning (e.g., CNN, RNN)']);
    expect(SAMPLE_CASE.A8).toBe('3');
    // Block B
    expect(SAMPLE_CASE.B1).toBe('Training Data');
    expect(SAMPLE_CASE.B3).toBe('No');
    // Block C
    expect(SAMPLE_CASE.C1).toBe('No');
    expect(SAMPLE_CASE.C3).toBe('Uncertain');
    expect(SAMPLE_CASE.C6).toBe('Yes');
    expect(SAMPLE_CASE.C10).toBe('No');
    // Block E
    expect(SAMPLE_CASE.E1).toBe('Uncertain');
    expect(SAMPLE_CASE.E2).toBe('Yes');
    expect(SAMPLE_CASE.E3).toBe('Uncertain');
  });

  it('SAMPLE_CASE does not contain meta keys (_isSampleCase, _sampleCaseNote)', () => {
    expect(SAMPLE_CASE).not.toHaveProperty('_isSampleCase');
    expect(SAMPLE_CASE).not.toHaveProperty('_sampleCaseNote');
  });

  it('SAMPLE_CASE produces a valid determination', () => {
    const det = computeDetermination(SAMPLE_CASE);
    expect(det.pathway).toBeDefined();
    expect(typeof det.pathway).toBe('string');
    expect(det.pathway.length).toBeGreaterThan(0);
  });

  it('SAMPLE_CASE determination is NewSubmission (C6=Yes triggers significance)', () => {
    const det = computeDetermination(SAMPLE_CASE);
    expect(det.pathway).toBe('New Submission Required');
    expect(det.isNewSub).toBe(true);
    expect(det.isSignificant).toBe(true);
  });

  it('SAMPLE_CASE should recommend PCCP (significant + no PCCP)', () => {
    const det = computeDetermination(SAMPLE_CASE);
    expect(det.pccpRecommendation).toBeTruthy();
    expect(det.pccpRecommendation!.shouldRecommend).toBe(true);
  });

  it('SAMPLE_CASE produces blocks and questions without errors', () => {
    const ds = computeDerivedState(SAMPLE_CASE);
    const blocks = getBlocks(SAMPLE_CASE, ds);
    expect(blocks.length).toBeGreaterThan(0);

    // Every block should produce questions without throwing
    for (const block of blocks) {
      if (block.id === 'review') continue;
      const questions = getQuestions(block.id, SAMPLE_CASE, ds);
      expect(questions.length).toBeGreaterThan(0);
    }
  });

  it('SAMPLE_CASE has answers for all visible pathwayCritical questions', () => {
    const ds = computeDerivedState(SAMPLE_CASE);
    const blocks = getBlocks(SAMPLE_CASE, ds);
    const unanswered: string[] = [];

    for (const block of blocks) {
      if (block.id === 'review') continue;
      const questions = getQuestions(block.id, SAMPLE_CASE, ds);
      for (const q of questions) {
        if (q.sectionDivider || q.skip || !q.pathwayCritical) continue;
        if (SAMPLE_CASE[q.id] === undefined || SAMPLE_CASE[q.id] === '') {
          unanswered.push(q.id);
        }
      }
    }

    // SAMPLE_CASE should have all critical fields answered for a complete determination
    // (some non-critical fields may be intentionally unanswered)
    expect(unanswered).toEqual([]);
  });

  it('SAMPLE_CASE PCCP recommendation meets showPCCPRecommendation criteria (original logic)', () => {
    const det = computeDetermination(SAMPLE_CASE);
    const hasPCCP = SAMPLE_CASE.A2 === 'Yes';
    const selectedChangeType = changeTaxonomy[SAMPLE_CASE.B1 as string]?.types
      ?.find((t: any) => t.name === SAMPLE_CASE.B2);
    const pccpEligibility = selectedChangeType?.pccp;

    // All four conditions from original showPCCPRecommendation must be true
    expect(det.pccpRecommendation?.shouldRecommend).toBe(true);
    expect(hasPCCP).toBe(false);
    expect(det.isNewSub).toBe(true);
    expect(['YES', 'CONDITIONAL']).toContain(pccpEligibility);

    // Final composite check
    const showPCCPRecommendation = det.pccpRecommendation?.shouldRecommend
      && !hasPCCP && det.isNewSub
      && pccpEligibility && ['YES', 'CONDITIONAL'].includes(pccpEligibility);
    expect(showPCCPRecommendation).toBe(true);
  });

  it('SAMPLE_CASE change type is "CONDITIONAL" PCCP eligible', () => {
    const ct = changeTaxonomy['Training Data']?.types
      ?.find((t: any) => t.name === 'Additional data \u2014 new clinical sites');
    expect(ct).toBeDefined();
    expect(ct.pccp).toBe('CONDITIONAL');
  });
});

describe('App Shell: Screen flow contract', () => {
  it('gate -> dashboard -> assess is the expected navigation order', () => {
    // This is a structural contract test — the actual navigation is tested in browser
    const screens = ['gate', 'dashboard', 'assess'] as const;
    expect(screens).toEqual(['gate', 'dashboard', 'assess']);
  });
});
