import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import {
  GuidanceRef,
  HelpTextWithLinks,
  ConfBadge,
  AuthorityTag,
  GlossaryPanel,
} from './ui';
import { Pathway } from '../lib/assessment-engine';
import type { Answers, Block, Question } from '../lib/assessment-engine';
import {
  docRequirements,
  findGuidanceLink,
  getSourceBadge,
  questionReasoningLibrary,
} from '../lib/content';
import { changeTaxonomy } from '../lib/assessment-engine';
import { computeEvidenceGaps, type EvidenceGap } from '../lib/evidence-gaps';
import type { ReviewerNote } from '../lib/assessment-store';
import {
  buildEvidenceGapInsightItems,
  buildExpertReviewItems,
} from '../lib/review-insights';
import { classifySource } from '../lib/source-classification';
import { buildCaseSpecificReasoning } from '../lib/case-specific-reasoning';

interface ReviewPanelProps {
  pathway: string;
  determination: any;
  answers: Answers;
  blocks: Block[];
  getQuestionsForBlock: (blockId: string) => Question[];
  onEditBlock: (blockIndex: number) => void;
  onFeedback?: () => void;
  onHandoff?: () => void;
  reviewerNotes?: ReviewerNote[];
  onAddNote?: (author: string, text: string) => void;
  onRemoveNote?: (noteId: string) => void;
}

// Map pathway names to docRequirements keys
const pathwayToDocKey: Record<string, string> = {
  [Pathway.LetterToFile]: "Letter to File",
  [Pathway.ImplementPCCP]: "Implement Under Authorized PCCP",
  [Pathway.NewSubmission]: "New Submission Required",
  [Pathway.PMASupplementRequired]: "PMA Supplement Required",
  [Pathway.PMAAnnualReport]: "PMA Annual Report / Letter to File",
  [Pathway.AssessmentIncomplete]: "Assessment Incomplete",
};

