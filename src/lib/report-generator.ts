/**
 * Structured assessment report/artifact generator.
 * Produces audit-ready output with all required fields for regulatory defensibility.
 */

import type { Answers, Block, Question } from './assessment-engine';
import { Pathway } from './assessment-engine';
import { docRequirements } from './content';
import { getSourceBadge } from './content';
import { computeEvidenceGaps, type EvidenceGap } from './evidence-gaps';
import type { ReviewInsightItem, EvidenceGapInsightItem } from './review-insights';
import { buildEvidenceGapInsightItems, buildExpertReviewItems } from './review-insights';
import { classifySource, type SourceClass } from './source-classification';
import { buildCaseSpecificReasoning } from './case-specific-reasoning';

export interface AssessmentArtifact {
  meta: {
    generatedAt: string;
    toolVersion: string;
    assessmentStatus: 'Preliminary' | 'Complete — Pending Review' | 'Incomplete — Expert Review Required';
  };
  outcome: {
    pathway: string;
    statusLabel: string;
    isIncomplete: boolean;
    isDocOnly: boolean;
    confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW';
  };
  rationale: {
    primaryReason: string;
    ruleKey: string | null;
    narrative: string[];
    decisionPath: string[];
    verificationTitle: string | null;
    verificationSteps: string[];
    counterTitle: string | null;
    counterConsiderations: string[];
    sources: string[];
  };
  keyInputs: Array<{
    id: string;
    question: string;
    answer: string;
    isPathwayCritical: boolean;
  }>;
  assumptions: string[];
  unresolvedQuestions: string[];
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

const pathwayToDocKey: Record<string, string> = {
  [Pathway.LetterToFile]: "Letter to File",
  [Pathway.ImplementPCCP]: "Implement Under Authorized PCCP",
  [Pathway.NewSubmission]: "New Submission Required",
  [Pathway.PMASupplementRequired]: "PMA Supplement Required",
  [Pathway.PMAAnnualReport]: "PMA Annual Report / Letter to File",
  [Pathway.AssessmentIncomplete]: "Assessment Incomplete",
};

export function generateAssessmentArtifact(
  answers: Answers,
  determination: any,
  blocks: Block[],
  getQuestionsForBlock: (blockId: string) => Question[],
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
    ? 'Incomplete — Expert Review Required'
    : hasConsistencyIssues
      ? 'Preliminary'
      : 'Complete — Pending Review';

  const caseReasoning = buildCaseSpecificReasoning(
    answers,
    determination,
    blocks,
    getQuestionsForBlock,
  );

  // Key inputs — collect all pathway-critical answered questions
  const keyInputs: AssessmentArtifact['keyInputs'] = [];
  for (const block of blocks) {
    if (block.id === 'review') continue;
    const questions = getQuestionsForBlock(block.id);
    for (const q of questions) {
      if (q.sectionDivider || q.skip) continue;
      const val = answers[q.id];
      if (val === undefined || val === '' || val === null) continue;
      keyInputs.push({
        id: q.id,
        question: q.q || q.label || q.id,
        answer: Array.isArray(val) ? val.join(', ') : String(val),
        isPathwayCritical: Boolean(q.pathwayCritical),
      });
    }
  }

  // Assumptions
  const assumptions: string[] = [
    'Assessment assumes all answers reflect the current state of the change as described.',
    'Regulatory framework: U.S. FDA primary; non-U.S. jurisdictions via escalation cues only.',
  ];
  if (determination.isCyberOnly) {
    assumptions.push('Assumed the cybersecurity change has zero functional impact on device performance (must be verified with appropriate analysis).');
  }
  if (determination.isBugFix) {
    assumptions.push('Assumed the fix restores the device to a known, documented, cleared specification.');
  }
  if (determination.allSignificanceNo && !determination.isCyberOnly && !determination.isBugFix) {
    assumptions.push('All significance questions were answered No — assumes each answer is supported by evidence, not just expectation.');
  }
  if (determination.pccpScopeVerified) {
    assumptions.push('PCCP scope verification assumes all boundary conditions and acceptance criteria remain as authorized.');
  }

  // Unresolved questions
  const unresolvedQuestions: string[] = [];
  if (determination.isIntendedUseUncertain) {
    unresolvedQuestions.push('Intended use impact cannot be determined — requires expert review or FDA Pre-Submission.');
  }
  if (determination.hasUncertainSignificance && !determination.isIntendedUseChange) {
    unresolvedQuestions.push('One or more significance questions remain uncertain — treated conservatively as significant.');
  }
  if (determination.seUncertain) {
    unresolvedQuestions.push('Substantial equivalence supportability is uncertain.');
  }
  if (determination.pccpIncomplete) {
    unresolvedQuestions.push('PCCP scope verification is incomplete.');
  }
  if (determination.pmaIncomplete) {
    unresolvedQuestions.push('PMA safety/effectiveness assessment is incomplete.');
  }
  if (determination.baselineIncomplete) {
    unresolvedQuestions.push('Authorized baseline information is incomplete — assessment may be unreliable.');
  }

  // Evidence gaps
  const evidenceGaps = computeEvidenceGaps(answers, determination);
  const expertReviewItems = buildExpertReviewItems(answers, determination);
  const evidenceGapItems = buildEvidenceGapInsightItems(answers, determination, evidenceGaps);

  // Next actions
  const nextActions: string[] = [];
  if (isIncomplete) {
    nextActions.push('Resolve all unresolved questions before relying on this assessment.');
    if (determination.isIntendedUseUncertain) {
      nextActions.push('Schedule FDA Pre-Submission (Q-Sub) or senior RA/clinical expert review to resolve intended use uncertainty.');
    }
    if (determination.hasUncertainSignificance) {
      nextActions.push('Gather additional evidence to convert uncertain significance answers to definitive Yes or No.');
    }
  } else {
    if (determination.isDocOnly) {
      nextActions.push('Prepare Letter to File / documentation package per documentation requirements below.');
      nextActions.push('File in device history record.');
    }
    if (determination.isPCCPImpl) {
      nextActions.push('Execute the PCCP validation protocol in full — all acceptance criteria must pass before implementation.');
      nextActions.push('Activate monitoring plan and update labeling if required.');
    }
    if (determination.isNewSub) {
      nextActions.push('Prepare submission package per documentation requirements below.');
      nextActions.push('Consider Pre-Submission meeting with FDA if borderline.');
    }
  }
  if (hasConsistencyIssues) {
    nextActions.push('Review and resolve all consistency issues flagged below before finalizing.');
  }
  nextActions.push('Have qualified regulatory and clinical professionals review this assessment before action.');

  // Documentation requirements with source classes
  const docKey = pathwayToDocKey[determination.pathway];
  const docs = docKey ? docRequirements[docKey] : null;
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
      statusLabel: isIncomplete ? 'Assessment Incomplete — Expert Review Required' : determination.pathway,
      isIncomplete,
      isDocOnly: determination.isDocOnly,
      confidenceLevel,
    },
    rationale: {
      primaryReason: caseReasoning.primaryReason,
      ruleKey: caseReasoning.ruleKey,
      narrative: caseReasoning.narrative,
      decisionPath: caseReasoning.decisionPath,
      verificationTitle: caseReasoning.verificationTitle,
      verificationSteps: caseReasoning.verificationSteps,
      counterTitle: caseReasoning.counterTitle,
      counterConsiderations: caseReasoning.counterConsiderations,
      sources: caseReasoning.sources,
    },
    keyInputs,
    assumptions,
    unresolvedQuestions,
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

