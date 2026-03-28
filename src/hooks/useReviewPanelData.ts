/**
 * Data assembly hook for the ReviewPanel.
 *
 * Separates all derived-data computation from rendering so that:
 * 1. ReviewPanel.tsx only handles presentation
 * 2. Computation logic is independently testable
 * 3. The memoization strategy is centralized and auditable
 */

import { useMemo } from 'react';
import { Answer, Pathway, changeTaxonomy } from '../lib/assessment-engine';
import type { Answers, Block, DeterminationResult, AssessmentField } from '../lib/assessment-engine';
import { computeEvidenceGaps, type EvidenceGap } from '../lib/evidence-gaps';
import {
  buildEvidenceGapInsightItems,
  buildExpertReviewItems,
  type ReviewInsightItem,
  type EvidenceGapInsightItem,
} from '../lib/review-insights';
import { buildCaseSpecificReasoning, type CaseSpecificReasoning } from '../lib/case-specific-reasoning';
import {
  buildAssessmentBasisView,
  splitReportNarrative,
  type AssessmentBasisView,
  type ReportNarrativeView,
  type AssessmentRecordFact,
} from '../lib/report-basis';

// Re-export types consumers may need
export type { AssessmentRecordFact, AssessmentBasisView, ReportNarrativeView };

/* ------------------------------------------------------------------ */
/*  Merged blocker item                                                */
/* ------------------------------------------------------------------ */

export interface MergedBlockerItem {
  id: string;
  title: string;
  meta: string;
  whyThisMatters: string;
  actionLabel: string;
  actionText: string;
  sourceRefs: string[];
  priority: number;
  kind: 'expert' | 'evidence';
}

/* ------------------------------------------------------------------ */
/*  Pathway / reliance helpers                                         */
/* ------------------------------------------------------------------ */

export interface PathwayConfig {
  surface: string;
  border: string;
  accent: string;
  label: string;
}

export function getPathwayConfig(pathway: string, hasIssues: boolean): PathwayConfig {
  switch (pathway) {
    case Pathway.LetterToFile:
    case Pathway.PMAAnnualReport:
      return {
        surface: hasIssues ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
        border: hasIssues ? 'var(--color-warning-border)' : 'var(--color-success-border)',
        accent: hasIssues ? 'var(--color-warning)' : 'var(--color-success)',
        label: 'Documentation-only pathway',
      };
    case Pathway.ImplementPCCP:
      return {
        surface: 'var(--color-info-bg)',
        border: 'var(--color-info-border)',
        accent: 'var(--color-info)',
        label: 'Authorized PCCP pathway',
      };
    case Pathway.NewSubmission:
    case Pathway.PMASupplementRequired:
      return {
        surface: 'var(--color-danger-bg)',
        border: 'var(--color-danger-border)',
        accent: 'var(--color-danger)',
        label: 'Submission pathway',
      };
    case Pathway.AssessmentIncomplete:
      return {
        surface: 'var(--color-warning-bg)',
        border: 'var(--color-warning-border)',
        accent: 'var(--color-warning)',
        label: 'Assessment not complete',
      };
    default:
      return {
        surface: 'var(--color-bg-card)',
        border: 'var(--color-border)',
        accent: 'var(--color-text-secondary)',
        label: 'Pathway summary',
      };
  }
}

export function getPrimaryAction(determination: DeterminationResult, pathway: string): string {
  if (pathway === Pathway.LetterToFile || pathway === Pathway.PMAAnnualReport) {
    return 'Document the rationale and file the record per QMS.';
  }
  if (pathway === Pathway.ImplementPCCP) {
    return 'Complete the authorized PCCP validation protocol before implementation.';
  }
  if (pathway === Pathway.NewSubmission) {
    return 'Prepare the submission package for the selected 510(k) or De Novo strategy.';
  }
  if (pathway === Pathway.PMASupplementRequired) {
    return 'Confirm the PMA supplement type and assemble the supporting package.';
  }
  if (determination.isIntendedUseUncertain) {
    return 'Resolve intended-use uncertainty before treating this assessment as final.';
  }
  if (determination.pmaIncomplete) {
    return 'Complete the PMA safety/effectiveness review fields before reliance.';
  }
  if (determination.pccpIncomplete) {
    return 'Complete the PCCP scope review before relying on PCCP implementation.';
  }
  if (determination.hasUncertainSignificance) {
    return 'Close unresolved significance fields with supporting evidence and review.';
  }
  if (determination.seUncertain) {
    return 'Reassess substantial equivalence on the cumulative change record.';
  }
  return 'Complete the remaining pathway-critical fields before reliance.';
}

