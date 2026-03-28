import { describe, expect, it } from 'vitest';
import {
  buildBlockValidationErrors,
  getPathwayCriticalFields,
  isBlockPathwayComplete,
} from '../src/hooks/useAssessmentFlow';
import type { AssessmentField, Block } from '../src/lib/assessment-engine';

const assessmentBlock: Block = {
  id: 'A',
  label: 'Device under assessment',
  shortLabel: 'Device profile',
  icon: 'shield',
};

const reviewBlock: Block = {
  id: 'review',
  label: 'Assessment record',
  shortLabel: 'Review',
  icon: 'check',
};

const fields: AssessmentField[] = [
  {
    id: 'required-yes-no',
    q: 'Required pathway-critical question',
    type: 'yesno',
    pathwayCritical: true,
  },
  {
    id: 'optional-detail',
    q: 'Optional supporting detail',
    type: 'text',
    pathwayCritical: false,
  },
  {
    id: 'skipped-critical',
    q: 'Skipped field should not block navigation',
    type: 'yesno',
    pathwayCritical: true,
    skip: true,
  },
  {
    id: 'divider',
    sectionDivider: true,
    label: 'Divider',
    pathwayCritical: true,
  },
];

describe('assessment flow helpers', () => {
  it('filters to real pathway-critical questions only', () => {
    expect(getPathwayCriticalFields(fields).map((field) => field.id)).toEqual(['required-yes-no']);
  });

  it('flags only unanswered pathway-critical questions during navigation validation', () => {
    expect(buildBlockValidationErrors({}, fields)).toEqual({ 'required-yes-no': true });
    expect(buildBlockValidationErrors({ 'required-yes-no': 'Yes' }, fields)).toEqual({});
  });

  it('treats review blocks as complete and ignores non-critical fields for assessment blocks', () => {
    expect(isBlockPathwayComplete(reviewBlock, fields, {})).toBe(true);
    expect(isBlockPathwayComplete(assessmentBlock, fields, {})).toBe(false);
    expect(isBlockPathwayComplete(assessmentBlock, fields, { 'required-yes-no': 'No' })).toBe(true);
  });
});