  lines.push(hr);
  lines.push('REGULATORY CHANGE ASSESSMENT REPORT');
  lines.push(hr);
  lines.push('');
  lines.push(`Status: ${artifact.meta.assessmentStatus}`);
  lines.push(`Generated: ${new Date(artifact.meta.generatedAt).toLocaleString()}`);
  lines.push(`RegAccess Version: ${artifact.meta.toolVersion}`);
  if (assessmentName) lines.push(`Assessment: ${assessmentName}`);
  lines.push('');

  if (artifact.outcome.isIncomplete) {
    lines.push('╔══════════════════════════════════════════════════════════╗');
    lines.push('║  ⚠  ASSESSMENT INCOMPLETE — EXPERT REVIEW REQUIRED     ║');
    lines.push('║  Do NOT treat this as a final regulatory conclusion.    ║');
    lines.push('╚══════════════════════════════════════════════════════════╝');
    lines.push('');
  }

  lines.push(`RECOMMENDED PATH: ${artifact.outcome.pathway}`);
  lines.push(`Confidence: ${artifact.outcome.confidenceLevel}`);
  lines.push('');

  lines.push(hr);
  lines.push('RATIONALE');
  lines.push(hr);
  lines.push(artifact.rationale.primaryReason);
  if (artifact.rationale.decisionPath.length > 0) {
    lines.push('');
    lines.push('Case-Specific Decision Path:');
    artifact.rationale.decisionPath.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
  }
  if (artifact.rationale.verificationSteps.length > 0) {
    lines.push('');
    lines.push(`${artifact.rationale.verificationTitle || 'Case-Specific Verification Focus'}:`);
    artifact.rationale.verificationSteps.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
  }
  if (artifact.rationale.counterConsiderations.length > 0) {
    lines.push('');
    lines.push(`${artifact.rationale.counterTitle || 'What Could Still Change This Conclusion'}:`);
    artifact.rationale.counterConsiderations.forEach((item, i) => lines.push(`  ${i + 1}. ${item}`));
  }
  if (artifact.rationale.sources.length > 0) {
    lines.push('');
    lines.push('Authorities Relied On:');
    artifact.rationale.sources.forEach((source, i) => lines.push(`  ${i + 1}. ${source}`));
  }
  lines.push('');