// Source class to AuthorityTag level mapping
const sourceClassToLevel: Record<string, string> = {
  'Statute': 'statute',
  'Regulation': 'regulation',
  'Final guidance': 'final_guidance',
  'Draft guidance': 'draft_guidance',
  'Standard': 'standard',
  'Internal conservative policy': 'internal_policy',
  'Best practice': 'best_practice',
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

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  pathway,
  determination,
  answers,
  blocks,
  getQuestionsForBlock,
  onEditBlock,
  onFeedback,
  onHandoff,
  reviewerNotes,
  onAddNote,
  onRemoveNote,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['reasoning'])
  );
  const [noteAuthor, setNoteAuthor] = useState('');
  const [noteText, setNoteText] = useState('');

  const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSections(newSet);
  };

  // Evidence gaps
  const evidenceGaps = useMemo(() => computeEvidenceGaps(answers, determination), [answers, determination]);
  const criticalGaps = evidenceGaps.filter(g => g.severity === 'critical');
  const expertReviewItems = useMemo(
    () => buildExpertReviewItems(answers, determination),
    [answers, determination],
  );
  const evidenceGapItems = useMemo(
    () => buildEvidenceGapInsightItems(answers, determination, evidenceGaps),
    [answers, determination, evidenceGaps],
  );

  // Get documentation requirements for this pathway
  const docKey = pathwayToDocKey[pathway];
  const docs = docKey ? docRequirements[docKey] : null;
  const caseReasoning = useMemo(
    () => buildCaseSpecificReasoning(answers, determination, blocks, getQuestionsForBlock),
    [answers, determination, blocks, getQuestionsForBlock],
  );

  // Pathway styling
  const getPathwayConfig = () => {
    const hasIssues = determination.consistencyIssues?.length > 0;
    const hasUncertainty = determination.hasUncertainSignificance || determination.seUncertain || determination.cumulativeDriftUnresolved;
    // Confidence drops for consistency issues OR unresolved uncertainty driving the determination
    const baseConfidence = (hasIssues || hasUncertainty) ? 'MODERATE' as const : 'HIGH' as const;
    switch (pathway) {
      case Pathway.LetterToFile:
      case Pathway.PMAAnnualReport:
        return {
          bg: hasIssues ? '#fffbeb' : '#f0fdf4',
          border: hasIssues ? '#fde68a' : '#bbf7d0',
          accent: hasIssues ? '#d97706' : '#16a34a',
          icon: hasIssues ? 'alertCircle' : 'checkCircle',
          statusLabel: hasIssues ? 'Documentation Only — Preliminary (Review Required)' : 'Documentation Only',
          confidence: baseConfidence,
        };
      case Pathway.ImplementPCCP:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          accent: '#2563eb',
          icon: 'checkCircle',
          statusLabel: 'PCCP Implementation',
          confidence: baseConfidence,
        };
      case Pathway.NewSubmission:
      case Pathway.PMASupplementRequired:
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          accent: '#dc2626',
          icon: 'alert',
          statusLabel: hasUncertainty ? 'Submission Required (Uncertainty-Driven — Internal Conservative Policy)' : 'Submission Required',
          confidence: baseConfidence,
        };
      case Pathway.AssessmentIncomplete:
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          accent: '#d97706',
          icon: 'alertCircle',
          statusLabel: 'Assessment Incomplete — More Input Required',
          confidence: 'LOW' as const,
        };
      default:
        return {
          bg: '#f9fafb',
          border: '#e5e7eb',
          accent: '#6b7280',
          icon: 'info',
          statusLabel: 'Unknown',
          confidence: 'LOW' as const,
        };
    }
  };

  const config = getPathwayConfig();
  const { consistencyIssues = [], pccpRecommendation } = determination;
  const isIncomplete = determination.isIncomplete;

  // PCCP recommendation logic
  const hasPCCP = answers.A2 === 'Yes';
  const isNewSub = determination.isNewSub;
  const selectedChangeType = (answers.B1 && answers.B2)
    ? changeTaxonomy[answers.B1 as string]?.types?.find((t: any) => t.name === answers.B2)
    : null;
  const pccpEligibility = selectedChangeType?.pccp;
  const showPCCPRecommendation = pccpRecommendation?.shouldRecommend && !hasPCCP && isNewSub
    && pccpEligibility && ['TYPICAL', 'CONDITIONAL'].includes(pccpEligibility);

  // Hard gating: determine if assessment has critical unknowns that should block doc-only conclusion
  const hasCriticalGaps = criticalGaps.length > 0;
  const isDocOnlyWithCriticalGaps = determination.isDocOnly && hasCriticalGaps;
  const pccpHeroSummary = showPCCPRecommendation ? {
    heading: pccpEligibility === 'TYPICAL'
      ? 'PCCP application recommended in the upcoming submission'
      : 'PCCP application may be worth requesting in the upcoming submission',
    likelihood: pccpEligibility === 'TYPICAL' ? 'Likely fit' : 'Conditional fit',
    summary: pccpEligibility === 'TYPICAL'
      ? `${(answers.B2 as string) || 'This change type'} is generally suitable for future PCCP authorization. Because this case already routes to a new submission and no PCCP is currently authorized, this submission is the right time to seek pre-authorization for similar future changes within explicit bounds.`
      : `${(answers.B2 as string) || 'This change type'} can sometimes be authorized in a PCCP, but only when future modifications can be tightly bounded and prospectively validated. Because this case already routes to a new submission and no PCCP is currently authorized, this submission is the right opportunity to evaluate that option.`,
    detail: selectedChangeType?.pccpNote || null,
  } : null;

  // Collapsible section component
  const CollapsibleSection = ({
    id,
    title,
    children,
    badge,
    defaultOpen = false,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
    badge?: React.ReactNode;
    defaultOpen?: boolean;
  }) => {
    const isExpanded = expandedSections.has(id);
    return (
      <div style={{
        borderBottom: '1px solid #e5e7eb',
      }}>
        <button
          onClick={() => toggleSection(id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '16px 0',
            background: 'transparent',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {title}
          </span>
          {badge}
          <Icon
            name={isExpanded ? 'arrowUp' : 'arrowDown'}
            size={14}
            color="#9ca3af"
          />
        </button>
        {isExpanded && (
          <div style={{ paddingBottom: 24 }} className="animate-fade-in">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Get primary next action
  const getPrimaryAction = () => {
    if (pathway === Pathway.LetterToFile || pathway === Pathway.PMAAnnualReport) {
      return "Document rationale and file in device history record";
    }
    if (pathway === Pathway.ImplementPCCP) {
      return "Execute PCCP validation protocol before implementation";
    }
    if (pathway === Pathway.NewSubmission) {
      return "Prepare 510(k) or De Novo submission with updated device description";
    }
    if (pathway === Pathway.PMASupplementRequired) {
      return "Determine supplement type and prepare submission package";
    }
    // Assessment Incomplete — provide specific guidance based on reason
    if (determination.isIntendedUseUncertain) {
      return "Resolve intended use uncertainty through senior RA/clinical expert review or an FDA Pre-Submission (Q-Sub) before re-running this assessment";
    }
    if (determination.pmaIncomplete) {
      return "Complete the PMA safety/effectiveness, labeling, and manufacturing questions before the determination can be finalized";
    }
    if (determination.pccpIncomplete) {
      return "Complete the PCCP scope verification questions (P1–P5) to determine whether this change can be implemented under the authorized PCCP";
    }
    if (determination.hasUncertainSignificance) {
      return "Resolve uncertain significance answers — gather additional evidence or consult with RA/clinical experts to convert 'Uncertain' responses to 'Yes' or 'No'";
    }
    if (determination.seUncertain) {
      return "Resolve substantial equivalence uncertainty — compare the modified device against the predicate and consult RA if needed";
    }
    return "Complete remaining assessment questions to finalize the determination — review the consistency issues below for specific guidance";
  };

  return (
    <div className="animate-fade-in-up">
      {/* ============================================
          HARD GATE: INCOMPLETE ASSESSMENT BANNER
          ============================================ */}
      {isIncomplete && (
        <div style={{
          padding: '20px 24px',
          borderRadius: 8,
          background: '#7c2d12',
          color: '#fff',
          marginBottom: 24,
          border: '2px solid #9a3412',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}>
            <Icon name="alertCircle" size={20} color="#fbbf24" />
            <span style={{
              fontSize: 15,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Assessment Incomplete — Expert Review Required
            </span>
          </div>
          <p style={{
            fontSize: 13,
            lineHeight: 1.7,
            margin: 0,
            opacity: 0.95,
          }}>
            This assessment cannot produce a reliable regulatory pathway recommendation.
            One or more critical questions remain unresolved. <strong>Do not treat this output as a
            final regulatory conclusion.</strong> Resolve the unresolved questions below, then
            re-run the assessment before relying on the result for any regulatory decision.
          </p>
        </div>
      )}

      {/* Hard gate: doc-only pathway with critical evidence gaps */}
      {isDocOnlyWithCriticalGaps && !isIncomplete && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 8,
          background: '#fffbeb',
          border: '2px solid #f59e0b',
          marginBottom: 24,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <Icon name="alert" size={16} color="#d97706" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
              Preliminary Assessment — Critical Evidence Gaps Remain
            </span>
          </div>
          <p style={{
            fontSize: 13,
            color: '#78350f',
            lineHeight: 1.6,
            margin: 0,
          }}>
            This assessment routes to documentation-only, but {criticalGaps.length} critical evidence
            gap{criticalGaps.length > 1 ? 's' : ''} must be resolved before this conclusion can be
            relied upon. Review the Evidence Gaps section below.
          </p>
        </div>
      )}

      {/* ============================================
          SECTION 1: HERO / TOP SUMMARY BAND
          ============================================ */}
      <div style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 8,
        padding: '28px 32px',
        marginBottom: 24,
      }}>
        {/* Status row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: config.accent,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {config.statusLabel}
          </span>
          <span title={
            config.confidence === 'HIGH'
              ? 'No internal consistency issues detected. All pathway-critical questions were answered without contradictions. This reflects internal consistency only; expert review is still required before treating this as a regulatory conclusion.'
              : config.confidence === 'MODERATE'
                ? 'PRELIMINARY — consistency issues or unresolved uncertainty detected. Do not treat this as a final regulatory determination. Review and resolve the flagged items below before using this assessment.'
                : 'ASSESSMENT INCOMPLETE — one or more critical questions remain unresolved. This output should not be used for regulatory decision-making. Expert review is required.'
          }>
            <ConfBadge level={config.confidence} />
          </span>
          {/* Preliminary label when there are evidence gaps on non-incomplete */}
          {!isIncomplete && hasCriticalGaps && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 4,
              background: '#fef3c7',
              color: '#92400e',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              PRELIMINARY
            </span>
          )}
        </div>

        {/* Primary determination */}
        <h1 style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#111827',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}>
          {isIncomplete ? 'Assessment Incomplete — Expert Review Required' : pathway}
        </h1>

        <p style={{
          fontSize: 13,
          color: '#6b7280',
          margin: '0 0 16px',
          lineHeight: 1.65,
          maxWidth: 900,
        }}>
          {isIncomplete
            ? 'Critical questions remain unresolved, so this output should not be used for regulatory decision-making.'
            : 'This summary captures the current route, the immediate next step, and any strategic follow-up to consider before preparing the next package.'}
        </p>

        {/* Primary next action */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 6,
          marginBottom: 20,
        }}>
          <Icon name="arrow" size={14} color={config.accent} style={{ marginTop: 2 }} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Next Step
            </span>
            <p style={{ fontSize: 13, color: '#111827', margin: '4px 0 0', fontWeight: 500 }}>
              {getPrimaryAction()}
            </p>
          </div>
        </div>

        {pccpHeroSummary && (
          <div
            data-testid="pccp-recommendation"
            style={{
              padding: '16px 18px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#1d4ed8',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                PCCP submission strategy
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 999,
                background: pccpEligibility === 'TYPICAL' ? '#dbeafe' : '#fef3c7',
                color: pccpEligibility === 'TYPICAL' ? '#1d4ed8' : '#92400e',
                border: `1px solid ${pccpEligibility === 'TYPICAL' ? '#93c5fd' : '#fde68a'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {pccpHeroSummary.likelihood}
              </span>
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 8,
              lineHeight: 1.35,
            }}>
              {pccpHeroSummary.heading}
            </div>
            <p style={{
              fontSize: 13,
              color: '#475569',
              lineHeight: 1.65,
              margin: 0,
            }}>
              {pccpHeroSummary.summary}
            </p>
            {pccpHeroSummary.detail && (
              <p style={{
                fontSize: 12.5,
                color: '#1e40af',
                lineHeight: 1.6,
                margin: '10px 0 0',
                paddingTop: 10,
                borderTop: '1px solid #dbeafe',
              }}>
                <strong>What must be true:</strong> {pccpHeroSummary.detail}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
      </div>

      {/* ============================================
          CONSISTENCY ISSUES (if any)
          ============================================ */}
      {expertReviewItems.length > 0 && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 6,
          background: '#fffbeb',
          border: '1px solid #fde68a',
          marginBottom: 24,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}>
            <Icon name="alert" size={16} color="#d97706" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
              Expert Review Required Before Reliance ({expertReviewItems.length})
            </span>
          </div>
          <p style={{
            fontSize: 12,
            color: '#78350f',
            margin: '0 0 12px',
            lineHeight: 1.55,
          }}>
            Each item below identifies a specific contradiction, unresolved judgment, or threshold decision that still needs expert resolution for this case.
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {expertReviewItems.map((item) => (
              <div key={item.id} style={{
                padding: '12px 14px',
                borderRadius: 6,
                background: '#fffcf2',
                border: '1px solid #fde7a7',
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#7c2d12',
                  lineHeight: 1.45,
                  marginBottom: 4,
                }}>
                  <HelpTextWithLinks text={item.title} />
                </div>
                <div style={{
                  fontSize: 11,
                  color: '#a16207',
                  marginBottom: 8,
                  lineHeight: 1.45,
                }}>
                  {item.meta}
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: '#78350f',
                  lineHeight: 1.6,
                  marginBottom: 8,
                }}>
                  <strong>Why this matters here:</strong> <HelpTextWithLinks text={item.whyThisMatters} />
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: '#78350f',
                  lineHeight: 1.6,
                }}>
                  <strong>{item.actionLabel}:</strong> <HelpTextWithLinks text={item.actionText} />
                </div>
                {item.sourceRefs.length > 0 && (
                  <div style={{
                    fontSize: 12,
                    color: '#6b7280',
                    lineHeight: 1.5,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #f3e8c1',
                  }}>
                    <strong>Basis:</strong>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      marginTop: 4,
                    }}>
                      {item.sourceRefs.map((ref) => (
                        <div key={`${item.id}-${ref}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#9ca3af', lineHeight: 1.4 }}>•</span>
                          <EvidenceGapSourceRef code={ref} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================
          EVIDENCE GAPS CHECKLIST
          ============================================ */}
      {evidenceGapItems.length > 0 && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 6,
          background: criticalGaps.length > 0 ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${criticalGaps.length > 0 ? '#fecaca' : '#fde68a'}`,
          marginBottom: 24,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}>
            <Icon name="alertCircle" size={16} color={criticalGaps.length > 0 ? '#dc2626' : '#d97706'} />
            <span style={{ fontSize: 13, fontWeight: 600, color: criticalGaps.length > 0 ? '#991b1b' : '#92400e' }}>
              Evidence Needed Before Reliance ({evidenceGapItems.length})
              {criticalGaps.length > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: '#fecaca',
                  color: '#dc2626',
                  marginLeft: 8,
                }}>
                  {criticalGaps.length} CRITICAL
                </span>
              )}
            </span>
          </div>
          <p style={{
            fontSize: 12,
            color: '#6b7280',
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}>
            These items identify missing analyses or documents for this specific case. The assessment can be reviewed now, but it should not be relied upon until the listed evidence is added.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {evidenceGapItems.map((item) => (
              <div key={item.id} style={{
                padding: '10px 12px',
                background: item.severity === 'critical' ? '#fff5f5' : '#fffdf5',
                borderRadius: 4,
                border: `1px solid ${item.severity === 'critical' ? '#fed7d7' : '#fef3c7'}`,
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#111827',
                  lineHeight: 1.45,
                  marginBottom: 4,
                }}>
                  <HelpTextWithLinks text={item.title} />
                </div>
                <div style={{
                  fontSize: 11,
                  color: '#9a3412',
                  lineHeight: 1.45,
                  marginBottom: 8,
                }}>
                  {item.meta}
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: '#4b5563',
                  lineHeight: 1.6,
                  marginBottom: 8,
                }}>
                  <strong>Why this matters here:</strong> <HelpTextWithLinks text={item.whyThisMatters} />
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: '#6b7280',
                  lineHeight: 1.6,
                }}>
                  <strong>{item.actionLabel}:</strong> <HelpTextWithLinks text={item.actionText} />
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 1.5,
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px solid #f3f4f6',
                }}>
                  <strong>Source documents:</strong>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    marginTop: 4,
                  }}>
                    {item.sourceRefs.map((ref) => (
                        <div key={`${item.id}-${ref}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#9ca3af', lineHeight: 1.4 }}>•</span>
                          <EvidenceGapSourceRef code={ref} />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================
          SECTION 2: MAIN CONTENT AREA
          ============================================ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '0 28px',
        marginBottom: 24,
      }}>

        {/* Regulatory Reasoning */}
        {caseReasoning && (
          <CollapsibleSection id="reasoning" title="Regulatory Reasoning">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {caseReasoning.narrative.map((paragraph, index) => (
                <div
                  key={`reasoning-paragraph-${index}`}
                  style={{
                    fontSize: 14,
                    color: '#374151',
                    lineHeight: 1.7,
                  }}
                >
                  <HelpTextWithLinks text={paragraph} />
                </div>
              ))}
            </div>

            {caseReasoning.decisionPath.length > 0 && (
              <div style={{
                marginTop: 16,
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 10,
                }}>
                  Case-Specific Decision Path
                </div>
                <ol style={{
                  margin: 0,
                  paddingLeft: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  {caseReasoning.decisionPath.map((step, index) => (
                    <li
                      key={`decision-step-${index}`}
                      style={{
                        fontSize: 13,
                        color: '#334155',
                        lineHeight: 1.6,
                      }}
                    >
                      <HelpTextWithLinks text={step} />
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {(caseReasoning.verificationSteps.length > 0 || caseReasoning.counterConsiderations.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                {caseReasoning.verificationSteps.length > 0 && (
                  <details style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}>
                    <summary style={{
                      padding: '10px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <Icon name="checkCircle" size={14} color="#16a34a" />
                      {caseReasoning.verificationTitle || 'Case-Specific Verification Focus'}
                    </summary>
                    <div style={{
                      padding: '12px 14px',
                      borderTop: '1px solid #e5e7eb',
                    }}>
                      <ul style={{
                        margin: 0,
                        paddingLeft: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}>
                        {caseReasoning.verificationSteps.map((step, index) => (
                          <li
                            key={`verification-step-${index}`}
                            style={{
                              fontSize: 13,
                              color: '#6b7280',
                              lineHeight: 1.6,
                            }}
                          >
                            <HelpTextWithLinks text={step} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )}
                {caseReasoning.counterConsiderations.length > 0 && (
                  <details style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}>
                    <summary style={{
                      padding: '10px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <Icon name="alert" size={14} color="#d97706" />
                      {caseReasoning.counterTitle || 'What Could Still Change This Conclusion'}
                    </summary>
                    <div style={{
                      padding: '12px 14px',
                      borderTop: '1px solid #e5e7eb',
                    }}>
                      <ul style={{
                        margin: 0,
                        paddingLeft: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}>
                        {caseReasoning.counterConsiderations.map((item, index) => (
                          <li
                            key={`counter-item-${index}`}
                            style={{
                              fontSize: 13,
                              color: '#6b7280',
                              lineHeight: 1.6,
                            }}
                          >
                            <HelpTextWithLinks text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )}
              </div>
            )}

            {caseReasoning.sources.length > 0 && (
              <div style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid #f3f4f6',
              }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Authorities relied on</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {caseReasoning.sources.map((source) => (
                    <div key={`reasoning-source-${source}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: '#9ca3af', lineHeight: 1.4 }}>•</span>
                      <EvidenceGapSourceRef code={source} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Documentation Requirements */}
        {docs && (
          <CollapsibleSection
            id="documentation"
            title="Documentation Requirements"
            badge={
              docs.required?.length ? (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#fef2f2',
                  color: '#dc2626',
                }}>
                  {docs.required.length} Required
                </span>
              ) : undefined
            }
          >
            {docs.required && docs.required.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 10 }}>
                  Required Documentation
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {docs.required.map((item: { doc: string; source: string }, i: number) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 12px',
                      background: '#fef2f2',
                      borderRadius: 4,
                    }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: '1.5px solid #fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.4 }}>{item.doc}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <GuidanceRef code={item.source} showSection={false} />
                          <AuthorityTag level={sourceClassToLevel[classifySourceInline(item.source)] || 'final_guidance'} compact />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docs.recommended && docs.recommended.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginBottom: 10 }}>
                  Recommended
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {docs.recommended.map((item: { doc: string; source: string }, i: number) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 12px',
                      background: '#eff6ff',
                      borderRadius: 4,
                    }}>
                      <Icon name="check" size={14} color="#3b82f6" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.4 }}>{item.doc}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AuthorityTag level={sourceClassToLevel[classifySourceInline(item.source)] || 'draft_guidance'} compact />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docs.orgSpecific && docs.orgSpecific.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>
                  Organization-Specific
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {docs.orgSpecific.map((item: { doc: string; source: string }, i: number) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 12px',
                      background: '#f9fafb',
                      borderRadius: 4,
                    }}>
                      <Icon name="info" size={14} color="#9ca3af" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>{item.doc}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                          <AuthorityTag level="internal_policy" compact />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docs.scopeNote && (
              <div style={{
                marginTop: 16,
                padding: '10px 12px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 4,
                fontSize: 12,
                color: '#92400e',
                lineHeight: 1.5,
              }}>
                <strong>Note: </strong>
                <HelpTextWithLinks text={docs.scopeNote} />
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Glossary */}
        <CollapsibleSection id="glossary" title="Regulatory Glossary">
          <GlossaryPanel />
        </CollapsibleSection>
      </div>

      {/* ============================================
          SECTION 4: DETAILED RESPONSES (COLLAPSED)
          ============================================ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '0 28px',
        marginBottom: 24,
      }}>
        <div style={{
          padding: '16px 0',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Response Details
          </span>
        </div>

        {blocks.filter(b => b.id !== 'review').map((block, blockIndex) => {
          const questions = getQuestionsForBlock(block.id);
          const answeredQuestions = questions.filter(q =>
            !q.sectionDivider && !q.skip && answers[q.id] !== undefined && answers[q.id] !== ''
          );

          if (answeredQuestions.length === 0) return null;

          return (
            <CollapsibleSection
              key={block.id}
              id={`block-${block.id}`}
              title={block.shortLabel}
              badge={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditBlock(blockIndex);
                  }}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: '#f3f4f6',
                    color: '#4b5563',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {answeredQuestions.map((q) => {
                  const qReasoning = questionReasoningLibrary[q.id];
                  return (
                    <div key={q.id} style={{
                      display: 'flex',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid #f3f4f6',
                    }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        color: '#9ca3af',
                        padding: '2px 6px',
                        background: '#f9fafb',
                        borderRadius: 4,
                        height: 'fit-content',
                      }}>
                        {q.id}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 13,
                          color: '#6b7280',
                          lineHeight: 1.5,
                          marginBottom: 4,
                        }}>
                          {q.q}
                        </div>
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#111827',
                        }}>
                          {Array.isArray(answers[q.id])
                            ? answers[q.id].join(', ')
                            : String(answers[q.id])}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          );
        })}
      </div>

      {/* ============================================
          REVIEW/SHARE WORKFLOW
          ============================================ */}
      {onAddNote && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '20px 28px',
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 16,
          }}>
            Reviewer Notes
          </div>

          {/* Reviewer notes */}
          {onAddNote && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                Reviewer Notes
              </div>
              {reviewerNotes && reviewerNotes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {reviewerNotes.map(note => (
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
                  onChange={e => setNoteAuthor(e.target.value)}
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
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a review note..."
                  onKeyDown={e => {
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
        </div>
      )}

      {/* Preparation Checklist CTA */}
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
                ? 'Preliminary — resolve flagged issues before relying on this determination'
                : 'Ready to prepare documentation?'}
            </h4>
            <p style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}>
              {consistencyIssues.length > 0
                ? 'This assessment has unresolved items that require expert review. The preparation checklist is available but should not be treated as a final regulatory conclusion.'
                : 'Open the preparation checklist for the determined pathway.'}
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

      {/* Feedback CTA */}
      {onFeedback && (
        <div
          data-testid="feedback-cta"
          style={{
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-info-bg)',
            border: '1px solid var(--color-info-border)',
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
              How did this assessment work for you?
            </h4>
            <p style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}>
              Share a quick survey to help us improve — takes about 2 minutes.
            </p>
          </div>
          <button
            onClick={onFeedback}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
            }}
          >
            Share Feedback
            <Icon name="arrow" size={16} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
};

const classifySourceInline = classifySource;