export function getIncompleteHeading(determination: DeterminationResult): string {
  if (determination.isIntendedUseUncertain) {
    return 'Assessment Incomplete: Intended-Use Impact Unresolved';
  }
  if (determination.pmaIncomplete) {
    return 'Assessment Incomplete: PMA Significance Review Outstanding';
  }
  if (determination.pccpIncomplete) {
    return 'Assessment Incomplete: PCCP Scope Review Outstanding';
  }
  if (determination.hasUncertainSignificance) {
    return 'Assessment Incomplete: Significance Review Unresolved';
  }
  if (determination.seUncertain) {
    return 'Assessment Incomplete: Substantial Equivalence Unresolved';
  }
  return 'Assessment Incomplete: Required Fields Outstanding';
}

export interface RelianceState {
  label: string;
  detail: string;
  bg: string;
  border: string;
  text: string;
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

const normalizeTitle = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const pushUnique = (items: string[], value: string | null | undefined) => {
  if (!value) return;
  const normalized = value.trim();
  if (!normalized || items.includes(normalized)) return;
  items.push(normalized);
};

/* ------------------------------------------------------------------ */
/*  Merge blockers                                                     */
/* ------------------------------------------------------------------ */

function mergeBlockers(
  expertReviewItems: ReviewInsightItem[],
  evidenceGapItems: EvidenceGapInsightItem[],
): MergedBlockerItem[] {
  const deduped = new Map<string, MergedBlockerItem>();

  const addItem = (item: MergedBlockerItem) => {
    const key = normalizeTitle(item.title);
    const existing = deduped.get(key);
    if (!existing || item.priority < existing.priority) {
      deduped.set(key, item);
    }
  };

  expertReviewItems.forEach((item) => {
    addItem({
      id: item.id,
      title: item.title,
      meta: item.meta,
      whyThisMatters: item.whyThisMatters,
      actionLabel: item.actionLabel,
      actionText: item.actionText,
      sourceRefs: item.sourceRefs,
      priority: 0,
      kind: 'expert',
    });
  });

  evidenceGapItems
    .filter((item) => item.severity !== 'advisory')
    .forEach((item) => {
      addItem({
        id: item.id,
        title: item.title,
        meta: item.meta,
        whyThisMatters: item.whyThisMatters,
        actionLabel: item.actionLabel,
        actionText: item.actionText,
        sourceRefs: item.sourceRefs,
        priority: item.severity === 'critical' ? 1 : 2,
        kind: 'evidence',
      });
    });

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.title.localeCompare(b.title);
  });
}

/* ------------------------------------------------------------------ */
/*  PCCP hero                                                          */
/* ------------------------------------------------------------------ */

export interface PCCPHeroSummary {
  heading: string;
  summary: string;
  detail: string | null;
}

/* ------------------------------------------------------------------ */
/*  Composite return type                                              */
/* ------------------------------------------------------------------ */

export interface ReviewPanelData {
  pathway: string;
  config: PathwayConfig;
  primaryAction: string;
  isIncomplete: boolean;
  summaryReason: string;
  incompleteHeading: string;

  // Reliance
  relianceState: RelianceState;

  // Assessment basis
  assessmentBasisView: AssessmentBasisView;
  shortRecordFacts: AssessmentRecordFact[];
  longRecordFacts: AssessmentRecordFact[];

  // Decision trace
  decisionTraceSteps: string[];
  decisionSupportNotes: string[];

  // Alternative pathways
  alternativePathwayNotes: string[];

  // Blockers / issues
  mergedBlockers: MergedBlockerItem[];
  consistencyIssues: string[];

  // Sources
  citedSources: string[];

