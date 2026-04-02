import { describe, expect, it } from 'vitest';
import { buildAssessmentName, buildCaseSummary } from '../src/lib/assessment-metadata';
import { getChangeLabel } from '../src/lib/change-utils';

describe('buildCaseSummary', () => {
  it('returns safe display values when answers are present', () => {
    const summary = buildCaseSummary({ A1: '510(k)', A1b: 'K123456', A1c: 'v2.0', B2: 'Label change' });

    expect(summary.find((s) => s.label === 'Authorization')?.value).toBe('510(k)');
    expect(summary.find((s) => s.label === 'Authorization ID')?.value).toBe('K123456');
    expect(summary.find((s) => s.label === 'Authorized baseline')?.value).toBe('v2.0');
    expect(summary.find((s) => s.label === 'Change')?.value).toBe('Label change');
  });

  it('returns fallback text when answers are missing', () => {
    const summary = buildCaseSummary({});

    expect(summary.find((s) => s.label === 'Authorization')?.value).toBe('Not provided');
    expect(summary.find((s) => s.label === 'Change')?.value).toBe('Not classified');
  });

  it('falls back to B1 when B2 is absent', () => {
    const summary = buildCaseSummary({ B1: 'Software' });
    expect(summary.find((s) => s.label === 'Change')?.value).toBe('Software');
  });
});

describe('buildAssessmentName', () => {
  it('combines authorization ID and change when both present', () => {
    expect(buildAssessmentName({ A1b: 'K123456', B2: 'Label change' })).toBe('K123456 - Label change');
  });

  it('returns draft fallback when nothing is answered', () => {
    expect(buildAssessmentName({})).toBe('Assessment draft');
  });
});

describe('getChangeLabel', () => {
  it('returns B2 when present', () => {
    expect(getChangeLabel({ B1: 'Software', B2: 'Label change' })).toBe('Label change');
  });

  it('falls back to B1 when B2 is absent', () => {
    expect(getChangeLabel({ B1: 'Software' })).toBe('Software');
  });

  it('returns fallback when neither is present', () => {
    expect(getChangeLabel({})).toBe('the reported change');
    expect(getChangeLabel({}, 'custom fallback')).toBe('custom fallback');
  });

  it('returns fallback for empty-string answers', () => {
    expect(getChangeLabel({ B1: '', B2: '' })).toBe('the reported change');
  });
});
