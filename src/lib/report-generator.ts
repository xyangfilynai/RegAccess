/**
 * Structured assessment report/artifact generator.
 * Produces audit-ready output with all required fields for regulatory defensibility.
 */

import type { Answers, Block, DeterminationResult, AssessmentField } from './assessment-engine';
import { docRequirements } from './content';
import { getSourceBadge } from './content';
import { computeEvidenceGaps, type EvidenceGap } from './evidence-gaps';
import type { ReviewInsightItem, EvidenceGapInsightItem } from './review-insights';
import { buildEvidenceGapInsightItems, buildExpertReviewItems } from './review-insights';
import { classifySource, type SourceClass } from './source-classification';
import { buildCaseSpecificReasoning } from './case-specific-reasoning';
import { buildAssessmentBasis, splitReportNarrative } from './report-basis';

export interface AssessmentArtifact {
  meta: {
    generatedAt: string;
    toolVersion: string;
    assessmentStatus: 'Preliminary' | 'Complete — pending review' | 'Incomplete — expert review required';
  };
  outcome: {
    pathway: string;
    statusLabel: string;
    isIncomplete: boolean;
    isDocOnly: boolean;
    confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW';
  };
  rationale: {
    headlineReason: string;
    primaryReason: string;
    ruleKey: string | null;
    assessmentBasis: string[];
    narrative: string[];
    decisionPath: string[];
    verificationTitle: string | null;
    verificationSteps: string[];
    counterTitle: string | null;
    counterConsiderations: string[];
    sources: string[];
  };
  expertReviewItems: ReviewInsightItem[];
  evidenceGaps: EvidenceGap[];
  evidenceGapItems: EvidenceGapInsightItem[];
  nextActions: string[];
  consistencyIssues: string[];
  documentationRequirements: {
    required: Array<{ doc: string; source: string; sourceClass: SourceClass }>;
    recommended: Array<{ doc: string; source: string; sourceClass: SourceClass }>;
  };
}

