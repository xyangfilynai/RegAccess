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
