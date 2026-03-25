import React, { useState } from 'react';
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

interface ReviewPanelProps {
  pathway: string;
  determination: any;
  answers: Answers;
  blocks: Block[];
  getQuestionsForBlock: (blockId: string) => Question[];
  onEditBlock: (blockIndex: number) => void;
  onFeedback?: () => void;
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
  if (determination.deNovoDeviceTypeFitFailed) return "DENOVO-FIT-FAILED";
  if (determination.isCyberOnly) return "SCREEN-02-Yes";
  if (determination.isBugFix) return "SCREEN-03-Yes";
  if (determination.pccpScopeVerified) return "PCCP-Verified";
  if (determination.pccpScopeFailed) return "PCCP-Failed";
  if (determination.isSignificant) return "RISK-01-Yes";
  if (determination.pathway === Pathway.PMASupplementRequired) return "PMA-Supplement";
  if (determination.pathway === Pathway.PMAAnnualReport) return "PMA-AnnualReport";
  if (determination.pathway === Pathway.LetterToFile) return "LTF-NonSignificant";
  return null;
};

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  pathway,
  determination,
  answers,
  blocks,
  getQuestionsForBlock,
  onEditBlock,
  onFeedback,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['reasoning'])
  );

  const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSections(newSet);
  };

  // Get documentation requirements for this pathway
  const docKey = pathwayToDocKey[pathway];
  const docs = docKey ? docRequirements[docKey] : null;

  // Get rule reasoning for the determination
  const ruleKey = getRuleKey(determination);
  const ruleReasoning = ruleKey ? ruleReasoningLibrary[ruleKey] : null;

  // Pathway styling
  const getPathwayConfig = () => {
    switch (pathway) {
      case Pathway.LetterToFile:
      case Pathway.PMAAnnualReport:
        return {
          bg: '#f0fdf4',
          border: '#bbf7d0',
          accent: '#16a34a',
          icon: 'checkCircle',
          statusLabel: 'Documentation Only',
          confidence: determination.consistencyIssues?.length > 0 ? 'MODERATE' as const : 'HIGH' as const,
        };
      case Pathway.ImplementPCCP:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          accent: '#2563eb',
          icon: 'checkCircle',
          statusLabel: 'PCCP Implementation',
          confidence: determination.consistencyIssues?.length > 0 ? 'MODERATE' as const : 'HIGH' as const,
        };
      case Pathway.NewSubmission:
      case Pathway.PMASupplementRequired:
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          accent: '#dc2626',
          icon: 'alert',
          statusLabel: 'Submission Required',
          confidence: determination.consistencyIssues?.length > 0 ? 'MODERATE' as const : 'HIGH' as const,
        };
      case Pathway.AssessmentIncomplete:
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          accent: '#d97706',
          icon: 'alertCircle',
          statusLabel: 'Incomplete',
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

  // PCCP recommendation logic
  const hasPCCP = answers.A2 === 'Yes';
  const isNewSub = determination.isNewSub;
  const selectedChangeType = (answers.B1 && answers.B2)
    ? changeTaxonomy[answers.B1 as string]?.types?.find((t: any) => t.name === answers.B2)
    : null;
  const pccpEligibility = selectedChangeType?.pccp;
  const showPCCPRecommendation = pccpRecommendation?.shouldRecommend && !hasPCCP && isNewSub
    && pccpEligibility && ['YES', 'CONDITIONAL'].includes(pccpEligibility);

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
              ? 'No internal consistency issues detected. All pathway-critical questions answered without contradictions. This reflects internal consistency only — expert review is still required.'
              : config.confidence === 'MODERATE'
                ? 'Internal consistency issues detected — review the flagged items below before relying on this determination.'
                : 'Assessment is incomplete — one or more critical questions remain unresolved.'
          }>
            <ConfBadge level={config.confidence} />
          </span>
        </div>

        {/* Primary determination */}
        <h1 style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#111827',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}>
          {pathway}
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                      <div>
                        <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.4 }}>{item.doc}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                          <GuidanceRef code={item.source} showSection={false} />
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
                      <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.4 }}>{item.doc}</div>
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
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>{item.doc}</div>
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
                is {pccpEligibility === 'YES' ? 'eligible' : 'conditionally eligible'} for
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
