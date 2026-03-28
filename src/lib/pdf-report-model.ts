/**
 * Normalized PDF report document model.
 *
 * Assembles the structured data needed for a regulatory assessment PDF
 * from the same underlying logic that powers the on-screen review page.
 * This model is intentionally UI-free — it captures document content only.
 */

import type { Answers, Block, DeterminationResult, AssessmentField } from './assessment-engine';
import { Pathway } from './assessment-engine';
import type { ReviewerNote } from './assessment-store';
import { generateAssessmentArtifact, type AssessmentArtifact } from './report-generator';
import { buildAssessmentBasisView, splitReportNarrative, type AssessmentBasisView } from './report-basis';
import { findGuidanceLink, getSourceBadge } from './content';

const PDF_EXPORT_VERSION = 'pdf-v2';
const PREPARED_FROM = 'Assessment record in ChangePath';
const GROUPED_SOURCE_PREFIXES = ['FDA-SW-510K-2017', 'FDA-PCCP-2025', 'FDA-LIFECYCLE-2025', 'FDA-CYBER-2026'] as const;

/* ------------------------------------------------------------------ */
/*  Document model types                                               */
/* ------------------------------------------------------------------ */

export interface PdfReportHeader {
  title: string;
  subtitle: string;
  generatedAt: string;
  assessmentId: string | null;
  assessmentName: string | null;
  assessmentStatus: string;
  schemaVersion: string;
  exportVersion: string;
  preparedFrom: string;
}

export interface PdfExecutiveSummary {
  pathwayLabel: string;
  pathwayConclusion: string;
  recordStatus: string;
  relianceQualification: string;
  primaryNextAction: string;
  summaryStatement: string;
  isIncomplete: boolean;
}

export interface PdfAssessmentBasisFact {
  label: string;
  value: string;
  isMissing: boolean;
  isLongText: boolean;
}

export interface PdfAssessmentBasis {
  recordFacts: PdfAssessmentBasisFact[];
  systemGeneratedBasis: string[];
}

export interface PdfDecisionTrace {
  steps: string[];
}

export interface PdfAssessmentNarrative {
  headlineReason: string;
  supportingPoints: string[];
  verificationTitle: string | null;
  verificationSteps: string[];
}

export interface PdfOpenIssue {
  title: string;
  meta: string;
  whyItMatters: string;
  actionNeeded: string;
  actionLabel: string;
  sources: string[];
  kind: 'expert-review' | 'evidence-gap';
}

export interface PdfAlternativePathway {
  description: string;
}

export interface PdfSourceCitation {
  text: string;
  badge: string;
  shortText: string;
}

export interface PdfReviewerNote {
  author: string;
  text: string;
  timestamp: string;
}

