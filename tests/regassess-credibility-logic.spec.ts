import { describe, expect, it } from 'vitest';

import {
  Answer,
  AuthPathway,
  Pathway,
  computeDetermination,
  computeDerivedState,
  getBlocks,
  getQuestions,
} from '../src/lib/assessment-engine';
import { computeEvidenceGaps } from '../src/lib/evidence-gaps';
import { generateAssessmentArtifact } from '../src/lib/report-generator';
import { buildCaseSpecificReasoning } from '../src/lib/case-specific-reasoning';

type Answers = Record<string, any>;

const base510k = (overrides: Answers = {}): Answers => ({
  A1: AuthPathway.FiveOneZeroK,
  A1b: 'K123456',
  A1c: 'v1.0',
  A1d: 'Authorized IFU statement',
  A2: Answer.No,
  A3: ['US'],
  A6: ['Traditional ML (e.g., random forest, SVM)'],
  B3: Answer.No,
  C1: Answer.No,
  C2: Answer.No,
  C3: Answer.No,
  C4: Answer.No,
  C5: Answer.No,
  C6: Answer.No,
  ...overrides,
});

describe('Evidence-gap credibility fixes', () => {
  it('does not flag representativeness or subgroup gaps when E1/E2 are answered favorably', () => {
    const answers = base510k({
      E1: Answer.Yes,
      E2: Answer.Yes,
    });
    const determination = computeDetermination(answers);
    const gaps = computeEvidenceGaps(answers, determination);

    expect(gaps.some(g => g.id === 'GAP-TRAINING-REPR')).toBe(false);
    expect(gaps.some(g => g.id === 'GAP-SUBGROUP')).toBe(false);
  });

  it('flags representativeness and subgroup gaps when E1/E2 show missing equity evidence', () => {
    const answers = base510k({
      E1: Answer.No,
      E2: Answer.No,
    });
    const determination = computeDetermination(answers);
    const gaps = computeEvidenceGaps(answers, determination);

    expect(gaps.some(g => g.id === 'GAP-TRAINING-REPR')).toBe(true);
    expect(gaps.some(g => g.id === 'GAP-SUBGROUP')).toBe(true);
  });
});

describe('PCCP question sequencing credibility fixes', () => {
  const findQ = (answers: Answers, id: string) => {
    const ds = computeDerivedState(answers);
    return getQuestions('P', answers, ds).find(q => q.id === id);
  };

  it('keeps downstream PCCP questions hidden until modification-boundary fit is answered Yes', () => {
    const base = base510k({ A2: Answer.Yes, P1: Answer.Yes });

    expect(findQ(base, 'P3')?.skip).toBe(true);
    expect(findQ({ ...base, P2: Answer.Uncertain }, 'P3')?.skip).toBe(true);
    expect(findQ({ ...base, P2: Answer.Yes }, 'P3')?.skip).toBe(false);
  });
});

describe('Authority/source classification credibility fixes', () => {
  it('classifies ISO/IEC requirements as standards in generated artifacts', () => {
    const answers = base510k();
    const determination = computeDetermination(answers);
    const ds = computeDerivedState(answers);
    const blocks = getBlocks(answers, ds);
    const artifact = generateAssessmentArtifact(
      answers,
      determination,
      blocks,
      (blockId: string) => getQuestions(blockId, answers, ds),
    );

    expect(artifact.outcome.pathway).toBe(Pathway.LetterToFile);
    expect(
      artifact.documentationRequirements.required.some(
        d => d.source.includes('ISO 14971') && d.sourceClass === 'Standard',
      ),
    ).toBe(true);
    expect(
      artifact.documentationRequirements.required.some(
        d => d.source.includes('IEC 62304') && d.sourceClass === 'Standard',
      ),
    ).toBe(true);
  });
});

describe('Case-specific reasoning credibility fixes', () => {
  it('builds reasoning from the actual trigger answers and submitted case facts', () => {
    const answers = base510k({
      A1c: 'v3.2.1',
      B1: 'Training Data',
      B2: 'Additional data — new clinical sites',
      B4: 'The updated model uses data from new clinical sites, including Canon scanners, and the submitted analysis reports lower sensitivity for small nodules on Canon systems.',
      C1: Answer.No,
      C2: Answer.No,
      C3: Answer.Uncertain,
      C4: Answer.No,
      C5: Answer.No,
      C6: Answer.Yes,
      E1: Answer.Uncertain,
      E4: Answer.No,
    });
    const determination = computeDetermination(answers);
    const ds = computeDerivedState(answers);
    const blocks = getBlocks(answers, ds);
    const reasoning = buildCaseSpecificReasoning(
      answers,
      determination,
      blocks,
      (blockId: string) => getQuestions(blockId, answers, ds),
    );

    expect(reasoning.primaryReason).toContain('Additional data — new clinical sites');
    expect(reasoning.primaryReason).toContain('question C3 was answered Uncertain');
    expect(reasoning.decisionPath.some((step) => step.includes('Risk significance screen (C3): Uncertain'))).toBe(true);
    expect(reasoning.decisionPath.some((step) => step.includes('Clinical performance screen (C6): Yes'))).toBe(true);
    expect(reasoning.narrative.some((paragraph) => paragraph.includes('Canon scanners'))).toBe(true);
  });

  it('makes verification and route-change sections case-specific instead of generic', () => {
    const answers = base510k({
      B1: 'Model Architecture',
      B2: 'Layer addition / removal',
      B4: 'The architecture update adds an intermediate attention block.',
      C1: Answer.No,
      C2: Answer.No,
      C3: Answer.No,
      C4: Answer.No,
      C5: Answer.Uncertain,
      C6: Answer.No,
    });
    const determination = computeDetermination(answers);
    const ds = computeDerivedState(answers);
    const blocks = getBlocks(answers, ds);
    const reasoning = buildCaseSpecificReasoning(
      answers,
      determination,
      blocks,
      (blockId: string) => getQuestions(blockId, answers, ds),
    );

    expect(reasoning.verificationTitle).toBe('What Evidence Confirms This Route');
    expect(reasoning.counterTitle).toBe('What Would Need To Change To Avoid This Route');
    expect(reasoning.verificationSteps.some((step) => step.includes('Layer addition / removal'))).toBe(true);
    expect(reasoning.verificationSteps.some((step) => step.includes('Resolve C5'))).toBe(true);
    expect(
      reasoning.counterConsiderations.some((step) => step.includes('revising C5 to No')),
    ).toBe(true);
  });
});
