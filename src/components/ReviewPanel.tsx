import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import {
  GuidanceRef,
  HelpTextWithLinks,
} from './ui';
import { Answer, Pathway, changeTaxonomy } from '../lib/assessment-engine';
import type { Answers, Block, DeterminationResult, AssessmentField } from '../lib/assessment-engine';
import {
  findGuidanceLink,
  getSourceBadge,
} from '../lib/content';
import { computeEvidenceGaps } from '../lib/evidence-gaps';
import type { ReviewerNote } from '../lib/assessment-store';
import {
  buildEvidenceGapInsightItems,
  buildExpertReviewItems,
} from '../lib/review-insights';
import { buildCaseSpecificReasoning } from '../lib/case-specific-reasoning';
import {
  buildAssessmentBasisView,
  splitReportNarrative,
  type AssessmentRecordFact,
} from '../lib/report-basis';

const SectionCard: React.FC<{
  children: React.ReactNode;
  accentColor?: string;
  background?: string;
  borderColor?: string;
  dataTestId?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  accentColor,
  background = 'var(--color-bg-elevated)',
  borderColor = 'var(--color-border)',
  dataTestId,
  style,
}) => (
  <div
    data-testid={dataTestId}
    style={{
      background,
      border: `1px solid ${borderColor}`,
      borderLeft: accentColor ? `4px solid ${accentColor}` : `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2
    style={{
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--color-text)',
      margin: 0,
      lineHeight: 1.25,
    }}
  >
    {children}
  </h2>
);

const SubsectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--color-text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: 8,
    }}
  >
    {children}
  </div>
);

const CompactBadge: React.FC<{ label: string; bg: string; border: string; text: string }> = ({
  label,
  bg,
  border,
  text,
}) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 999,
      background: bg,
      color: text,
      border: `1px solid ${border}`,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

const SummaryField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div
    style={{
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
    }}
  >
    <SubsectionLabel>{label}</SubsectionLabel>
    {children}
  </div>
);

const RecordFactBlock: React.FC<{ fact: AssessmentRecordFact }> = ({ fact }) => (
  <div
    style={{
      padding: fact.isLongText ? '12px 14px' : '10px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 6,
      }}
    >
      {fact.label}
    </div>
    <div
      style={{
        fontSize: 13,
        color: fact.isMissing ? 'var(--color-text-muted)' : 'var(--color-text)',
        lineHeight: 1.6,
        whiteSpace: fact.isLongText ? 'pre-wrap' : 'normal',
        wordBreak: 'break-word',
      }}
    >
      <HelpTextWithLinks text={fact.value} />
    </div>
  </div>
);

const TraceStep: React.FC<{
  index: number;
  text: string;
}> = ({ index, text }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
    }}
  >
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 999,
        background: 'var(--color-primary-muted)',
        color: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      {index + 1}
    </div>
    <div
      style={{
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
        minWidth: 0,
      }}
    >
      <HelpTextWithLinks text={text} />
    </div>
  </div>
);

const EvidenceGapSourceRef: React.FC<{ code: string }> = ({ code }) => {
  const link = findGuidanceLink(code);
  const sourceMeta = getSourceBadge(code);

  if (link) {
    return <GuidanceRef code={code} />;
  }

  return (
    <span
      style={{
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5,
      }}
      title={sourceMeta.full}
    >
      {sourceMeta.full}
    </span>
  );
};

const IssueCard: React.FC<{
  title: string;
  meta: string;
  whyThisMatters: string;
  actionLabel: string;
  actionText: string;
  sourceRefs: string[];
  kind: 'expert' | 'evidence';
}> = ({
  title,
  meta,
  whyThisMatters,
  actionLabel,
  actionText,
  sourceRefs,
  kind,
}) => {
  const uniqueSources = Array.from(new Set(sourceRefs));
  const accent = kind === 'expert'
    ? {
        bg: 'var(--color-warning-bg)',
        border: 'var(--color-warning-border)',
        badgeBg: '#fef3c7',
        badgeText: '#92400e',
      }
    : {
        bg: '#fff7ed',
        border: '#fed7aa',
        badgeBg: '#ffedd5',
        badgeText: '#9a3412',
      };

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: accent.bg,
        border: `1px solid ${accent.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text)',
            lineHeight: 1.45,
            flex: 1,
            minWidth: 0,
          }}
        >
          <HelpTextWithLinks text={title} />
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: accent.badgeText,
            background: accent.badgeBg,
            borderRadius: 999,
            padding: '3px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {kind === 'expert' ? 'Expert Review' : 'Evidence Gap'}
        </span>
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {meta}
      </div>

      <div
        style={{
          display: 'grid',
          gap: 10,
        }}
      >
        <div>
          <SubsectionLabel>Why It Matters</SubsectionLabel>
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <HelpTextWithLinks text={whyThisMatters} />
          </div>
        </div>

        <div>
          <SubsectionLabel>{actionLabel}</SubsectionLabel>
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <HelpTextWithLinks text={actionText} />
          </div>
        </div>

        {uniqueSources.length > 0 && (
          <div>
            <SubsectionLabel>Basis</SubsectionLabel>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {uniqueSources.map((source) => (
                <div
                  key={`${title}-${source}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                  <EvidenceGapSourceRef code={source} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ReviewPanelProps {
  determination: DeterminationResult;
  answers: Answers;
  blocks: Block[];
  getFieldsForBlock: (blockId: string) => AssessmentField[];
  onHandoff?: () => void;
  reviewerNotes?: ReviewerNote[];
  onAddNote?: (author: string, text: string) => void;
  onRemoveNote?: (noteId: string) => void;
}

interface MergedBlockerItem {
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

const getPathwayConfig = (pathway: string, hasIssues: boolean) => {
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
};

const getPrimaryAction = (determination: DeterminationResult, pathway: string): string => {
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
};

const getIncompleteHeading = (determination: DeterminationResult): string => {
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
};

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  determination,
  answers,
  blocks,
  getFieldsForBlock,
  onHandoff,
  reviewerNotes,
  onAddNote,
  onRemoveNote,
}) => {
  const pathway = determination.pathway;
  const [noteAuthor, setNoteAuthor] = useState('');
  const [noteText, setNoteText] = useState('');

  const evidenceGaps = useMemo(() => computeEvidenceGaps(answers, determination), [answers, determination]);
  const criticalGaps = evidenceGaps.filter((gap) => gap.severity === 'critical');
  const expertReviewItems = useMemo(
    () => buildExpertReviewItems(answers, determination),
    [answers, determination],
  );
  const evidenceGapItems = useMemo(
    () => buildEvidenceGapInsightItems(answers, determination, evidenceGaps),
    [answers, determination, evidenceGaps],
  );
  const caseReasoning = useMemo(
    () => buildCaseSpecificReasoning(answers, determination, blocks, getFieldsForBlock),
    [answers, determination, blocks, getFieldsForBlock],
  );
  const assessmentBasisView = useMemo(
    () => buildAssessmentBasisView(answers, determination),
    [answers, determination],
  );
  const reportNarrative = useMemo(
    () => splitReportNarrative(caseReasoning.narrative || []),
    [caseReasoning],
  );

  const selectedChangeType = (answers.B1 && answers.B2)
    ? changeTaxonomy[answers.B1 as string]?.types?.find((item) => item.name === answers.B2)
    : null;
  const pccpEligibility = selectedChangeType?.pccp;
  const showPCCPRecommendation = determination.pccpRecommendation?.shouldRecommend
    && answers.A2 !== Answer.Yes
    && determination.isNewSub
    && pccpEligibility
    && ['TYPICAL', 'CONDITIONAL'].includes(pccpEligibility);

  const pccpHeroSummary = showPCCPRecommendation ? {
    heading: pccpEligibility === 'TYPICAL'
      ? 'Consider a PCCP in the next marketing submission'
      : 'Evaluate PCCP feasibility in the next marketing submission',
    summary: pccpEligibility === 'TYPICAL'
      ? 'For this change pattern, PCCP is often a reasonable mechanism when modifications are pre-described, bounded, and validated prospectively. This assessment already maps to a new submission and no authorized PCCP is on file, so the next submission is a practical point to request PCCP coverage if scope and evidence support it.'
      : 'PCCP may apply only when future changes are tightly bounded and supported by prospective validation. This assessment maps to a new submission with no authorized PCCP on file; use the next submission to assess whether PCCP is viable for your program, subject to RA judgment and any FDA interaction.',
    detail: selectedChangeType?.pccpNote || null,
  } : null;

  const mergedBlockers = useMemo(() => {
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
  }, [evidenceGapItems, expertReviewItems]);

  const consistencyIssues = determination.consistencyIssues || [];
  const isIncomplete = determination.isIncomplete;
  const hasCriticalGaps = criticalGaps.length > 0;
  const isDocOnlyWithCriticalGaps = determination.isDocOnly && hasCriticalGaps;
  const config = getPathwayConfig(pathway, consistencyIssues.length > 0);
  const primaryAction = getPrimaryAction(determination, pathway);
  const summaryReason = reportNarrative.headlineReason || caseReasoning.narrative[1] || caseReasoning.primaryReason;

  const relianceState = useMemo(() => {
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
      label: 'Ready for review',
      detail: 'No open issues are listed on the current record. Continue with standard expert review and QMS controls before action.',
      bg: 'var(--color-success-bg)',
      border: 'var(--color-success-border)',
      text: 'var(--color-success)',
    };
  }, [criticalGaps.length, hasCriticalGaps, isDocOnlyWithCriticalGaps, isIncomplete, mergedBlockers.length]);

  const shortRecordFacts = assessmentBasisView.recordFacts.filter((fact) => !fact.isLongText);
  const longRecordFacts = assessmentBasisView.recordFacts.filter((fact) => fact.isLongText);

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
  }, [caseReasoning.verificationSteps, determination.isDocOnly, determination.isPCCPImpl, isIncomplete, mergedBlockers, onHandoff]);

  const showPreparationSection = Boolean(onHandoff || supportingNextSteps.length > 0);
  const showReviewerNotes = Boolean(onAddNote || (reviewerNotes && reviewerNotes.length > 0));
  const preparationNeedsCaution = mergedBlockers.length > 0 || consistencyIssues.length > 0;

  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
      }}
    >
      <SectionCard
        accentColor={config.accent}
        background={config.surface}
        borderColor={config.border}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--space-lg)',
            flexWrap: 'wrap',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: config.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 8,
              }}
            >
              {config.label}
            </div>

            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: '0 0 10px',
                lineHeight: 1.2,
              }}
            >
              {isIncomplete ? getIncompleteHeading(determination) : pathway}
            </h1>

            {summaryReason && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.65,
                  maxWidth: 760,
                }}
              >
                <strong style={{ color: 'var(--color-text)' }}>Assessment reasoning:</strong>{' '}
                <HelpTextWithLinks text={summaryReason} />
              </div>
            )}
          </div>

          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-text)',
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="printer" size={14} color="#fff" />
            Print Assessment Summary
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <SummaryField label="Recommended Pathway">
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text)',
                lineHeight: 1.45,
              }}
            >
              {pathway}
            </div>
          </SummaryField>

          <SummaryField label="Reliance State">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CompactBadge
                label={relianceState.label}
                bg={relianceState.bg}
                border={relianceState.border}
                text={relianceState.text}
              />
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.55,
                }}
              >
                {relianceState.detail}
              </div>
            </div>
          </SummaryField>

          <SummaryField label="Primary Next Action">
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text)',
                lineHeight: 1.6,
              }}
            >
              <HelpTextWithLinks text={primaryAction} />
            </div>
          </SummaryField>
        </div>

        {pccpHeroSummary && (
          <div
            data-testid="pccp-recommendation"
            style={{
              marginTop: 'var(--space-lg)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-info-border)',
            }}
          >
            <SubsectionLabel>PCCP Planning Note</SubsectionLabel>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.65,
              }}
            >
              <strong style={{ color: 'var(--color-text)' }}>{pccpHeroSummary.heading}.</strong>{' '}
              <HelpTextWithLinks text={pccpHeroSummary.summary} />
              {pccpHeroSummary.detail ? (
                <>
                  {' '}<strong style={{ color: 'var(--color-text)' }}>Boundary note:</strong>{' '}
                  <HelpTextWithLinks text={pccpHeroSummary.detail} />
                </>
              ) : null}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <SectionHeading>Assessment Basis</SectionHeading>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-lg)',
          }}
        >
          <div>
            <SubsectionLabel>Record Facts</SubsectionLabel>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              User-entered or selected fields from the current record.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
                marginBottom: longRecordFacts.length > 0 ? 10 : 0,
              }}
            >
              {shortRecordFacts.map((fact) => (
                <RecordFactBlock key={fact.label} fact={fact} />
              ))}
            </div>

            {longRecordFacts.length > 0 && (
              <div style={{ display: 'grid', gap: 10 }}>
                {longRecordFacts.map((fact) => (
                  <RecordFactBlock key={fact.label} fact={fact} />
                ))}
              </div>
            )}
          </div>

          <div>
            <SubsectionLabel>System Basis</SubsectionLabel>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              System-generated basis derived from the current record and pathway logic.
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {assessmentBasisView.systemBasis.length > 0 ? assessmentBasisView.systemBasis.map((item, index) => (
                <div
                  key={`basis-${index}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.65,
                  }}
                >
                  <HelpTextWithLinks text={item} />
                </div>
              )) : (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  No additional assessment-basis detail is available for this record.
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-lg)',
        }}
      >
        <SectionCard style={{ height: '100%' }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <SectionHeading>Decision Trace</SectionHeading>
          </div>

          {decisionSupportNotes.length > 0 && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-muted)',
                border: '1px solid var(--color-info-border)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <SubsectionLabel>Assessment Reasoning</SubsectionLabel>
              <div style={{ display: 'grid', gap: 8 }}>
                {decisionSupportNotes.map((item, index) => (
                  <div
                    key={`support-note-${index}`}
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    <HelpTextWithLinks text={item} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {decisionTraceSteps.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {decisionTraceSteps.map((step, index) => (
                <TraceStep key={`trace-step-${index}`} index={index} text={step} />
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                fontSize: 13,
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
              }}
            >
              No decision-trace detail is available for this record.
            </div>
          )}
        </SectionCard>

        {alternativePathwayNotes.length > 0 && (
          <SectionCard style={{ height: '100%' }}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <SectionHeading>Alternative Pathways</SectionHeading>
            </div>

            <div
              style={{
                fontSize: 12.5,
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              System-generated comparison against conditions that would support a different pathway.
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {alternativePathwayNotes.map((item, index) => (
                <div
                  key={`alternative-${index}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.65,
                  }}
                >
                  <HelpTextWithLinks text={item} />
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      <SectionCard>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 'var(--space-md)',
            flexWrap: 'wrap',
          }}
        >
          <SectionHeading>Open Issues</SectionHeading>
          {mergedBlockers.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-warning)',
                padding: '3px 8px',
                borderRadius: 999,
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
              }}
            >
              {mergedBlockers.length}
            </span>
          )}
        </div>

        {mergedBlockers.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {mergedBlockers.map((item) => (
              <IssueCard
                key={item.id}
                title={item.title}
                meta={item.meta}
                whyThisMatters={item.whyThisMatters}
                actionLabel={item.actionLabel}
                actionText={item.actionText}
                sourceRefs={item.sourceRefs}
                kind={item.kind}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            No open issues are listed for this record. Continue with standard expert review and QMS controls before action.
          </div>
        )}
      </SectionCard>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-lg)',
        }}
      >
        {citedSources.length > 0 && (
          <SectionCard style={{ height: '100%' }}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <SectionHeading>Sources Cited</SectionHeading>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {citedSources.map((source) => (
                <div
                  key={`reasoning-source-${source}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                  <EvidenceGapSourceRef code={source} />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {showPreparationSection && (
          <SectionCard
            dataTestId={onHandoff && !determination.isIncomplete ? 'handoff-cta' : undefined}
            background={preparationNeedsCaution ? 'var(--color-warning-bg)' : 'var(--color-bg-elevated)'}
            borderColor={preparationNeedsCaution ? 'var(--color-warning-border)' : 'var(--color-border)'}
            style={{ height: '100%' }}
          >
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <SectionHeading>Preparation Checklist</SectionHeading>
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.65,
                marginBottom: supportingNextSteps.length > 0 ? 12 : 0,
              }}
            >
              {determination.isIncomplete
                ? 'Complete pathway-critical fields before treating this record as ready for the preparation checklist.'
                : preparationNeedsCaution
                  ? 'The checklist can be opened from this record, but open issues remain and should be closed before reliance or execution.'
                  : 'Use the checklist as the next execution step for this pathway.'}
            </div>

            {supportingNextSteps.length > 0 && (
              <div style={{ display: 'grid', gap: 8, marginBottom: onHandoff && !determination.isIncomplete ? 16 : 0 }}>
                {supportingNextSteps.map((step, index) => (
                  <TraceStep key={`next-step-${index}`} index={index} text={step} />
                ))}
              </div>
            )}

            {onHandoff && !determination.isIncomplete && (
              <button
                onClick={onHandoff}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-success)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {determination.isPCCPImpl
                  ? 'Prepare PCCP Package'
                  : determination.isDocOnly
                    ? 'Prepare Documentation'
                    : 'Open Preparation Checklist'}
                <Icon name="arrow" size={14} color="#fff" />
              </button>
            )}
          </SectionCard>
        )}
      </div>

      {showReviewerNotes && (
        <SectionCard>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <SectionHeading>Reviewer Notes</SectionHeading>
          </div>

          <div
            style={{
              fontSize: 12.5,
              color: 'var(--color-text-tertiary)',
              lineHeight: 1.55,
              marginBottom: 12,
            }}
          >
            Reviewer-entered comments for this assessment record.
          </div>

          {reviewerNotes && reviewerNotes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: onAddNote ? 14 : 0 }}>
              {reviewerNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--color-bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                      {note.author}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                        {new Date(note.timestamp).toLocaleString()}
                      </span>
                      {onRemoveNote && (
                        <button
                          onClick={() => onRemoveNote(note.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 2,
                            color: 'var(--color-text-muted)',
                            fontSize: 14,
                            lineHeight: 1,
                          }}
                          title="Remove note"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {note.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          {onAddNote && (
            <div
              style={{
                display: 'grid',
                gap: 10,
              }}
            >
              <input
                type="text"
                value={noteAuthor}
                onChange={(e) => setNoteAuthor(e.target.value)}
                placeholder="Reviewer name"
                style={{
                  width: '100%',
                  maxWidth: 220,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  outline: 'none',
                  color: 'var(--color-text)',
                  background: 'var(--color-bg-card)',
                }}
              />

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add reviewer note"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical',
                  color: 'var(--color-text)',
                  background: 'var(--color-bg-card)',
                  fontFamily: 'inherit',
                }}
              />

              <div>
                <button
                  onClick={() => {
                    if (noteAuthor.trim() && noteText.trim()) {
                      onAddNote(noteAuthor.trim(), noteText.trim());
                      setNoteText('');
                    }
                  }}
                  disabled={!noteAuthor.trim() || !noteText.trim()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: noteAuthor.trim() && noteText.trim() ? 'var(--color-text)' : 'var(--color-border)',
                    border: 'none',
                    color: noteAuthor.trim() && noteText.trim() ? '#fff' : 'var(--color-text-muted)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: noteAuthor.trim() && noteText.trim() ? 'pointer' : 'default',
                  }}
                >
                  Add Note
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};