export function generateAssessmentArtifact(
  answers: Answers,
  determination: DeterminationResult,
  blocks: Block[],
  getFieldsForBlock: (blockId: string) => AssessmentField[],
): AssessmentArtifact {
  const isIncomplete = determination.isIncomplete;
  const hasConsistencyIssues = (determination.consistencyIssues?.length || 0) > 0;

  // Confidence level
  const confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW' = isIncomplete
    ? 'LOW'
    : hasConsistencyIssues
      ? 'MODERATE'
      : 'HIGH';

  // Assessment status
  const assessmentStatus: AssessmentArtifact['meta']['assessmentStatus'] = isIncomplete
    ? 'Incomplete — expert review required'
    : hasConsistencyIssues
      ? 'Preliminary'
      : 'Complete — pending review';

  const caseReasoning = buildCaseSpecificReasoning(answers, determination, blocks, getFieldsForBlock);
  const reportNarrative = splitReportNarrative(caseReasoning.narrative);
  const assessmentBasis = buildAssessmentBasis(answers, determination);

  // Evidence gaps
  const evidenceGaps = computeEvidenceGaps(answers, determination);
  const expertReviewItems = buildExpertReviewItems(answers, determination);
  const evidenceGapItems = buildEvidenceGapInsightItems(answers, determination, evidenceGaps);

  // Next actions
  const nextActions: string[] = [];
  if (isIncomplete) {
    nextActions.push('Resolve open required and threshold items before relying on this assessment.');
    if (determination.isIntendedUseUncertain) {
      nextActions.push(
        'Schedule FDA Pre-Submission (Q-Sub) or senior RA/clinical review to resolve intended-use uncertainty.',
      );
    }
    if (determination.hasUncertainSignificance) {
      nextActions.push('Gather evidence to resolve uncertain significance answers to Yes or No where feasible.');
    }
  } else {
    if (determination.isDocOnly) {
      nextActions.push('Prepare Letter to File / documentation package per the documentation list below.');
      nextActions.push('File per QMS (e.g., device history record).');
    }
    if (determination.isPCCPImpl) {
      nextActions.push(
        'Execute the authorized PCCP validation protocol; meet all acceptance criteria before implementation.',
      );
      nextActions.push('Activate the monitoring plan and update labeling when the PCCP or labeling requires it.');
    }
    if (determination.isNewSub) {
      nextActions.push('Prepare the submission package per the documentation list below.');
      nextActions.push('Consider a Pre-Submission (Q-Sub) when the case is borderline or novel.');
    }
  }
  if (hasConsistencyIssues) {
    nextActions.push('Review and close consistency items flagged below before treating the record as final.');
  }
  nextActions.push('Have qualified regulatory and clinical reviewers assess this record before action.');

  // Documentation requirements with source classes
  const docs = docRequirements[determination.pathway] || null;
  const documentationRequirements = {
    required: (docs?.required || []).map((d: { doc: string; source: string }) => ({
      ...d,
      sourceClass: classifySource(d.source),
    })),
    recommended: (docs?.recommended || []).map((d: { doc: string; source: string }) => ({
      ...d,
      sourceClass: classifySource(d.source),
    })),
  };

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      toolVersion: 'v1',
      assessmentStatus,
    },
    outcome: {
      pathway: determination.pathway,
      statusLabel: isIncomplete ? 'Assessment incomplete — expert review required' : determination.pathway,
      isIncomplete,
      isDocOnly: determination.isDocOnly,
      confidenceLevel,
    },
    rationale: {
      headlineReason: reportNarrative.headlineReason || caseReasoning.primaryReason,
      primaryReason: caseReasoning.primaryReason,
      ruleKey: caseReasoning.ruleKey,
      assessmentBasis,
      narrative: caseReasoning.narrative,
      decisionPath: caseReasoning.decisionPath,
      verificationTitle: caseReasoning.verificationTitle,
      verificationSteps: caseReasoning.verificationSteps,
      counterTitle: caseReasoning.counterTitle,
      counterConsiderations: caseReasoning.counterConsiderations,
      sources: caseReasoning.sources,
    },
    expertReviewItems,
    evidenceGaps,
    evidenceGapItems,
    nextActions,
    consistencyIssues: determination.consistencyIssues || [],
    documentationRequirements,
  };
}

/**
 * Export assessment artifact as formatted text for clipboard / file export.
 */
