import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import {
  GuidanceRef,
  HelpTextWithLinks,
} from './ui';
import { Answer, Pathway } from '../lib/assessment-engine';
import type { Answers, Block, DeterminationResult, AssessmentField } from '../lib/assessment-engine';
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
          {kind === 'expert' ? 'Expert review' : 'Evidence gap'}
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
          statusLabel: 'Documentation-only pathway',
        };
      case Pathway.ImplementPCCP:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          accent: '#2563eb',
          statusLabel: 'Authorized PCCP pathway',
        };
      case Pathway.NewSubmission:
      case Pathway.PMASupplementRequired:
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          accent: '#dc2626',
          statusLabel: 'Submission pathway',
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
          statusLabel: 'Pathway summary',
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
      ? 'Consider a PCCP in the next marketing submission'
      : 'Evaluate PCCP feasibility in the next marketing submission',
    summary: pccpEligibility === 'TYPICAL'
      ? 'For this change pattern, PCCP is often a reasonable mechanism when modifications are pre-described, bounded, and validated prospectively. This assessment already maps to a new submission and no authorized PCCP is on file, so the next submission is a practical point to request PCCP coverage if scope and evidence support it.'
      : 'PCCP may apply only when future changes are tightly bounded and supported by prospective validation. This assessment maps to a new submission with no authorized PCCP on file; use the next submission to assess whether PCCP is viable for your program, subject to RA judgment and any FDA interaction.',
    detail: selectedChangeType?.pccpNote || null,
  } : null;

  const getPrimaryAction = () => {
    if (pathway === Pathway.LetterToFile || pathway === Pathway.PMAAnnualReport) {
      return 'Document rationale and file per QMS (e.g., device history record)';
    }
    if (pathway === Pathway.ImplementPCCP) {
      return 'Complete PCCP validation per the authorized protocol before implementation';
    }
    if (pathway === Pathway.NewSubmission) {
      return 'Prepare 510(k) or De Novo materials, including an updated device description, per your strategy';
    }
    if (pathway === Pathway.PMASupplementRequired) {
      return 'Confirm supplement type and assemble the submission package per 21 CFR 814.39 and applicable FDA policy';
    }
    if (determination.isIntendedUseUncertain) {
      return 'Resolve intended-use uncertainty through senior RA/clinical review or an FDA Pre-Submission (Q-Sub), then update this assessment';
    }
    if (determination.pmaIncomplete) {
      return 'Complete PMA safety/effectiveness, labeling, and manufacturing fields before treating the determination as final';
    }
    if (determination.pccpIncomplete) {
      return 'Complete PCCP scope review to confirm whether implementation is supported under the authorized PCCP';
    }
    if (determination.hasUncertainSignificance) {
      return "Close risk and performance fields with evidence and RA/clinical review so each U.S. significance response is 'Yes' or 'No' where possible";
    }
    if (determination.seUncertain) {
      return 'Reassess substantial equivalence on the full cumulative record, then confirm whether a different regulatory pathway is needed';
    }
    return 'Complete remaining assessment fields before treating the determination as final';
  };

  const getIncompleteHeading = (): string => {
    if (determination.isIntendedUseUncertain) {
      return 'Assessment incomplete — intended-use impact unresolved';
    }
    if (determination.pmaIncomplete) {
      return 'Assessment incomplete — PMA significance fields remain';
    }
    if (determination.pccpIncomplete) {
      return 'Assessment incomplete — PCCP scope review required';
    }
    if (determination.hasUncertainSignificance) {
      return 'Assessment incomplete — significance fields unresolved';
    }
    if (determination.seUncertain) {
      return 'Assessment incomplete — substantial equivalence uncertain';
    }
    return 'Assessment incomplete — required fields remain';
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


  const whyThisPathwayItems = useMemo(() => {
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
          ? 'Open the preparation checklist and complete the PCCP implementation record per your authorized plan.'
          : determination.isDocOnly
            ? 'Open the preparation checklist and assemble the documentation package per QMS.'
            : 'Open the preparation checklist and begin the submission package per your strategy.',
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
        detail: 'Pathway-critical fields are still open, so the pathway should not be treated as final.',
        bg: '#fff7ed',
        border: '#fdba74',
        text: '#9a3412',
      };
    }

    if (mergedBlockers.length > 0 || hasCriticalGaps || isDocOnlyWithCriticalGaps) {
      const blockerCount = mergedBlockers.length > 0 ? mergedBlockers.length : criticalGaps.length;
      return {
        label: 'Open issues remain',
        detail: `${blockerCount} open issue${blockerCount === 1 ? '' : 's'} remain. Resolve them before using this pathway as the basis for action.`,
        bg: '#fffbeb',
        border: '#fde68a',
        text: '#92400e',
      };
    }

    return {
      label: 'Ready to proceed',
      detail: 'No open issues are listed for this record. Proceed only after your standard expert review and QMS steps.',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534',
    };
  }, [criticalGaps.length, hasCriticalGaps, isDocOnlyWithCriticalGaps, isIncomplete, mergedBlockers.length]);

  return (
    <div className="animate-fade-in-up">
      {/* ─ HERO BANNER: Compact pathway + next step ─ */}
      <div style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 8,
        padding: '20px 24px',
        marginBottom: 16,
      }}>
        {/* Pathway + status */}
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
            {isIncomplete ? getIncompleteHeading() : pathway}
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

      {/* ─ TWO EQUAL COLUMNS: Why this pathway + Open Issues ─ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 16,
      }}>
        {/* LEFT: Why this pathway */}
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
            Why this pathway
          </div>
          {whyThisPathwayItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {whyThisPathwayItems.map((item, index) => (
                <div
                  key={`pathway-reason-${index}`}
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
              No additional rationale is available for this record.
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
                PCCP planning note
              </div>
              <div style={{ fontSize: 12.5, color: '#1e3a8a', lineHeight: 1.55 }}>
                <strong>{pccpHeroSummary.heading}.</strong> {pccpHeroSummary.summary}
                {pccpHeroSummary.detail ? ` Preconditions: ${pccpHeroSummary.detail}` : ''}
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
              No open issues listed for this record.
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
            Sources cited
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
              placeholder="Add a reviewer note..."
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
                ? 'Open issues remain — review before execution'
                : 'Open preparation checklist?'}
            </h4>
            <p style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}>
              {consistencyIssues.length > 0
                ? 'Unresolved items still appear in this assessment. You may open the checklist, but do not treat the pathway as final until those items are closed.'
                : 'Open the pathway-specific preparation checklist.'}
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