  // PCCP
  pccpHeroSummary: PCCPHeroSummary | null;
  showPCCPRecommendation: boolean;

  // Next steps
  supportingNextSteps: string[];
  showPreparationSection: boolean;
  preparationNeedsCaution: boolean;

  // Flags
  hasCriticalGaps: boolean;

  // Raw data (for report export)
  evidenceGaps: EvidenceGap[];
  caseReasoning: CaseSpecificReasoning;
  reportNarrative: ReportNarrativeView;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useReviewPanelData(
  answers: Answers,
  determination: DeterminationResult,
  blocks: Block[],
  getFieldsForBlock: (blockId: string) => AssessmentField[],
  onHandoff?: () => void,
): ReviewPanelData {
  const pathway = determination.pathway;

  const evidenceGaps = useMemo(() => computeEvidenceGaps(answers, determination), [answers, determination]);

  const criticalGaps = useMemo(() => evidenceGaps.filter((gap) => gap.severity === 'critical'), [evidenceGaps]);

  const expertReviewItems = useMemo(() => buildExpertReviewItems(answers, determination), [answers, determination]);

  const evidenceGapItems = useMemo(
    () => buildEvidenceGapInsightItems(answers, determination, evidenceGaps),
    [answers, determination, evidenceGaps],
  );

  const caseReasoning = useMemo(
    () => buildCaseSpecificReasoning(answers, determination, blocks, getFieldsForBlock),
    [answers, determination, blocks, getFieldsForBlock],
  );

  const assessmentBasisView = useMemo(() => buildAssessmentBasisView(answers, determination), [answers, determination]);

  const reportNarrative = useMemo(() => splitReportNarrative(caseReasoning.narrative || []), [caseReasoning]);

  const mergedBlockers = useMemo(
    () => mergeBlockers(expertReviewItems, evidenceGapItems),
    [expertReviewItems, evidenceGapItems],
  );

  // PCCP
  const selectedChangeType =
    answers.B1 && answers.B2
      ? changeTaxonomy[answers.B1 as string]?.types?.find((item) => item.name === answers.B2)
      : null;
  const pccpEligibility = selectedChangeType?.pccp;
  const showPCCPRecommendation = Boolean(
    determination.pccpRecommendation?.shouldRecommend &&
    answers.A2 !== Answer.Yes &&
    determination.isNewSub &&
    pccpEligibility &&
    ['TYPICAL', 'CONDITIONAL'].includes(pccpEligibility),
  );

  const pccpHeroSummary: PCCPHeroSummary | null = showPCCPRecommendation
    ? {
        heading:
          pccpEligibility === 'TYPICAL'
            ? 'Consider a PCCP in the next marketing submission'
            : 'Evaluate PCCP feasibility in the next marketing submission',
        summary:
          pccpEligibility === 'TYPICAL'
            ? 'For this change pattern, PCCP is often a reasonable mechanism when modifications are pre-described, bounded, and validated prospectively. This assessment already maps to a new submission and no authorized PCCP is on file, so the next submission is a practical point to request PCCP coverage if scope and evidence support it.'
            : 'PCCP may apply only when future changes are tightly bounded and supported by prospective validation. This assessment maps to a new submission with no authorized PCCP on file; use the next submission to assess whether PCCP is viable for your program, subject to RA judgment and any FDA interaction.',
        detail: selectedChangeType?.pccpNote || null,
      }
    : null;

  // Derived display flags
  const consistencyIssues = determination.consistencyIssues || [];
  const isIncomplete = determination.isIncomplete;
  const hasCriticalGaps = criticalGaps.length > 0;
  const isDocOnlyWithCriticalGaps = determination.isDocOnly && hasCriticalGaps;
  const config = getPathwayConfig(pathway, consistencyIssues.length > 0);
  const primaryAction = getPrimaryAction(determination, pathway);
  const summaryReason = reportNarrative.headlineReason || caseReasoning.narrative[1] || caseReasoning.primaryReason;

  const relianceState = useMemo((): RelianceState => {
    if (isIncomplete) {
      return {
        label: 'Not ready for reliance',
        detail: 'Pathway-critical fields remain open, so the record should not be treated as final.',
        bg: '#fff7ed',
        border: '#fdba74',
        text: '#9a3412',
      };
    }
    if (mergedBlockers.length > 0 || hasCriticalGaps || isDocOnlyWithCriticalGaps) {
      const blockerCount = mergedBlockers.length > 0 ? mergedBlockers.length : criticalGaps.length;
      return {
        label: 'Open issues remain',
        detail: `${blockerCount} open issue${blockerCount === 1 ? '' : 's'} remain on the current record.`,
        bg: 'var(--color-warning-bg)',
        border: 'var(--color-warning-border)',
        text: 'var(--color-warning)',
      };
    }
    return {
      label: 'No automated issues detected',
      detail:
        'No ChangePath-detected issues remain on the current record. Proceed with qualified expert review and QMS controls before any reliance or action.',
      bg: 'var(--color-success-bg)',
      border: 'var(--color-success-border)',
      text: 'var(--color-success)',
    };
  }, [criticalGaps.length, hasCriticalGaps, isDocOnlyWithCriticalGaps, isIncomplete, mergedBlockers.length]);

  const shortRecordFacts = assessmentBasisView.recordFacts.filter((f) => !f.isLongText);
  const longRecordFacts = assessmentBasisView.recordFacts.filter((f) => f.isLongText);

  const decisionTraceSteps = useMemo(
    () => caseReasoning.decisionPath.filter((step) => !step.startsWith('Result:')),
    [caseReasoning.decisionPath],
  );

  const decisionSupportNotes = useMemo(() => {
    const items: string[] = [];
    reportNarrative.supportingReasoning.forEach((entry) => pushUnique(items, entry));
    if (items.length === 0) {
      pushUnique(items, summaryReason);
    }
    return items.slice(0, 2);
  }, [reportNarrative.supportingReasoning, summaryReason]);

  const alternativePathwayNotes = useMemo(() => {
    if (isIncomplete) return [];
    return caseReasoning.counterConsiderations.slice(0, 3);
  }, [caseReasoning.counterConsiderations, isIncomplete]);

  const citedSources = useMemo(() => {
    const items: string[] = [];
    caseReasoning.sources.forEach((source) => pushUnique(items, source));
    mergedBlockers.forEach((item) => {
      item.sourceRefs.forEach((source) => pushUnique(items, source));
    });
    return items;
  }, [caseReasoning.sources, mergedBlockers]);

  const supportingNextSteps = useMemo(() => {
    const items: string[] = [];
    const add = (value: string | null | undefined) => {
      if (items.length >= 3) return;
      pushUnique(items, value);
    };
    if (mergedBlockers.length > 0) {
      mergedBlockers.slice(0, 3).forEach((item) => add(item.actionText));
      return items;
    }
    if (!isIncomplete && onHandoff) {
      add(
        determination.isPCCPImpl
          ? 'Open the preparation checklist and complete the PCCP implementation record.'
          : determination.isDocOnly
            ? 'Open the preparation checklist and assemble the documentation package.'
            : 'Open the preparation checklist and begin the submission package.',
      );
    }
    caseReasoning.verificationSteps.forEach((step) => add(step));
    return items;
  }, [
    caseReasoning.verificationSteps,
    determination.isDocOnly,
    determination.isPCCPImpl,
    isIncomplete,
    mergedBlockers,
    onHandoff,
  ]);

  const showPreparationSection = Boolean(onHandoff || supportingNextSteps.length > 0);
  const preparationNeedsCaution = mergedBlockers.length > 0 || consistencyIssues.length > 0;

  return {
    pathway,
    config,
    primaryAction,
    isIncomplete,
    summaryReason,
    incompleteHeading: getIncompleteHeading(determination),
    relianceState,
    assessmentBasisView,
    shortRecordFacts,
    longRecordFacts,
    decisionTraceSteps,
    decisionSupportNotes,
    alternativePathwayNotes,
    mergedBlockers,
    consistencyIssues,
    citedSources,
    pccpHeroSummary,
    showPCCPRecommendation,
    supportingNextSteps,
    showPreparationSection,
    preparationNeedsCaution,
    hasCriticalGaps,
    evidenceGaps,
    caseReasoning,
    reportNarrative,
  };
}
