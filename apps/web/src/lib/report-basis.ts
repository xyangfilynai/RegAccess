import { Answer, AuthPathway, computeDerivedState, type Answers, type DeterminationResult } from './assessment-engine';
import { parseNumericAnswer } from './utils';

export interface ReportNarrativeView {
  headlineReason: string;
  supportingReasoning: string[];
}

export interface AssessmentRecordFact {
  label: string;
  value: string;
  isLongText?: boolean;
  isMissing?: boolean;
}

export interface AssessmentBasisView {
  recordFacts: AssessmentRecordFact[];
  systemBasis: string[];
}

const getChangeCount = (answers: Answers): number | null => parseNumericAnswer(answers.A8);

const getTextValue = (value: unknown): { value: string; isMissing: boolean } => {
  if (typeof value === 'string' && value.trim()) {
    return { value: value.trim(), isMissing: false };
  }
  if (value !== undefined && value !== null && String(value).trim()) {
    return { value: String(value).trim(), isMissing: false };
  }
  return { value: 'Not provided', isMissing: true };
};

const getPCCPStatusValue = (answers: Answers, determination: DeterminationResult): string => {
  if (answers.A2 === Answer.Yes) {
    if (determination.isPCCPImpl)
      return 'Authorized PCCP on file; current pathway is contingent on confirmed PCCP scope fit';
    if (determination.pccpScopeFailed) return 'Authorized PCCP on file; current record does not support PCCP use';
    if (determination.pccpIncomplete) return 'Authorized PCCP on file; PCCP scope review incomplete';
    return 'Authorized PCCP on file';
  }

  if (answers.A2 === Answer.No) {
    return 'No authorized PCCP on file';
  }

  return 'Not provided';
};

export const splitReportNarrative = (narrative: string[]): ReportNarrativeView => {
  const cleaned = narrative.filter(Boolean);
  if (cleaned.length === 0) {
    return {
      headlineReason: '',
      supportingReasoning: [],
    };
  }
  if (cleaned.length === 1) {
    return {
      headlineReason: cleaned[0],
      supportingReasoning: [],
    };
  }
  return {
    headlineReason: cleaned[1],
    supportingReasoning: cleaned.slice(2),
  };
};

const buildAssessmentRecordFacts = (answers: Answers, determination: DeterminationResult): AssessmentRecordFact[] => {
  const authorizationPathway = getTextValue(answers.A1);
  const authorizationId = getTextValue(answers.A1b);
  const baseline = getTextValue(answers.A1c);
  const ifuAnchor = getTextValue(answers.A1d);
  const changeCategory = getTextValue(answers.B1);
  const changeType = getTextValue(answers.B2);
  const changeDescription = getTextValue(answers.B4);
  const changeCount = getChangeCount(answers);
  const pccpStatus = getPCCPStatusValue(answers, determination);

  return [
    {
      label: 'Authorization Pathway',
      value: authorizationPathway.value,
      isMissing: authorizationPathway.isMissing,
    },
    {
      label: 'Authorization ID',
      value: authorizationId.value,
      isMissing: authorizationId.isMissing,
    },
    {
      label: 'Authorized Baseline',
      value: baseline.value,
      isMissing: baseline.isMissing,
    },
    {
      label: 'Change Category',
      value: changeCategory.value,
      isMissing: changeCategory.isMissing,
    },
    {
      label: 'Change Type',
      value: changeType.value,
      isMissing: changeType.isMissing,
    },
    {
      label: 'PCCP Status',
      value: pccpStatus,
      isMissing: pccpStatus === 'Not provided',
    },
    {
      label: 'Reported Changes Since Last Submission',
      value: changeCount === null ? 'Not provided' : String(changeCount),
      isMissing: changeCount === null,
    },
    {
      label: 'Authorized IFU / Intended Use Anchor',
      value: ifuAnchor.value,
      isLongText: true,
      isMissing: ifuAnchor.isMissing,
    },
    {
      label: 'Submitted Change Description',
      value: changeDescription.value,
      isLongText: true,
      isMissing: changeDescription.isMissing,
    },
  ];
};