export interface PdfReportDocument {
  header: PdfReportHeader;
  executiveSummary: PdfExecutiveSummary;
  assessmentBasis: PdfAssessmentBasis;
  decisionTrace: PdfDecisionTrace;
  narrative: PdfAssessmentNarrative;
  openIssues: PdfOpenIssue[];
  alternativePathways: PdfAlternativePathway[];
  sourcesCited: PdfSourceCitation[];
  reviewerNotes: PdfReviewerNote[];
  closing: {
    generatedBy: string;
    timestamp: string;
    preparedFrom: string;
    schemaVersion: string;
    exportVersion: string;
    disclaimer: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeComparableText(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function deduplicateText(items: string[], excluded: string[] = []): string[] {
  const seen = new Set(excluded.map(normalizeComparableText));
  const deduped: string[] = [];

  items.forEach((item) => {
    const normalized = normalizeWhitespace(item);
    if (!normalized) return;

    const key = normalizeComparableText(normalized);
    if (seen.has(key)) return;

    seen.add(key);
    deduped.push(normalized);
  });

  return deduped;
}

function buildRecordStatus(artifact: AssessmentArtifact, mergedIssueCount: number): string {
  if (artifact.outcome.isIncomplete) {
    return 'Incomplete — pathway-critical items unresolved';
  }
  if (mergedIssueCount > 0) {
    return 'Preliminary — open issues remain';
  }
  return 'Complete — pending qualified review';
}

function buildRelianceQualification(artifact: AssessmentArtifact, mergedIssueCount: number): string {
  if (artifact.outcome.isIncomplete) {
    return 'Not suitable for reliance. Pathway-critical items remain unresolved on the current record.';
  }
  if (mergedIssueCount > 0) {
    return `Limited reliance only. ${mergedIssueCount} open issue${mergedIssueCount === 1 ? '' : 's'} remain${mergedIssueCount === 1 ? 's' : ''} and should be closed before the record is used beyond preliminary review.`;
  }
  return 'No ChangePath-detected issues remain. Use only after qualified regulatory, clinical, and quality review and application of normal QMS controls.';
}

function buildConclusionStatement(pathway: string, artifact: AssessmentArtifact, mergedIssueCount: number): string {
  if (artifact.outcome.isIncomplete) {
    return 'No pathway conclusion should be treated as supported on the current record. Complete the pathway-critical items and threshold reviews identified in this document before relying on any downstream pathway.';
  }
  if (mergedIssueCount > 0) {
    return `The current record supports a preliminary pathway assessment of ${pathway}, but reliance remains limited until the listed issues are resolved, supporting evidence is added, and qualified review is completed.`;
  }
  return `The current record supports a preliminary pathway assessment of ${pathway}, subject to qualified regulatory review and application of normal QMS controls before any reliance or action.`;
}

function getPrimaryAction(determination: DeterminationResult, pathway: string): string {
  if (pathway === Pathway.LetterToFile || pathway === Pathway.PMAAnnualReport) {
    return 'Document the basis for the pathway and file the assessment record under applicable QMS controls.';
  }
  if (pathway === Pathway.ImplementPCCP) {
    return 'Complete the authorized PCCP validation protocol and required implementation controls before use.';
  }
  if (pathway === Pathway.NewSubmission) {
    return 'Prepare the submission package and supporting evidence for the selected 510(k) or De Novo strategy.';
  }
  if (pathway === Pathway.PMASupplementRequired) {
    return 'Confirm the PMA supplement category and assemble the supporting package.';
  }
  if (determination.isIntendedUseUncertain) {
    return 'Resolve intended-use uncertainty before relying on any pathway conclusion.';
  }
  if (determination.hasUncertainSignificance) {
    return 'Resolve open significance fields with supporting evidence and qualified review.';
  }
  return 'Complete the remaining pathway-critical fields before relying on the assessment.';
}

function softenSummaryStatement(
  statement: string,
  pathway: string,
  artifact: AssessmentArtifact,
  mergedIssueCount: number,
): string {
  const normalized = normalizeWhitespace(statement);
  if (!normalized) return normalized;

  if (/^The pathway remains Assessment Incomplete because/i.test(normalized)) {
    return normalized.replace(
      /^The pathway remains Assessment Incomplete because/i,
      'The current record remains incomplete because',
    );
  }

  if (/^The pathway is Assessment Incomplete because/i.test(normalized)) {
    return normalized.replace(
      /^The pathway is Assessment Incomplete because/i,
      'The current record is incomplete because',
    );
  }

  if (/^The (assessed )?pathway is .+ because/i.test(normalized)) {
    const prefix =
      artifact.outcome.isIncomplete || mergedIssueCount > 0
        ? `The current record provisionally supports a pathway assessment of ${pathway} because`
        : `The current record supports a preliminary pathway assessment of ${pathway} because`;

    return normalized.replace(/^The (assessed )?pathway is .+? because/i, prefix);
  }

  return normalized;
}

function getSourceGrouping(sourceRef: string): {
  key: string;
  fullLabel: string;
  shortLabel: string;
  section: string | null;
} {
  const normalized = normalizeWhitespace(sourceRef);
  const matchedPrefix = GROUPED_SOURCE_PREFIXES.find(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix} `),
  );

  if (matchedPrefix) {
    const guidanceLink = findGuidanceLink(matchedPrefix);
    const badge = getSourceBadge(matchedPrefix);
    return {
      key: matchedPrefix,
      fullLabel: guidanceLink?.fullName || badge.full || matchedPrefix,
      shortLabel: guidanceLink?.shortName || guidanceLink?.fullName || badge.full || matchedPrefix,
      section: normalized === matchedPrefix ? null : normalized.slice(matchedPrefix.length).trim() || null,
    };
  }

  const aliasMappings: Array<{ key: (typeof GROUPED_SOURCE_PREFIXES)[number] | '21 CFR Part 820'; pattern: RegExp }> = [
    { key: 'FDA-SW-510K-2017', pattern: /Deciding When to Submit a 510\(k\)|Applied by analogy/i },
    {
      key: 'FDA-PCCP-2025',
      pattern: /Marketing Submission Recommendations|PCCP for AI-Enabled|PCCP for Artificial Intelligence/i,
    },
    { key: 'FDA-LIFECYCLE-2025', pattern: /AI-Enabled Device Software Functions|AI-DSF|Lifecycle Management/i },
    { key: 'FDA-CYBER-2026', pattern: /Cybersecurity in Medical Devices/i },
    { key: '21 CFR Part 820', pattern: /^QMSR\b|21 CFR Part 820/i },
  ];

  const aliasMatch = aliasMappings.find(({ pattern }) => pattern.test(normalized));
  if (aliasMatch) {
    const guidanceLink = findGuidanceLink(aliasMatch.key);
    const badge = getSourceBadge(aliasMatch.key);
    return {
      key: aliasMatch.key,
      fullLabel: guidanceLink?.fullName || badge.full || aliasMatch.key,
      shortLabel: guidanceLink?.shortName || guidanceLink?.fullName || badge.full || aliasMatch.key,
      section: null,
    };
  }

  const cfrMatch = normalized.match(/^(21 CFR \d+\.\d+)(.*)$/);
  if (cfrMatch) {
    const [, baseCode, remainder] = cfrMatch;
    const baseBadge = getSourceBadge(baseCode);
    if (baseBadge.full !== baseCode) {
      return {
        key: baseCode,
        fullLabel: baseBadge.full || baseCode,
        shortLabel: baseCode,
        section: remainder.trim() || null,
      };
    }
  }

  return {
    key: normalized,
    fullLabel: getSourceBadge(normalized).full || normalized,
    shortLabel: findGuidanceLink(normalized)?.shortName || normalized,
    section: null,
  };
}

function condenseSections(sections: string[]): string[] {
  const uniqueSections = Array.from(
    new Set(sections.map((section) => normalizeWhitespace(section).replace(/-/g, '–')).filter(Boolean)),
  );
  const sectionSet = new Set(uniqueSections);

  return uniqueSections
    .filter((section) => {
      if (sectionSet.has('Q3–Q4') && (section === 'Q3' || section === 'Q4' || section.startsWith('Q3–'))) {
        return false;
      }
      if (sectionSet.has('§V–VIII') && ['§V', '§VI', '§VII', '§VIII', '§V–VI'].includes(section)) {
        return false;
      }
      if (sectionSet.has('§V–VI') && ['§V', '§VI'].includes(section)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function normalizeSourceCitations(sourceRefs: string[]): PdfSourceCitation[] {
  const grouped = new Map<
    string,
    {
      key: string;
      fullLabel: string;
      shortLabel: string;
      sections: string[];
      order: number;
    }
  >();

  sourceRefs.forEach((sourceRef, index) => {
    const grouping = getSourceGrouping(sourceRef);
    if (!grouped.has(grouping.key)) {
      grouped.set(grouping.key, {
        key: grouping.key,
        fullLabel: grouping.fullLabel,
        shortLabel: grouping.shortLabel,
        sections: grouping.section ? [grouping.section] : [],
        order: index,
      });
      return;
    }

    if (grouping.section) {
      grouped.get(grouping.key)!.sections.push(grouping.section);
    }
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const sections = condenseSections(item.sections);
      const sectionSuffix = sections.length > 0 ? ` (sections referenced: ${sections.join(', ')})` : '';
      const inlineSuffix = sections.length > 0 ? ` (${sections.join(', ')})` : '';

      return {
        text: item.key,
        badge: `${item.fullLabel}${sectionSuffix}`,
        shortText: `${item.shortLabel}${inlineSuffix}`,
      };
    });
}

function deduplicateAndMergeIssues(
  artifact: AssessmentArtifact,
): Array<Omit<PdfOpenIssue, 'sources'> & { sourceRefs: string[]; sources: string[] }> {
  const seen = new Map<string, Omit<PdfOpenIssue, 'sources'> & { sourceRefs: string[]; sources: string[] }>();

  for (const item of artifact.expertReviewItems) {
    const key = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!seen.has(key)) {
      seen.set(key, {
        title: item.title,
        meta: item.meta,
        whyItMatters: item.whyThisMatters,
        actionNeeded: item.actionText,
        actionLabel: item.actionLabel,
        sourceRefs: item.sourceRefs,
        sources: [],
        kind: 'expert-review',
      });
      continue;
    }

    const existing = seen.get(key)!;
    existing.sourceRefs = [...existing.sourceRefs, ...item.sourceRefs];
  }

  for (const item of artifact.evidenceGapItems) {
    const key = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!seen.has(key)) {
      seen.set(key, {
        title: item.title,
        meta: item.meta,
        whyItMatters: item.whyThisMatters,
        actionNeeded: item.actionText,
        actionLabel: item.actionLabel,
        sourceRefs: item.sourceRefs,
        sources: [],
        kind: 'evidence-gap',
      });
      continue;
    }

    const existing = seen.get(key)!;
    existing.sourceRefs = [...existing.sourceRefs, ...item.sourceRefs];
    if (existing.kind !== 'expert-review') {
      existing.meta = item.meta;
      existing.whyItMatters = item.whyThisMatters;
      existing.actionNeeded = item.actionText;
      existing.actionLabel = item.actionLabel;
    }
  }

  return Array.from(seen.values())
    .map((issue) => {
      const rawSourceRefs = deduplicateText(issue.sourceRefs);
      return {
        ...issue,
        sourceRefs: rawSourceRefs,
        sources: normalizeSourceCitations(rawSourceRefs).map((source) => source.shortText),
      };
    })
    .sort((a, b) => {
      const aPriority = a.kind === 'expert-review' ? 1 : 2;
      const bPriority = b.kind === 'expert-review' ? 1 : 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.title.localeCompare(b.title);
    });
}

/* ------------------------------------------------------------------ */
/*  Model builder                                                      */
/* ------------------------------------------------------------------ */

export function buildPdfReportDocument(
  answers: Answers,
  determination: DeterminationResult,
  blocks: Block[],
  getFieldsForBlock: (blockId: string) => AssessmentField[],
  options?: {
    assessmentId?: string;
    assessmentName?: string;
    reviewerNotes?: ReviewerNote[];
  },
): PdfReportDocument {
  const artifact = generateAssessmentArtifact(answers, determination, blocks, getFieldsForBlock);
  const basisView: AssessmentBasisView = buildAssessmentBasisView(answers, determination);
  const openIssues = deduplicateAndMergeIssues(artifact);
  const recordStatus = buildRecordStatus(artifact, openIssues.length);
  const pathway = determination.pathway;
  const generatedAt = new Date().toISOString();
  const narrativeView = splitReportNarrative(artifact.rationale.narrative);
  const narrativeHeadline = softenSummaryStatement(
    narrativeView.headlineReason || artifact.rationale.headlineReason || artifact.rationale.primaryReason,
    pathway,
    artifact,
    openIssues.length,
  );
  const summaryStatement = narrativeHeadline;
  const supportingPoints = deduplicateText(narrativeView.supportingReasoning, [narrativeHeadline]);

  // Collect sources using exact-match dedup (matching ReviewPanel's pushUnique behavior)
  const citedSourceRefs: string[] = [];
  const seenSources = new Set<string>();
  for (const ref of [...artifact.rationale.sources, ...openIssues.flatMap((issue) => issue.sourceRefs)]) {
    const trimmed = ref.trim();
    if (trimmed && !seenSources.has(trimmed)) {
      seenSources.add(trimmed);
      citedSourceRefs.push(trimmed);
    }
  }

  // Alternative pathways — only include if counter-considerations exist and assessment is not incomplete
  const alternativePathways: PdfAlternativePathway[] = [];
  if (!artifact.outcome.isIncomplete && artifact.rationale.counterConsiderations.length > 0) {
    deduplicateText(artifact.rationale.counterConsiderations)
      .slice(0, 4)
      .forEach((desc) => {
        alternativePathways.push({ description: desc });
      });
  }

  return {
    header: {
      title: 'Preliminary Regulatory Change Assessment Record',
      subtitle: 'ChangePath',
      generatedAt,
      assessmentId: options?.assessmentId || null,
      assessmentName: options?.assessmentName || null,
      assessmentStatus: recordStatus,
      schemaVersion: artifact.meta.toolVersion,
      exportVersion: PDF_EXPORT_VERSION,
      preparedFrom: PREPARED_FROM,
    },

    executiveSummary: {
      pathwayLabel: artifact.outcome.isIncomplete ? 'Assessment Incomplete' : pathway,
      pathwayConclusion: buildConclusionStatement(pathway, artifact, openIssues.length),
      recordStatus,
      relianceQualification: buildRelianceQualification(artifact, openIssues.length),
      primaryNextAction: getPrimaryAction(determination, pathway),
      summaryStatement,
      isIncomplete: artifact.outcome.isIncomplete,
    },

    assessmentBasis: {
      recordFacts: basisView.recordFacts.map((f) => ({
        label: f.label,
        value: f.value,
        isMissing: f.isMissing ?? false,
        isLongText: f.isLongText ?? false,
      })),
      systemGeneratedBasis: basisView.systemBasis,
    },

    decisionTrace: {
      steps: artifact.rationale.decisionPath.filter((step) => !step.startsWith('Result:')),
    },

    narrative: {
      headlineReason: narrativeHeadline,
      supportingPoints,
      verificationTitle: artifact.rationale.verificationTitle,
      verificationSteps: deduplicateText(artifact.rationale.verificationSteps),
    },

    openIssues,

    alternativePathways,

    sourcesCited: citedSourceRefs.map((ref) => {
      const grouping = getSourceGrouping(ref);
      return {
        text: grouping.key,
        badge: grouping.fullLabel + (grouping.section ? ` (${grouping.section})` : ''),
        shortText: grouping.shortLabel + (grouping.section ? ` (${grouping.section})` : ''),
      };
    }),

    reviewerNotes: (options?.reviewerNotes || []).map((note) => ({
      author: note.author,
      text: normalizeWhitespace(note.text),
      timestamp: note.timestamp,
    })),

    closing: {
      generatedBy: 'ChangePath',
      timestamp: generatedAt,
      preparedFrom: PREPARED_FROM,
      schemaVersion: artifact.meta.toolVersion,
      exportVersion: PDF_EXPORT_VERSION,
      disclaimer:
        'This document is an internal assessment support record prepared from the current ChangePath assessment record. ' +
        'It is not a regulatory determination, legal opinion, approval record, or substitute for qualified review. ' +
        'ChangePath applies conservative internal policies (e.g., treating unresolved significance uncertainty as requiring a marketing submission) that may exceed FDA minimum requirements; these are risk-based internal choices, not direct regulatory mandates. ' +
        'System-generated basis and rationale text are analytical support only and must be reviewed by qualified regulatory, clinical, and quality personnel against the record facts, cited sources, and applicable procedures before any reliance or action.',
    },
  };
}
