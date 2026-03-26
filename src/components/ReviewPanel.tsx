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
  ruleReasoningLibrary,
  questionReasoningLibrary,
} from '../lib/content';
import { changeTaxonomy } from '../lib/assessment-engine';
import { computeEvidenceGaps, type EvidenceGap } from '../lib/evidence-gaps';
import { generateAssessmentArtifact, formatArtifactAsText } from '../lib/report-generator';
import type { AssessmentStatus, ReviewerNote } from '../lib/assessment-store';

interface ReviewPanelProps {
  pathway: string;
  determination: any;
  answers: Answers;
  blocks: Block[];
  getQuestionsForBlock: (blockId: string) => Question[];
  onEditBlock: (blockIndex: number) => void;
  onFeedback?: () => void;
  onHandoff?: () => void;
  onSave?: () => void;
  assessmentName?: string;
  assessmentStatus?: AssessmentStatus;
  onStatusChange?: (status: AssessmentStatus) => void;
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

// Map determination rules to reasoning library keys
const getRuleKey = (determination: any): string | null => {
  if (determination.isIntendedUseChange) return "SCREEN-01-Yes";
  if (determination.isIntendedUseUncertain) return "SCREEN-01-Uncertain";
  // PMA-specific rules — check before 510(k) framework rules
  if (determination.pathway === Pathway.PMASupplementRequired) return "PMA-Supplement";
  if (determination.pathway === Pathway.PMAAnnualReport) return "PMA-AnnualReport";
  // 510(k)/De Novo framework rules
  if (determination.deNovoDeviceTypeFitFailed) return "DENOVO-FIT-FAILED";
  if (determination.isCyberOnly) return "SCREEN-02-Yes";
  if (determination.isBugFix) return "SCREEN-03-Yes";
  // PCCP — applicable to both PMA and 510(k)/De Novo
  if (determination.pccpScopeVerified) return "PCCP-Verified";
  if (determination.pccpScopeFailed) return "PCCP-Failed";
  if (determination.isSignificant) return "RISK-01-Yes";
  if (determination.pathway === Pathway.LetterToFile) return "LTF-NonSignificant";
  return null;
};

// Source class to AuthorityTag level mapping
const sourceClassToLevel: Record<string, string> = {
  'Regulation': 'regulation',
  'Final guidance': 'final_guidance',
  'Draft guidance': 'draft_guidance',
  'Internal conservative policy': 'internal_policy',
  'Best practice': 'best_practice',
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
  onSave,
  assessmentName,
  assessmentStatus,
  onStatusChange,
  reviewerNotes,
  onAddNote,
  onRemoveNote,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['reasoning'])
  );
  const [noteAuthor, setNoteAuthor] = useState('');
  const [noteText, setNoteText] = useState('');
  const [exportNotice, setExportNotice] = useState('');

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
  const importantGaps = evidenceGaps.filter(g => g.severity === 'important');

  // Get documentation requirements for this pathway
  const docKey = pathwayToDocKey[pathway];
  const docs = docKey ? docRequirements[docKey] : null;

  // Get rule reasoning for the determination
  const ruleKey = getRuleKey(determination);
  const ruleReasoning = ruleKey ? ruleReasoningLibrary[ruleKey] : null;

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
          statusLabel: 'Assessment Incomplete — Not Reliance-Ready',
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

  // Export handler
  const handleExportText = () => {
    const artifact = generateAssessmentArtifact(answers, determination, blocks, getQuestionsForBlock);
    const text = formatArtifactAsText(artifact, assessmentName);
    navigator.clipboard.writeText(text).then(() => {
      setExportNotice('Report copied to clipboard');
      setTimeout(() => setExportNotice(''), 3000);
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-report-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice('Report downloaded');
      setTimeout(() => setExportNotice(''), 3000);
    });
  };

  const handleExportJSON = () => {
    const artifact = generateAssessmentArtifact(answers, determination, blocks, getQuestionsForBlock);
    const json = JSON.stringify(artifact, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-artifact-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('JSON artifact downloaded');
    setTimeout(() => setExportNotice(''), 3000);
  };

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
              ? 'No internal consistency issues detected. All pathway-critical questions answered without contradictions. This reflects internal consistency only — expert review is still required before treating as a regulatory conclusion.'
              : config.confidence === 'MODERATE'
                ? 'PRELIMINARY — consistency issues or unresolved uncertainty detected. Do not treat this as a final regulatory determination. Review the flagged items below and resolve before relying on this assessment.'
                : 'ASSESSMENT INCOMPLETE — one or more critical questions remain unresolved. This output is not reliance-ready and does not constitute a regulatory conclusion. Expert review required.'
          }>
            <ConfBadge level={config.confidence} />
          </span>
          {/* Assessment status tag */}
          {assessmentStatus && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              background: assessmentStatus === 'Draft' ? '#f3f4f6'
                : assessmentStatus === 'In Review' ? '#dbeafe'
                : '#d1fae5',
              color: assessmentStatus === 'Draft' ? '#6b7280'
                : assessmentStatus === 'In Review' ? '#1d4ed8'
                : '#15803d',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {assessmentStatus}
            </span>
          )}
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

        {/* Regulatory basis */}
        {docs?.basis && (
          <p style={{
            fontSize: 13,
            color: '#6b7280',
            margin: '0 0 16px',
            lineHeight: 1.6,
          }}>
            <HelpTextWithLinks text={docs.basis} />
          </p>
        )}

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
            Print Report
          </button>
          <button
            onClick={handleExportText}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 6,
              background: '#fff',
              border: '1px solid #d1d5db',
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Icon name="fileText" size={14} color="#374151" />
            Export Report
          </button>
          <button
            onClick={handleExportJSON}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 6,
              background: '#fff',
              border: '1px solid #d1d5db',
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Icon name="settings" size={14} color="#374151" />
            Export JSON
          </button>
          {onSave && (
            <button
              onClick={onSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 6,
                background: '#fff',
                border: '1px solid #d1d5db',
                color: '#374151',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Icon name="check" size={14} color="#374151" />
              Save Assessment
            </button>
          )}
          {exportNotice && (
            <span style={{
              fontSize: 12,
              color: '#16a34a',
              fontWeight: 500,
              animation: 'fadeIn .15s ease',
            }}>
              {exportNotice}
            </span>
          )}
        </div>
      </div>

      {/* ============================================
          CONSISTENCY ISSUES (if any)
          ============================================ */}
      {consistencyIssues.length > 0 && (
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
            marginBottom: 10,
          }}>
            <Icon name="alert" size={16} color="#d97706" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
              Review Required ({consistencyIssues.length})
            </span>
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {consistencyIssues.map((issue: string, i: number) => (
              <li key={i} style={{
                fontSize: 13,
                color: '#78350f',
                lineHeight: 1.5,
              }}>
                <HelpTextWithLinks text={issue} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ============================================
          EVIDENCE GAPS CHECKLIST
          ============================================ */}
      {evidenceGaps.length > 0 && (
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
              Evidence Gaps ({evidenceGaps.length})
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
            The following gaps must be resolved before the assessment result can be relied upon for regulatory decisions.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {evidenceGaps.map((gap) => (
              <div key={gap.id} style={{
                padding: '10px 12px',
                background: gap.severity === 'critical' ? '#fff5f5' : '#fffdf5',
                borderRadius: 4,
                border: `1px solid ${gap.severity === 'critical' ? '#fed7d7' : '#fef3c7'}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: gap.severity === 'critical' ? '#fecaca' : gap.severity === 'important' ? '#fde68a' : '#e5e7eb',
                    color: gap.severity === 'critical' ? '#dc2626' : gap.severity === 'important' ? '#92400e' : '#6b7280',
                    textTransform: 'uppercase',
                  }}>
                    {gap.severity}
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#374151',
                  }}>
                    {gap.category}
                  </span>
                  <AuthorityTag level={sourceClassToLevel[gap.sourceClass] || 'best_practice'} compact />
                </div>
                <div style={{
                  fontSize: 13,
                  color: '#111827',
                  lineHeight: 1.5,
                  marginBottom: 4,
                }}>
                  {gap.description}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 1.5,
                }}>
                  <strong>Action:</strong> {gap.remediation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================
          SECTION 2: KEY FACTS STRIP
          ============================================ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        background: '#e5e7eb',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 32,
      }}>
        {[
          { label: 'Authorization', value: answers.A1 || 'Not specified' },
          { label: 'PCCP Status', value: answers.A2 === 'Yes' ? 'Authorized' : 'None' },
          { label: 'Intended Use Impact', value: answers.B3 || 'Not assessed' },
          { label: 'Change Category', value: answers.B1 || 'Not specified' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '14px 16px',
            background: '#ffffff',
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, letterSpacing: '0.02em' }}>
              {item.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ============================================
          SECTION 3: MAIN CONTENT AREA
          ============================================ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '0 28px',
        marginBottom: 24,
      }}>

        {/* Regulatory Reasoning */}
        {ruleReasoning && (
          <CollapsibleSection id="reasoning" title="Regulatory Reasoning">
            <div style={{
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.7,
              marginBottom: 16,
            }}>
              <HelpTextWithLinks text={ruleReasoning.text} />
            </div>

            {(ruleReasoning.verify || ruleReasoning.counter) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                {ruleReasoning.verify && (
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
                      Verification Steps
                    </summary>
                    <div style={{
                      padding: '12px 14px',
                      borderTop: '1px solid #e5e7eb',
                      fontSize: 13,
                      color: '#6b7280',
                      lineHeight: 1.6,
                    }}>
                      <HelpTextWithLinks text={ruleReasoning.verify} />
                    </div>
                  </details>
                )}
                {ruleReasoning.counter && (
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
                      Counter-Considerations
                    </summary>
                    <div style={{
                      padding: '12px 14px',
                      borderTop: '1px solid #e5e7eb',
                      fontSize: 13,
                      color: '#6b7280',
                      lineHeight: 1.6,
                    }}>
                      <HelpTextWithLinks text={ruleReasoning.counter} />
                    </div>
                  </details>
                )}
              </div>
            )}

            {ruleReasoning.source && (
              <div style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Source:</span>
                <GuidanceRef code={ruleReasoning.source} />
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

        {/* PCCP Recommendation */}
        {showPCCPRecommendation && (
          <CollapsibleSection id="pccp-rec" title="PCCP Opportunity">
            <div data-testid="pccp-recommendation" style={{
              padding: '14px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 6,
            }}>
              <p style={{
                fontSize: 13,
                color: '#166534',
                lineHeight: 1.6,
                margin: 0,
              }}>
                <strong>{(answers.B2 as string) || 'This change type'}</strong>{' '}
                is {pccpEligibility === 'TYPICAL' ? 'generally a suitable change type' : 'conditionally suitable'} for
                future PCCP coverage. Including a PCCP in the upcoming submission could enable future similar changes without additional submissions.
              </p>
              {pccpEligibility === 'CONDITIONAL' && selectedChangeType?.pccpNote && (
                <p style={{
                  fontSize: 12,
                  color: '#15803d',
                  lineHeight: 1.6,
                  margin: '8px 0 0',
                  paddingTop: 8,
                  borderTop: '1px solid #dcfce7',
                }}>
                  <strong>Conditions:</strong> {selectedChangeType.pccpNote}
                </p>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Determination Flags */}
        <CollapsibleSection id="flags" title="Determination Factors">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {determination.isIntendedUseChange && (
              <span style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 4,
                background: '#fef2f2',
                color: '#991b1b',
              }}>
                Intended Use Change
              </span>
            )}
            {determination.isSignificant && (
              <span style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 4,
                background: '#fffbeb',
                color: '#92400e',
              }}>
                Significant Change
              </span>
            )}
            {determination.pccpScopeVerified && (
              <span style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 4,
                background: '#f0fdf4',
                color: '#166534',
              }}>
                PCCP Verified
              </span>
            )}
            {determination.isCyberOnly && (
              <span style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 4,
                background: '#eff6ff',
                color: '#1e40af',
              }}>
                Cybersecurity Only
              </span>
            )}
            {determination.isBugFix && (
              <span style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 4,
                background: '#eff6ff',
                color: '#1e40af',
              }}>
                Bug Fix
              </span>
            )}
            {determination.genAIHighImpactChange && (
              <span style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 4,
                background: '#fffbeb',
                color: '#92400e',
              }}>
                GenAI High Impact
              </span>
            )}
            {!determination.isIntendedUseChange && !determination.isSignificant && !determination.pccpScopeVerified &&
             !determination.isCyberOnly && !determination.isBugFix && !determination.genAIHighImpactChange && (
              <span style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 4,
                background: '#f9fafb',
                color: '#6b7280',
              }}>
                No additional determination factors identified
              </span>
            )}
          </div>
        </CollapsibleSection>

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
      {(onStatusChange || onAddNote) && (
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
            Review Workflow
          </div>

          {/* Status selector */}
          {onStatusChange && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                Assessment Status
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Draft', 'In Review', 'Final Internal Memo'] as AssessmentStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => onStatusChange(status)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: assessmentStatus === status ? '2px solid' : '1px solid #d1d5db',
                      borderColor: assessmentStatus === status
                        ? (status === 'Draft' ? '#9ca3af' : status === 'In Review' ? '#3b82f6' : '#16a34a')
                        : '#d1d5db',
                      background: assessmentStatus === status
                        ? (status === 'Draft' ? '#f3f4f6' : status === 'In Review' ? '#dbeafe' : '#d1fae5')
                        : '#fff',
                      color: assessmentStatus === status
                        ? (status === 'Draft' ? '#374151' : status === 'In Review' ? '#1d4ed8' : '#15803d')
                        : '#6b7280',
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
              {/* Hard gate warning for Final status with critical gaps */}
              {assessmentStatus === 'Final Internal Memo' && (isIncomplete || hasCriticalGaps) && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 4,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontSize: 12,
                  color: '#991b1b',
                  lineHeight: 1.5,
                }}>
                  <strong>Warning:</strong> This assessment has {isIncomplete ? 'unresolved critical questions' : 'critical evidence gaps'}.
                  Marking as "Final Internal Memo" does not resolve these issues. All gaps and unresolved questions
                  should be addressed before this assessment is relied upon for regulatory decisions.
                </div>
              )}
            </div>
          )}

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

      {/* ============================================
          FOOTER DISCLAIMER
          ============================================ */}
      <div style={{
        padding: '14px 18px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
      }}>
        <p style={{
          fontSize: 12,
          color: '#6b7280',
          lineHeight: 1.6,
          margin: 0,
        }}>
          <strong style={{ color: '#374151' }}>Decision support only — not a regulatory determination.</strong>{' '}
          This tool supports internal change-control planning and submission strategy discussions.
          It does not replace expert regulatory judgment, legal advice, or formal submission decisions.
          All outputs require review by qualified regulatory and clinical professionals before action.
        </p>
        {isIncomplete && (
          <p style={{
            fontSize: 12,
            color: '#991b1b',
            lineHeight: 1.6,
            margin: '8px 0 0',
            fontWeight: 600,
          }}>
            This assessment is INCOMPLETE. Do not cite this output as a final regulatory conclusion.
          </p>
        )}
        {!isIncomplete && hasCriticalGaps && (
          <p style={{
            fontSize: 12,
            color: '#92400e',
            lineHeight: 1.6,
            margin: '8px 0 0',
            fontWeight: 500,
          }}>
            This assessment has unresolved evidence gaps. Treat as preliminary until gaps are addressed.
          </p>
        )}
        <p style={{
          fontSize: 11,
          color: '#9ca3af',
          lineHeight: 1.5,
          margin: '8px 0 0',
        }}>
          This tool is not itself a validated or cleared medical device. U.S.-primary assessment; non-U.S. markets covered by escalation cues only.
        </p>
        <p style={{
          fontSize: 11,
          fontFamily: 'monospace',
          color: '#9ca3af',
          margin: '6px 0 0',
        }}>
          v1 | Sources reviewed Mar 2026 | Primary: US (FDA) | Follow-up: EU, UK, CA, JP, CN
        </p>
      </div>

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
                : 'Open a step-by-step preparation workflow for the determined pathway.'}
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

/** Inline source classification for documentation items */
function classifySourceInline(source: string): string {
  if (/21 CFR|§\d|FD&C|Part \d{3}/.test(source)) return 'Regulation';
  if (/draft/i.test(source)) return 'Draft guidance';
  if (/Organization|Internal/i.test(source)) return 'Internal conservative policy';
  if (/FDA-|Guidance|guidance|QMSR|MDCG|IEC|ISO/.test(source)) return 'Final guidance';
  return 'Best practice';
}