export const buildAssessmentBasis = (answers: Answers, determination: DeterminationResult): string[] => {
  const items: string[] = [];
  const authId = answers.A1b ? ` ${String(answers.A1b)}` : '';
  const baseline = answers.A1c ? `"${String(answers.A1c)}"` : null;

  if (answers.A1 === AuthPathway.PMA) {
    items.push(
      baseline
        ? `PMA-specific review logic was applied to${authId || ' the identified device'} using authorized baseline ${baseline} as the comparison point.`
        : `PMA-specific review logic was applied, but the authorized baseline was not fully defined on the current record.`,
    );
  } else if (answers.A1 === AuthPathway.DeNovo) {
    items.push(
      baseline
        ? `The De Novo device${authId} was assessed against authorized baseline ${baseline}, and the non-PMA software-change framework was applied unless a threshold issue controlled the pathway first.`
        : `The De Novo device record does not include a complete authorized baseline, which weakens the comparison point for this assessment.`,
    );
  } else if (answers.A1 === AuthPathway.FiveOneZeroK) {
    items.push(
      baseline
        ? `The 510(k) device${authId} was assessed against authorized baseline ${baseline}, which set the comparison point for the software-change significance review.`
        : `The 510(k) pathway was selected, but the authorized baseline was not fully defined on the current record.`,
    );
  }

  if (answers.A1d) {
    if (answers.B3 === Answer.Yes || answers.B3 === Answer.No || answers.B3 === Answer.Uncertain) {
      items.push(
        answers.B3 === Answer.Yes
          ? 'The authorized Indications for Use statement was available, and the change was assessed as affecting the intended use or indications for use.'
          : answers.B3 === Answer.No
            ? 'The authorized Indications for Use statement was available, and the change was assessed as staying within the existing intended use and indications for use.'
            : 'The authorized Indications for Use statement was available, but the record still does not establish whether the change affects the intended use or indications for use.',
      );
    } else {
      items.push(
        'The authorized Indications for Use statement was available, but the intended-use assessment has not yet been completed.',
      );
    }
  } else {
    items.push(
      'The authorized Indications for Use statement is not provided, so the intended-use assessment is not fully anchored to the cleared or approved device.',
    );
  }

  if (answers.A2 === Answer.Yes) {
    if (determination.isPCCPImpl) {
      items.push(
        'An authorized PCCP was on file, and the current pathway depends on the change staying within the approved PCCP boundaries, validation protocol, and cumulative limits.',
      );
    } else if (determination.pccpScopeFailed) {
      items.push(
        'An authorized PCCP was on file, but the current record does not keep this change within the authorized PCCP scope.',
      );
    } else if (determination.pccpIncomplete) {
      items.push(
        'An authorized PCCP was on file, but the PCCP scope review is incomplete, so PCCP could not be used as a reliable implementation path.',
      );
    } else {
      items.push(
        'An authorized PCCP was on file and was reviewed against the change, but it did not determine the current pathway.',
      );
    }
  } else if (answers.A2 === Answer.No) {
    items.push('No authorized PCCP was on file, so no pre-authorized implementation path was available.');
  }

  if (computeDerivedState(answers).hasGenAI) {
    items.push(
      'Generative AI or foundation-model technology was identified, so the assessment included the GenAI supplemental checks rather than only the base software-change fields.',
    );
  }

  const changeCount = getChangeCount(answers);
  if (changeCount && changeCount > 0) {
    const driftOutcome =
      answers.C10 === Answer.Yes
        ? ' The cumulative-change review indicates the device may have materially drifted from the cleared specification.'
        : answers.C10 === Answer.Uncertain
          ? ' The cumulative-change review is still unresolved.'
          : answers.C10 === Answer.No
            ? ' The cumulative-change review did not indicate material drift from the cleared specification.'
            : '';
    items.push(
      `${changeCount} change${changeCount === 1 ? '' : 's'} since the last submission ${changeCount === 1 ? 'was' : 'were'} reported, so cumulative-change review was included in this assessment.${driftOutcome}`,
    );
  }

  return items;
};

export const buildAssessmentBasisView = (
  answers: Answers,
  determination: DeterminationResult,
): AssessmentBasisView => ({
  recordFacts: buildAssessmentRecordFacts(answers, determination),
  systemBasis: buildAssessmentBasis(answers, determination),
});