export function formatArtifactAsText(artifact: AssessmentArtifact, assessmentName?: string): string {
  const lines: string[] = [];
  const hr = '─'.repeat(60);
  const formatSourceRef = (sourceRef: string): string => getSourceBadge(sourceRef).full || sourceRef;
  const immediateWork = artifact.nextActions.filter((action) => !/consistency issues flagged below/i.test(action));

  lines.push(hr);
  lines.push('REGULATORY CHANGE ASSESSMENT REPORT');
  lines.push(hr);
  lines.push('');
  lines.push(`Status: ${artifact.meta.assessmentStatus}`);
  lines.push(`Generated: ${new Date(artifact.meta.generatedAt).toLocaleString()}`);
  lines.push(`ChangePath Version: ${artifact.meta.toolVersion}`);
  if (assessmentName) lines.push(`Assessment: ${assessmentName}`);
  lines.push('');

  if (artifact.outcome.isIncomplete) {
    lines.push('╔══════════════════════════════════════════════════════════╗');
    lines.push('║  ⚠  ASSESSMENT INCOMPLETE — EXPERT REVIEW REQUIRED     ║');
    lines.push('║  Do NOT treat this as a final regulatory conclusion.    ║');
    lines.push('╚══════════════════════════════════════════════════════════╝');
    lines.push('');
  }

  lines.push(`ASSESSED PATHWAY: ${artifact.outcome.pathway}`);
  lines.push(`Record Confidence: ${artifact.outcome.confidenceLevel}`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push(artifact.rationale.headlineReason || artifact.rationale.primaryReason);
  lines.push('');

  if (artifact.rationale.assessmentBasis.length > 0) {
    lines.push(hr);
    lines.push('ASSESSMENT BASIS');
    lines.push(hr);
    artifact.rationale.assessmentBasis.forEach((item, i) => lines.push(`  ${i + 1}. ${item}`));
    lines.push('');
  }

  lines.push(hr);
  lines.push('DECISION RATIONALE');
  lines.push(hr);
  if (artifact.rationale.decisionPath.length > 0) {
    lines.push('Decision Path:');
    artifact.rationale.decisionPath.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
  }
  if (artifact.rationale.verificationSteps.length > 0) {
    lines.push('');
    lines.push(`${artifact.rationale.verificationTitle || 'Verification Focus'}:`);
    artifact.rationale.verificationSteps.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
  }
  if (artifact.rationale.counterConsiderations.length > 0) {
    lines.push('');
    lines.push(`${artifact.rationale.counterTitle || 'What Could Still Change This Conclusion'}:`);
    artifact.rationale.counterConsiderations.forEach((item, i) => lines.push(`  ${i + 1}. ${item}`));
  }
  if (artifact.rationale.sources.length > 0) {
    lines.push('');
    lines.push('Sources cited:');
    artifact.rationale.sources.forEach((source, i) => lines.push(`  ${i + 1}. ${formatSourceRef(source)}`));
    lines.push('');
  }

  if (artifact.expertReviewItems.length > 0) {
    lines.push(hr);
    lines.push('EXPERT REVIEW REQUIRED');
    lines.push(hr);
    artifact.expertReviewItems.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
      lines.push(`   ${item.meta}`);
      lines.push(`   Why it matters: ${item.whyThisMatters}`);
      lines.push(`   ${item.actionLabel}: ${item.actionText}`);
      if (item.sourceRefs.length > 0) {
        lines.push(`   Basis: ${item.sourceRefs.map(formatSourceRef).join('; ')}`);
      }
    });
    lines.push('');
  }

  if (artifact.evidenceGapItems.length > 0) {
    lines.push(hr);
    lines.push('EVIDENCE NEEDED BEFORE RELIANCE');
    lines.push(hr);
    artifact.evidenceGapItems.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
      lines.push(`   ${item.meta}`);
      lines.push(`   Why it matters: ${item.whyThisMatters}`);
      lines.push(`   ${item.actionLabel}: ${item.actionText}`);
      if (item.sourceRefs.length > 0) {
        lines.push(`   Source documents: ${item.sourceRefs.map(formatSourceRef).join('; ')}`);
      }
    });
    lines.push('');
  }

  if (immediateWork.length > 0) {
    lines.push(hr);
    lines.push('NEXT STEPS');
    lines.push(hr);
    immediateWork.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push('');
  }

  lines.push(hr);
  lines.push('PACKAGE MUST INCLUDE');
  lines.push(hr);
  if (artifact.documentationRequirements.required.length > 0) {
    artifact.documentationRequirements.required.forEach((d, i) => {
      lines.push(`${i + 1}. ${d.doc}`);
      lines.push(`   Basis: ${formatSourceRef(d.source)} [${d.sourceClass}]`);
    });
  }
  if (artifact.documentationRequirements.recommended.length > 0) {
    lines.push('');
    lines.push('Additional recommended materials are available in the pathway-specific preparation checklist.');
  }
  lines.push('');

  lines.push(hr);
  lines.push('DISCLAIMER');
  lines.push(hr);
  lines.push('Internal workflow aid only — not a regulatory determination, legal opinion, or approval record.');
  lines.push(
    'ChangePath applies conservative internal policies (e.g., treating "Uncertain" significance answers as requiring submission) that may exceed FDA minimum requirements. These policies are risk-based internal choices, not direct regulatory mandates.',
  );
  lines.push(
    'All outputs must be reviewed by qualified regulatory, clinical, and quality personnel against applicable regulations, guidance, and organizational procedures before any reliance or action.',
  );
  lines.push('');

  return lines.join('\n');
}
