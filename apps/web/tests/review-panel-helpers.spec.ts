import { describe, expect, it } from 'vitest';

import { Pathway, computeDetermination } from '../src/lib/assessment-engine';
import { getPathwayConfig, getPrimaryAction, getIncompleteHeading } from '../src/hooks/useReviewPanelData';
import { base510k, basePMA } from './helpers';

describe('getPathwayConfig', () => {
  it('returns success colors for Letter to File without issues', () => {
    const config = getPathwayConfig(Pathway.LetterToFile, false);
    expect(config.accent).toBe('var(--color-success)');
    expect(config.label).toBe('Documentation-only pathway');
  });

  it('returns warning colors for Letter to File with issues', () => {
    const config = getPathwayConfig(Pathway.LetterToFile, true);
    expect(config.accent).toBe('var(--color-warning)');
    expect(config.label).toBe('Documentation-only pathway');
  });

  it('returns success colors for PMA Annual Report without issues', () => {
    const config = getPathwayConfig(Pathway.PMAAnnualReport, false);
    expect(config.accent).toBe('var(--color-success)');
    expect(config.label).toBe('Documentation-only pathway');
  });

  it('returns info colors for PCCP implementation', () => {
    const config = getPathwayConfig(Pathway.ImplementPCCP, false);
    expect(config.accent).toBe('var(--color-info)');
    expect(config.label).toBe('Authorized PCCP pathway');
  });

  it('returns danger colors for New Submission', () => {
    const config = getPathwayConfig(Pathway.NewSubmission, false);
    expect(config.accent).toBe('var(--color-danger)');
    expect(config.label).toBe('Submission pathway');
  });

  it('returns danger colors for PMA Supplement Required', () => {
    const config = getPathwayConfig(Pathway.PMASupplementRequired, false);
    expect(config.accent).toBe('var(--color-danger)');
    expect(config.label).toBe('Submission pathway');
  });

  it('returns warning colors for Assessment Incomplete', () => {
    const config = getPathwayConfig(Pathway.AssessmentIncomplete, false);
    expect(config.accent).toBe('var(--color-warning)');
    expect(config.label).toBe('Assessment not complete');
  });
});

describe('getPrimaryAction', () => {
  it('returns documentation action for Letter to File', () => {
    const det = computeDetermination(base510k());
    const action = getPrimaryAction(det, Pathway.LetterToFile);
    expect(action).toContain('Document');
    expect(action).toContain('QMS');
  });

  it('returns PCCP validation action for ImplementPCCP', () => {
    const det = computeDetermination(base510k());
    const action = getPrimaryAction(det, Pathway.ImplementPCCP);
    expect(action).toContain('PCCP validation protocol');
  });

  it('returns submission action for New Submission', () => {
    const det = computeDetermination(base510k());
    const action = getPrimaryAction(det, Pathway.NewSubmission);
    expect(action).toContain('submission package');
  });

  it('returns PMA supplement action for PMASupplementRequired', () => {
    const det = computeDetermination(basePMA());
    const action = getPrimaryAction(det, Pathway.PMASupplementRequired);
    expect(action).toContain('PMA supplement');
  });

  it('returns intended-use resolution for incomplete with uncertain intended use', () => {
    const det = computeDetermination(base510k({ B3: 'Uncertain' }));
    const action = getPrimaryAction(det, det.pathway);
    expect(action).toContain('intended-use uncertainty');
  });
});

describe('getIncompleteHeading', () => {
  it('returns intended-use heading when B3 is Uncertain', () => {
    const det = computeDetermination(base510k({ B3: 'Uncertain' }));
    expect(getIncompleteHeading(det)).toContain('Intended-Use');
  });

  it('returns PMA heading when PMA significance review is outstanding', () => {
    const det = computeDetermination(basePMA({ C_PMA1: undefined }));
    expect(det.pmaIncomplete).toBe(true);
    expect(getIncompleteHeading(det)).toContain('PMA Significance');
  });

  it('returns PCCP heading when PCCP scope is incomplete', () => {
    const det = computeDetermination(
      base510k({
        A2: 'Yes',
        C3: 'Yes',
        P1: 'Yes',
        // P2 not answered = PCCP incomplete
      }),
    );
    expect(det.pccpIncomplete).toBe(true);
    expect(getIncompleteHeading(det)).toContain('PCCP Scope');
  });

  it('returns significance heading when significance is uncertain', () => {
    const det = computeDetermination(base510k({ C3: 'Uncertain' }));
    expect(det.hasUncertainSignificance).toBe(true);
    expect(getIncompleteHeading(det)).toContain('Significance');
  });

  it('returns generic heading for other incomplete cases', () => {
    // Missing baseline fields
    const det = computeDetermination(base510k({ A1b: undefined, A1c: undefined, A1d: undefined }));
    expect(det.isIncomplete).toBe(true);
    expect(getIncompleteHeading(det)).toContain('Required Fields Outstanding');
  });
});
