import {
  Answer,
  AuthPathway,
  type Answers,
  type DeterminationResult,
} from './assessment-engine';

export interface ReportNarrativeView {
  headlineReason: string;
  supportingReasoning: string[];
}

const hasGenerativeAIContext = (answers: Answers): boolean =>
  Array.isArray(answers.A6)
  && answers.A6.some(
    (model) =>
      typeof model === 'string'
      && (model.includes('LLM') || model.includes('Foundation') || model.includes('Generative')),
  );

const getChangeCount = (answers: Answers): number | null => {
  if (answers.A8 === undefined || answers.A8 === null || answers.A8 === '') return null;
  const parsed = Number.parseInt(String(answers.A8), 10);
  return Number.isFinite(parsed) ? parsed : null;
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

export const buildAssessmentBasis = (
  answers: Answers,
  determination: DeterminationResult,
): string[] => {
  const items: string[] = [];
  const authId = answers.A1b ? ` ${String(answers.A1b)}` : '';
  const baseline = answers.A1c ? `"${String(answers.A1c)}"` : null;

  if (answers.A1 === AuthPathway.PMA) {
    items.push(
      baseline
        ? `PMA review logic was applied to${authId || ' the identified device'} using authorized baseline ${baseline} as the comparison point.`
        : `PMA review logic was applied, but the authorized baseline was not fully defined on the current record.`,
    );
  } else if (answers.A1 === AuthPathway.DeNovo) {
    items.push(
      baseline
        ? `The De Novo device${authId} was assessed against authorized baseline ${baseline}, and the non-PMA software-change framework was applied unless a threshold issue overrode it.`
        : `The De Novo device record is missing a complete authorized baseline, which weakens the comparison point for this assessment.`,
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
      'The authorized Indications for Use statement is missing, so the intended-use assessment is not fully anchored to the cleared or approved device.',
    );
  }

  if (answers.A2 === Answer.Yes) {
    if (determination.isPCCPImpl) {
      items.push(
        'An authorized PCCP was on file, and the current route depends on the change staying within the approved PCCP boundaries, validation protocol, and cumulative limits.',
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
        'An authorized PCCP was on file and was checked against the change, though it did not control the final route.',
      );
    }
  } else if (answers.A2 === Answer.No) {
    items.push(
      'No authorized PCCP was on file, so no pre-authorized implementation path was available.',
    );
  }

  if (hasGenerativeAIContext(answers)) {
    items.push(
      'Generative AI or foundation-model technology was identified, so the assessment included the GenAI supplemental checks rather than only the base software-change questions.',
    );
  }

  const changeCount = getChangeCount(answers);
  if (changeCount && changeCount > 0) {
    const driftOutcome = answers.C10 === Answer.Yes
      ? ' The cumulative-change review indicates the device may have materially drifted from the cleared specification.'
      : answers.C10 === Answer.Uncertain
        ? ' The cumulative-change review is still unresolved.'
        : answers.C10 === Answer.No
          ? ' The cumulative-change review did not indicate material drift from the cleared specification.'
          : '';
    items.push(
      `${changeCount} change${changeCount === 1 ? '' : 's'} since the last submission were reported, so cumulative-change review was included in this assessment.${driftOutcome}`,
    );
  }

  return items;
};