  if (artifact.assumptions.length > 0) {
    lines.push(hr);
    lines.push('ASSUMPTIONS');
    lines.push(hr);
    artifact.assumptions.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push('');
  }

  if (artifact.unresolvedQuestions.length > 0) {
    lines.push(hr);
    lines.push('UNRESOLVED QUESTIONS');
    lines.push(hr);
    artifact.unresolvedQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push('');
  }

  if (artifact.expertReviewItems.length > 0) {
    lines.push(hr);
    lines.push('EXPERT REVIEW REQUIRED');
    lines.push(hr);
    artifact.expertReviewItems.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
      lines.push(`   ${item.meta}`);
      lines.push(`   Why this matters here: ${item.whyThisMatters}`);
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
      lines.push(`   Why this matters here: ${item.whyThisMatters}`);
      lines.push(`   ${item.actionLabel}: ${item.actionText}`);
      if (item.sourceRefs.length > 0) {
        lines.push(`   Source documents: ${item.sourceRefs.map(formatSourceRef).join('; ')}`);
      }
    });
    lines.push('');
  }

  lines.push(hr);
  lines.push('NEXT ACTIONS');
  lines.push(hr);
  artifact.nextActions.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  lines.push('');

  lines.push(hr);
  lines.push('KEY INPUTS');
  lines.push(hr);
  artifact.keyInputs
    .filter(ki => ki.isPathwayCritical)
    .forEach(ki => {
      lines.push(`[${ki.id}] ${ki.question}`);
      lines.push(`  → ${ki.answer}`);
    });
  lines.push('');

  lines.push(hr);
  lines.push('DOCUMENTATION REQUIREMENTS');
  lines.push(hr);
  if (artifact.documentationRequirements.required.length > 0) {
    lines.push('Required:');
    artifact.documentationRequirements.required.forEach((d, i) => {
      lines.push(`  ${i + 1}. ${d.doc}`);
      lines.push(`     Source: ${d.source} [${d.sourceClass}]`);
    });
  }
  if (artifact.documentationRequirements.recommended.length > 0) {
    lines.push('Recommended:');
    artifact.documentationRequirements.recommended.forEach((d, i) => {
      lines.push(`  ${i + 1}. ${d.doc}`);
      lines.push(`     Source: ${d.source} [${d.sourceClass}]`);
    });
  }
  lines.push('');

  lines.push(hr);
  lines.push('DISCLAIMER');
  lines.push(hr);
  lines.push('Decision support only — not a final regulatory conclusion.');
  lines.push('RegAccess supports internal change-control planning and submission strategy discussions.');
  lines.push('All outputs require review by qualified regulatory and clinical professionals before action.');
  lines.push('');

  return lines.join('\n');
}
