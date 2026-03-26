import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import {
  GuidanceRef,
  HelpTextWithLinks,
} from './ui';
import { Answer, Pathway } from '../lib/assessment-engine';
import type { Answers, Block, DeterminationResult, Question } from '../lib/assessment-engine';
import {
  findGuidanceLink,
  getSourceBadge,
} from '../lib/content';
import { changeTaxonomy } from '../lib/assessment-engine';
import { computeEvidenceGaps } from '../lib/evidence-gaps';
import type { ReviewerNote } from '../lib/assessment-store';
import {
  buildEvidenceGapInsightItems,
  buildExpertReviewItems,
} from '../lib/review-insights';
import { buildCaseSpecificReasoning } from '../lib/case-specific-reasoning';
import { splitReportNarrative } from '../lib/report-basis';

// ─ Small helper components ─

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 12,
  }}>
    {children}
  </div>
);

const CompactBadge: React.FC<{ label: string; bg: string; border: string; text: string }> = ({
  label,
  bg,
  border,
  text,
}) => (
  <span style={{
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
  }}>
    {label}
  </span>
);

const IssueCard: React.FC<{
  title: string;
  actionLabel: string;
  actionText: string;
  kind: 'expert' | 'evidence';
  isCompact?: boolean;
}> = ({ title, actionLabel, actionText, kind, isCompact }) => {
  const bgColor = kind === 'expert' ? '#fffcf2' : '#fff7ed';
  const borderColor = kind === 'expert' ? '#fde7a7' : '#fed7aa';
  const badgeBg = kind === 'expert' ? '#fef3c7' : '#ffedd5';
  const badgeText = kind === 'expert' ? '#92400e' : '#9a3412';

  return (
    <div style={{
      padding: isCompact ? '10px 12px' : '12px 14px',
      borderRadius: 6,
      background: bgColor,
      border: `1px solid ${borderColor}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 6,
      }}>
        <div style={{
          fontSize: isCompact ? 12 : 13,
          fontWeight: 600,
          color: '#111827',
          lineHeight: 1.45,
          flex: 1,
          minWidth: 0,
        }}>
          <HelpTextWithLinks text={title} />
        </div>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: badgeText,
          background: badgeBg,
          borderRadius: 999,
          padding: '2px 7px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {kind === 'expert' ? 'Expert review' : 'Evidence'}
        </span>
      </div>
      <div style={{
        fontSize: isCompact ? 12 : 12.5,
        color: '#4b5563',
        lineHeight: 1.55,
      }}>
        <strong>{actionLabel}:</strong> <HelpTextWithLinks text={actionText} />
      </div>
    </div>
  );
};

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
        color: '#475569',
        lineHeight: 1.5,
      }}
      title={sourceMeta.full}
    >
      {sourceMeta.full}
    </span>
  );
};

interface ReviewPanelProps {
  determination: DeterminationResult;
  answers: Answers;
  blocks: Block[];
  getQuestionsForBlock: (blockId: string) => Question[];
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

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  determination,
  answers,
  blocks,
  getQuestionsForBlock,
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
    () => buildCaseSpecificReasoning(answers, determination, blocks, getQuestionsForBlock),
    [answers, determination, blocks, getQuestionsForBlock],
  );
  const reportNarrative = useMemo(
    () => splitReportNarrative(caseReasoning?.narrative || []),
    [caseReasoning],
  );

  const getPathwayConfig = () => {
    const hasIssues = determination.consistencyIssues?.length > 0;

    switch (pathway) {
      case Pathway.LetterToFile:
      case Pathway.PMAAnnualReport:
        return {
          bg: hasIssues ? '#fffbeb' : '#f0fdf4',
          border: hasIssues ? '#fde68a' : '#bbf7d0',
          accent: hasIssues ? '#d97706' : '#16a34a',
          statusLabel: 'Documentation-only route',
        };
      case Pathway.ImplementPCCP:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          accent: '#2563eb',
          statusLabel: 'Authorized PCCP route',
        };
      case Pathway.NewSubmission:
      case Pathway.PMASupplementRequired:
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          accent: '#dc2626',
          statusLabel: 'Submission route',
        };
      case Pathway.AssessmentIncomplete:
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          accent: '#d97706',
          statusLabel: 'Assessment not complete',
        };
      default:
        return {
          bg: '#f9fafb',
          border: '#e5e7eb',
          accent: '#6b7280',
          statusLabel: 'Route summary',
        };
    }
  };

  const config = getPathwayConfig();
  const { consistencyIssues = [], pccpRecommendation } = determination;
  const isIncomplete = determination.isIncomplete;
  const hasCriticalGaps = criticalGaps.length > 0;
  const isDocOnlyWithCriticalGaps = determination.isDocOnly && hasCriticalGaps;

  const hasPCCP = answers.A2 === Answer.Yes;
  const isNewSub = determination.isNewSub;
  const selectedChangeType = (answers.B1 && answers.B2)
    ? changeTaxonomy[answers.B1 as string]?.types?.find((item) => item.name === answers.B2)
    : null;
  const pccpEligibility = selectedChangeType?.pccp;
  const showPCCPRecommendation = pccpRecommendation?.shouldRecommend
    && !hasPCCP
    && isNewSub
    && pccpEligibility
    && ['TYPICAL', 'CONDITIONAL'].includes(pccpEligibility);

  const pccpHeroSummary = showPCCPRecommendation ? {
    heading: pccpEligibility === 'TYPICAL'
      ? 'PCCP application recommended in the upcoming submission'
      : 'PCCP application may be worth requesting in the upcoming submission',
    summary: pccpEligibility === 'TYPICAL'
      ? 'This change type is generally suitable for future PCCP authorization. Because this assessment already routes to a new submission and no PCCP is currently authorized, this submission is the right time to seek pre-authorization for similar future changes within explicit bounds.'
      : 'This change type can sometimes be authorized in a PCCP, but only when future modifications can be tightly bounded and prospectively validated. Because this assessment already routes to a new submission and no PCCP is currently authorized, this submission is the right opportunity to evaluate that option.',
    detail: selectedChangeType?.pccpNote || null,
  } : null;

  const getPrimaryAction = () => {
    if (pathway === Pathway.LetterToFile || pathway === Pathway.PMAAnnualReport) {
      return 'Document rationale and file in device history record';
    }
    if (pathway === Pathway.ImplementPCCP) {
      return 'Execute PCCP validation protocol before implementation';
    }
    if (pathway === Pathway.NewSubmission) {
      return 'Prepare 510(k) or De Novo submission with updated device description';
    }
    if (pathway === Pathway.PMASupplementRequired) {
      return 'Determine supplement type and prepare submission package';
    }
    if (determination.isIntendedUseUncertain) {
      return 'Resolve intended use uncertainty through senior RA/clinical expert review or an FDA Pre-Submission (Q-Sub) before re-running this assessment';
    }
    if (determination.pmaIncomplete) {
      return 'Complete the PMA safety/effectiveness, labeling, and manufacturing questions before the determination can be finalized';
    }
    if (determination.pccpIncomplete) {
      return 'Complete the PCCP scope review to determine whether this change can be implemented under the authorized PCCP';
    }
    if (determination.hasUncertainSignificance) {
      return "Resolve the unresolved risk and performance questions using validation evidence and RA/clinical review so each answer can be closed as 'Yes' or 'No'";
    }
    if (determination.seUncertain) {
      return 'Resolve whether substantial equivalence still holds on the full cumulative record, then confirm whether a different regulatory path is needed';
    }
    return 'Complete remaining assessment questions to finalize the determination';
  };

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


  const whyThisRouteItems = useMemo(() => {
    const items: string[] = [];
    const push = (value: string | null | undefined) => {
      if (!value) return;
      const trimmed = value.trim();
      if (!trimmed || items.includes(trimmed)) return;
      items.push(trimmed);
    };

    caseReasoning.decisionPath
      .filter((step) => !step.startsWith('Result:'))
      .forEach(push);

    if (items.length === 0) {
      push(reportNarrative.headlineReason || caseReasoning.primaryReason);
    }

    return items.slice(0, 3);
  }, [caseReasoning, reportNarrative.headlineReason]);

  const supportingNextSteps = useMemo(() => {
    if (mergedBlockers.length > 0) {
      return mergedBlockers.slice(0, 2).map((item) => item.actionText);
    }

    const items: string[] = [];
    if (!isIncomplete && onHandoff) {
      items.push(
        determination.isPCCPImpl
          ? 'Open the preparation checklist and complete the PCCP implementation package.'
          : determination.isDocOnly
            ? 'Open the preparation checklist and assemble the documentation package.'
            : 'Open the preparation checklist and start assembling the submission package.',
      );
    }
    caseReasoning.verificationSteps.forEach((step) => {
      if (items.length < 2 && !items.includes(step)) {
        items.push(step);
      }
    });
    return items.slice(0, 2);
  }, [caseReasoning.verificationSteps, determination.isDocOnly, determination.isPCCPImpl, isIncomplete, mergedBlockers, onHandoff]);

  const relianceState = useMemo(() => {
    if (isIncomplete) {
      return {
        label: 'Not ready yet',
        detail: 'Critical questions are still unanswered or unresolved, so the route cannot be finalized yet.',
        bg: '#fff7ed',
        border: '#fdba74',
        text: '#9a3412',
      };
    }

    if (mergedBlockers.length > 0 || hasCriticalGaps || isDocOnlyWithCriticalGaps) {
      const blockerCount = mergedBlockers.length > 0 ? mergedBlockers.length : criticalGaps.length;
      return {
        label: 'Open issues remain',
        detail: `${blockerCount} open issue${blockerCount === 1 ? '' : 's'} still need resolution before this route should be used as the basis for action.`,
        bg: '#fffbeb',
        border: '#fde68a',
        text: '#92400e',
      };
    }

    return {
      label: 'Ready to proceed',
      detail: 'No unresolved issues are surfaced in the current record, so the route is ready for the next workflow step, subject to normal expert review.',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534',
    };
  }, [criticalGaps.length, hasCriticalGaps, isDocOnlyWithCriticalGaps, isIncomplete, mergedBlockers.length]);

  return (
    <div className="animate-fade-in-up">
      {/* ─ HERO BANNER: Compact route + next step ─ */}
      <div style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 8,
        padding: '20px 24px',
        marginBottom: 16,
      }}>
        {/* Route + status */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: config.accent,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {config.statusLabel}
            </span>
            <CompactBadge
              label={relianceState.label}
              bg={relianceState.bg}
              border={relianceState.border}
              text={relianceState.text}
            />
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 6px',
            lineHeight: 1.2,
          }}>
            {isIncomplete ? 'Assessment cannot be finalized yet' : pathway}
          </h1>
          <p style={{
            fontSize: 13,
            color: '#4b5563',
            margin: 0,
            lineHeight: 1.55,
          }}>
            {relianceState.detail}
          </p>
        </div>
      </div>

      {/* ─ TWO EQUAL COLUMNS: Why This Route + Open Issues ─ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 16,
      }}>
        {/* LEFT: Why This Route */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '18px 20px',
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 12,
          }}>
            Why This Route
          </div>
          {whyThisRouteItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {whyThisRouteItems.map((item, index) => (
                <div
                  key={`route-reason-${index}`}
                  style={{
                    fontSize: 13,
                    color: '#374151',
                    lineHeight: 1.55,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#9ca3af', flexShrink: 0, marginTop: 2 }}>•</span>
                  <span><HelpTextWithLinks text={item} /></span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, lineHeight: 1.55 }}>
              No additional reasoning available.
            </p>
          )}

          {pccpHeroSummary && (
            <div
              data-testid="pccp-recommendation"
              style={{
                marginTop: 14,
                padding: '12px 14px',
                borderRadius: 6,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
              }}
            >
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#1d4ed8',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 4,
              }}>
                PCCP Strategy
              </div>
              <div style={{ fontSize: 12.5, color: '#1e3a8a', lineHeight: 1.55 }}>
                <strong>{pccpHeroSummary.heading}.</strong> {pccpHeroSummary.summary}
                {pccpHeroSummary.detail ? ` What must be true: ${pccpHeroSummary.detail}` : ''}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Open Issues */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '18px 20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Open Issues
            </div>
            {mergedBlockers.length > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#92400e',
                padding: '2px 8px',
                borderRadius: 999,
                background: '#fffbeb',
                border: '1px solid #fde68a',
              }}>
                {mergedBlockers.length}
              </span>
            )}
          </div>

          {mergedBlockers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mergedBlockers.map((item) => (
                <IssueCard
                  key={item.id}
                  title={item.title}
                  actionLabel={item.actionLabel}
                  actionText={item.actionText}
                  kind={item.kind}
                  isCompact
                />
              ))}
            </div>
          ) : (
            <div style={{
              padding: '12px 14px',
              borderRadius: 6,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: 13,
              color: '#166534',
              lineHeight: 1.55,
            }}>
              No unresolved issues in the current record.
            </div>
          )}
        </div>
      </div>

      {/* ─ AUTHORITIES REFERENCES ─ */}
      {caseReasoning.sources.length > 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '18px 20px',
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 12,
          }}>
            Authorities Relied On
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {caseReasoning.sources.map((source) => (
              <div key={`reasoning-source-${source}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#9ca3af', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                <EvidenceGapSourceRef code={source} />
              </div>
            ))}
          </div>
        </div>
      )}

      {onAddNote && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 24,
        }}>
          <SectionLabel>Reviewer Notes</SectionLabel>

          {reviewerNotes && reviewerNotes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {reviewerNotes.map((note) => (
                <div key={note.id} style={{
                  padding: '10px 12px',
                  background: '#f9fafb',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      {note.author}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
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
                            color: '#9ca3af',
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
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                    {note.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={noteAuthor}
              onChange={(e) => setNoteAuthor(e.target.value)}
              placeholder="Your name"
              style={{
                width: 140,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a review note..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && noteAuthor.trim() && noteText.trim()) {
                  onAddNote(noteAuthor.trim(), noteText.trim());
                  setNoteText('');
                }
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={() => {
                if (noteAuthor.trim() && noteText.trim()) {
                  onAddNote(noteAuthor.trim(), noteText.trim());
                  setNoteText('');
                }
              }}
              disabled={!noteAuthor.trim() || !noteText.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: noteAuthor.trim() && noteText.trim() ? '#111827' : '#e5e7eb',
                border: 'none',
                color: noteAuthor.trim() && noteText.trim() ? '#fff' : '#9ca3af',
                fontSize: 13,
                fontWeight: 500,
                cursor: noteAuthor.trim() && noteText.trim() ? 'pointer' : 'default',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: onHandoff && !determination.isIncomplete ? 0 : 24,
      }}>
        <button
          onClick={() => window.print()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 6,
            background: '#111827',
            border: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Icon name="printer" size={14} color="#fff" />
          Print Assessment Summary
        </button>
      </div>

      {onHandoff && !determination.isIncomplete && (
        <div
          data-testid="handoff-cta"
          style={{
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            background: consistencyIssues.length > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
            border: `1px solid ${consistencyIssues.length > 0 ? 'var(--color-warning-border)' : 'var(--color-success-border)'}`,
            marginTop: 'var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-lg)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: '0 0 var(--space-xs)',
            }}>
              {consistencyIssues.length > 0
                ? 'Open issues remain before this route should be used'
                : 'Ready to prepare documentation?'}
            </h4>
            <p style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}>
              {consistencyIssues.length > 0
                ? 'This assessment still contains unresolved issues that need expert review. The preparation checklist is available, but the route should not be treated as final until those issues are closed.'
                : 'Open the preparation checklist for this route.'}
            </p>
          </div>
          <button
            onClick={onHandoff}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-success)',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
            }}
          >
            {determination.isPCCPImpl
              ? 'Prepare PCCP package'
              : determination.isDocOnly
                ? 'Prepare documentation'
                : 'View preparation checklist'}
            <Icon name="arrow" size={16} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
};
