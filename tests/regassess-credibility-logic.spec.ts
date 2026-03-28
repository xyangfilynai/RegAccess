import { describe, expect, it } from 'vitest';

import {
  Answer,
  Pathway,
  computeDetermination,
  computeDerivedState,
  getBlocks,
  getBlockFields,
  type Answers,
} from '../src/lib/assessment-engine';
import { computeEvidenceGaps } from '../src/lib/evidence-gaps';
import { formatArtifactAsText, generateAssessmentArtifact } from '../src/lib/report-generator';
import { buildCaseSpecificReasoning } from '../src/lib/case-specific-reasoning';
import { buildEvidenceGapInsightItems, buildExpertReviewItems } from '../src/lib/review-insights';
import { base510k } from './helpers';

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

  it('flags representativeness and subgroup gaps when E1/E2 show incomplete equity evidence', () => {
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

describe('PCCP field sequencing credibility fixes', () => {
  const findQ = (answers: Answers, id: string) => {
    const ds = computeDerivedState(answers);
    return getBlockFields('P', answers, ds).find(q => q.id === id);
  };

  it('keeps downstream PCCP fields hidden until modification-boundary fit is answered Yes', () => {
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
      (blockId: string) => getBlockFields(blockId, answers, ds),
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
      (blockId: string) => getBlockFields(blockId, answers, ds),
    );

    expect(reasoning.primaryReason).toContain('Additional data — new clinical sites');
    expect(reasoning.primaryReason).toContain('does not rule out a new or modified cause of harm');
    expect(reasoning.decisionPath.some((step) => step.includes('New or modified cause of harm: Uncertain'))).toBe(true);
    expect(reasoning.decisionPath.some((step) => step.includes('Clinical performance impact: Yes'))).toBe(true);
    expect(reasoning.narrative.some((paragraph) => paragraph.includes('Canon scanners'))).toBe(true);
  });

  it('makes verification and pathway-change sections case-specific instead of generic', () => {
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
      (blockId: string) => getBlockFields(blockId, answers, ds),
    );

    expect(reasoning.verificationTitle).toBe('What supports this pathway');
    expect(reasoning.counterTitle).toBe('What would change this pathway');
    expect(reasoning.verificationSteps.some((step) => step.includes('which layers were added or removed'))).toBe(true);
    expect(reasoning.verificationSteps.some((step) => step.includes('materially changes a risk control tied to significant harm'))).toBe(true);
    expect(
      reasoning.counterConsiderations.some((step) => step.includes('does not materially change any risk control tied to significant harm')),
    ).toBe(true);
  });
});

describe('Review insight specificity fixes', () => {
  it('turns unresolved significance review items into field-specific expert actions', () => {
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
    const items = buildExpertReviewItems(answers, determination);
    const item = items.find((candidate) => candidate.id === 'nonpma-unresolved-significance-uncertainty-policy');

    expect(item).toBeDefined();
    expect(item?.title).toContain('materially alters a risk control tied to significant harm');
    expect(item?.meta).toContain('Current pathway: New Submission Required');
    expect(item?.actionText).toContain('threshold, guardrail, override, monitoring rule, or mitigation');
  });

  it('turns evidence gaps into change-specific evidence requests instead of generic notes', () => {
    const answers = base510k({
      B1: 'Training Data',
      B2: 'Additional data — new clinical sites',
      B4: 'Adds data from three new hospitals using Canon scanners and a broader protocol mix.',
      C1: Answer.No,
      C2: Answer.No,
      C3: Answer.Uncertain,
      C4: Answer.No,
      C5: Answer.No,
      C6: Answer.Yes,
      E1: Answer.No,
      E2: Answer.No,
    });
    const determination = computeDetermination(answers);
    const gaps = computeEvidenceGaps(answers, determination);
    const items = buildEvidenceGapInsightItems(answers, determination, gaps);

    const representativeness = items.find((item) => item.id === 'GAP-TRAINING-REPR');
    const subgroup = items.find((item) => item.id === 'GAP-SUBGROUP');
    const uncertainty = items.find((item) => item.id === 'GAP-SIG-UNCERTAIN');

    expect(representativeness?.title).toContain('not yet shown to represent the cleared population');
    expect(representativeness?.actionText).toContain('newly added site');
    expect(representativeness?.actionText).toContain('scanner/vendor mix');

    expect(subgroup?.title).toContain('not yet shown for the affected populations');
    expect(subgroup?.actionText).toContain('new-site cohorts');

    expect(uncertainty?.title).toContain('creates a new or modified cause of harm');
    expect(uncertainty?.actionText).toContain('creates a new cause of harm');
  });

  it('prints full source-document names in the exported artifact for the new insight sections', () => {
    const answers = base510k({
      B1: 'Training Data',
      B2: 'Additional data — new clinical sites',
      B4: 'Adds data from three new hospitals using Canon scanners.',
      C1: Answer.No,
      C2: Answer.No,
      C3: Answer.Uncertain,
      C4: Answer.No,
      C5: Answer.No,
      C6: Answer.Yes,
      E1: Answer.No,
      E2: Answer.No,
    });
    const determination = computeDetermination(answers);
    const ds = computeDerivedState(answers);
    const blocks = getBlocks(answers, ds);
    const artifact = generateAssessmentArtifact(
      answers,
      determination,
      blocks,
      (blockId: string) => getBlockFields(blockId, answers, ds),
    );
    const text = formatArtifactAsText(artifact);

    expect(text).toContain('SUMMARY');
    expect(text).toContain('ASSESSMENT BASIS');
    expect(text).toContain('DECISION RATIONALE');
    expect(text).toContain('NEXT STEPS');
    expect(text).toContain('PACKAGE MUST INCLUDE');
    expect(text).toContain('The authorized Indications for Use statement was available, and the change was assessed as staying within the existing intended use and indications for use.');
    expect(text).toContain('No authorized PCCP was on file, so no pre-authorized implementation path was available.');
    expect(text).toContain('Deciding When to Submit a 510(k) for a Software Change to an Existing Device');
    expect(text).not.toContain('ASSUMPTIONS');
    expect(text).not.toContain('UNRESOLVED QUESTIONS');
    expect(text).not.toContain('KEY INPUTS');
  });
});
