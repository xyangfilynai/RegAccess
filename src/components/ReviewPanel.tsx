import React, { useState } from 'react';
import { Icon } from './Icon';
import { 
  GuidanceRef, 
  HelpTextWithLinks, 
  ConfBadge, 
  AuthorityTag,
  Collapsible,
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
};

// Map determination rules to reasoning library keys
const getRuleKey = (determination: any): string | null => {
  if (determination.isIntendedUseChange) return "SCREEN-01-Yes";
  if (determination.isIntendedUseUncertain) return "SCREEN-01-Uncertain";
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
    new Set(['pathway', 'summary', 'documentation', 'reasoning', 'A', 'B', 'C', 'D', 'E', 'F'])
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
  const getPathwayStyle = () => {
    switch (pathway) {
      case Pathway.LetterToFile:
      case Pathway.PMAAnnualReport:
        return {
          bg: 'var(--color-success-bg)',
          border: 'var(--color-success-border)',
          color: 'var(--color-success)',
          icon: 'checkCircle',
          label: 'Documentation Only',
          confidence: 'HIGH' as const,
        };
      case Pathway.ImplementPCCP:
        return {
          bg: 'var(--color-info-bg)',
          border: 'var(--color-info-border)',
          color: 'var(--color-info)',
          icon: 'checkCircle',
          label: 'PCCP Implementation',
          confidence: 'HIGH' as const,
        };
      case Pathway.NewSubmission:
      case Pathway.PMASupplementRequired:
        return {
          bg: 'var(--color-danger-bg)',
          border: 'var(--color-danger-border)',
          color: 'var(--color-danger)',
          icon: 'alert',
          label: 'Submission Required',
          confidence: determination.consistencyIssues?.length > 0 ? 'MODERATE' as const : 'HIGH' as const,
        };
      case Pathway.AssessmentIncomplete:
        return {
          bg: 'var(--color-warning-bg)',
          border: 'var(--color-warning-border)',
          color: 'var(--color-warning)',
          icon: 'alertCircle',
          label: 'Incomplete',
          confidence: 'LOW' as const,
        };
      default:
        return {
          bg: 'var(--color-bg-hover)',
          border: 'var(--color-border)',
          color: 'var(--color-text-muted)',
          icon: 'info',
          label: 'Unknown',
          confidence: 'LOW' as const,
        };
    }
  };

  const pathwayStyle = getPathwayStyle();
  const { consistencyIssues = [], pccpRecommendation } = determination;

  // PCCP recommendation logic (matches original showPCCPRecommendation)
  const hasPCCP = answers.A2 === 'Yes';
  const isNewSub = determination.isNewSub;
  const selectedChangeType = (answers.B1 && answers.B2)
    ? changeTaxonomy[answers.B1 as string]?.types?.find((t: any) => t.name === answers.B2)
    : null;
  const pccpEligibility = selectedChangeType?.pccp;
  const showPCCPRecommendation = pccpRecommendation?.shouldRecommend && !hasPCCP && isNewSub
    && pccpEligibility && ['YES', 'CONDITIONAL'].includes(pccpEligibility);

  // Section component
  const Section = ({ 
    id, 
    title, 
    icon, 
    children, 
    badge,
    defaultOpen = true,
  }: { 
    id: string; 
    title: string; 
    icon: string; 
    children: React.ReactNode; 
    badge?: React.ReactNode;
    defaultOpen?: boolean;
  }) => {
    const isExpanded = expandedSections.has(id);
    return (
      <div style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        background: '#ffffff',
        overflow: 'hidden',
        marginBottom: 'var(--space-md)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}>
        <button
          onClick={() => toggleSection(id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            width: '100%',
            padding: 'var(--space-md) var(--space-lg)',
            background: isExpanded ? '#f8fafc' : 'transparent',
            borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'background var(--transition-fast)',
          }}
        >
          <Icon name={icon} size={18} color="var(--color-text-secondary)" />
          <span style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text)',
          }}>
            {title}
          </span>
          {badge}
          <Icon 
            name={isExpanded ? 'arrowUp' : 'arrowDown'} 
            size={16} 
            color="var(--color-text-muted)" 
          />
        </button>
        {isExpanded && (
          <div style={{ padding: 'var(--space-lg)' }} className="animate-fade-in">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Document list renderer
  const DocList = ({ items, type }: { items: Array<{ doc: string; source: string }>; type: 'required' | 'recommended' | 'orgSpecific' }) => {
    const colors = {
      required: { bg: 'var(--color-danger-bg)', border: 'var(--color-danger-border)', dot: 'var(--color-danger)' },
      recommended: { bg: 'var(--color-info-bg)', border: 'var(--color-info-border)', dot: 'var(--color-info)' },
      orgSpecific: { bg: 'var(--color-bg-hover)', border: 'var(--color-border)', dot: 'var(--color-text-muted)' },
    };
    const style = colors[type];

    return (
      <ul style={{ 
        margin: 0, 
        padding: 0, 
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
      }}>
        {items.map((item, i) => (
          <li key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: style.bg,
            border: `1px solid ${style.border}`,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: style.dot,
              flexShrink: 0,
              marginTop: 6,
            }} />
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5 }}>
                {item.doc}
              </div>
              <div style={{ 
                fontSize: 11, 
                color: 'var(--color-text-muted)', 
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                flexWrap: 'wrap',
              }}>
                <GuidanceRef code={item.source} showSection={false} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="animate-fade-in-up">
      {/* Pathway Result Card */}
      <div style={{
        padding: 'var(--space-xl)',
        borderRadius: 'var(--radius-xl)',
        background: pathwayStyle.bg,
        border: `2px solid ${pathwayStyle.border}`,
        marginBottom: 'var(--space-xl)',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: pathwayStyle.color,
          marginBottom: 'var(--space-md)',
        }}>
          <Icon name={pathwayStyle.icon} size={28} color="#fff" />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-xs)',
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: pathwayStyle.color,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {pathwayStyle.label}
          </span>
          <ConfBadge level={pathwayStyle.confidence} />
        </div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--color-text)',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {pathway}
        </h2>
        {docs?.basis && (
          <div style={{
            marginTop: 'var(--space-md)',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}>
            <AuthorityTag level="final_guidance" />
            <span style={{ marginLeft: 'var(--space-sm)' }}>
              <HelpTextWithLinks text={docs.basis} />
            </span>
          </div>
        )}
      </div>

      {/* Consistency Issues */}
      {consistencyIssues.length > 0 && (
        <div style={{
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
          marginBottom: 'var(--space-xl)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-md)',
          }}>
            <Icon name="alert" size={18} color="var(--color-warning)" />
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-warning)',
              margin: 0,
            }}>
              Consistency Review Required ({consistencyIssues.length})
            </h3>
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}>
            {consistencyIssues.map((issue: string, i: number) => (
              <li key={i} style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}>
                <HelpTextWithLinks text={issue} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PCCP Recommendation */}
      {showPCCPRecommendation && (
        <div data-testid="pccp-recommendation" style={{
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, #F0FAF5 0%, #FFFDF8 100%)',
          border: '1px solid #C6E7D4',
          marginBottom: 'var(--space-xl)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-sm)',
          }}>
            <Icon name="info" size={14} color="var(--color-success)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              PCCP Opportunity
            </span>
          </div>
          <p style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            margin: '0 0 var(--space-sm)',
          }}>
            <strong style={{ color: 'var(--color-text)' }}>
              {(answers.B2 as string) || 'This change type'}
            </strong>{' '}
            is {pccpEligibility === 'YES' ? 'eligible' : 'conditionally eligible'} for
            future PCCP coverage. This does not change today's route, but it could
            streamline future review cycles.
          </p>
          <p style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Consider establishing a PCCP in the next submission.
            See the Marketing Submission Recommendations for a PCCP for AI-Enabled
            Device Software Functions Guidance (Dec 2024, reissued Aug 2025), Sections V–VIII.
          </p>
        </div>
      )}

      {/* Regulatory Reasoning */}
      {ruleReasoning && (
        <Section id="reasoning" title="Regulatory Reasoning" icon="book" defaultOpen={true}>
          <div style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-hover)',
            border: '1px solid var(--color-border)',
            marginBottom: 'var(--space-md)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.7 }}>
              <HelpTextWithLinks text={ruleReasoning.text} />
            </div>
          </div>
          
          {ruleReasoning.verify && (
            <Collapsible 
              label="Verification Steps" 
              icon="checkCircle" 
              color="var(--color-success)"
              defaultOpen={false}
            >
              <div style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}>
                <HelpTextWithLinks text={ruleReasoning.verify} />
              </div>
            </Collapsible>
          )}
          
          {ruleReasoning.counter && (
            <Collapsible 
              label="Counter-Considerations" 
              icon="alert" 
              color="var(--color-warning)"
              defaultOpen={false}
            >
              <div style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}>
                <HelpTextWithLinks text={ruleReasoning.counter} />
              </div>
            </Collapsible>
          )}
          
          {ruleReasoning.source && (
            <div style={{
              marginTop: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Sources:</span>
              <GuidanceRef code={ruleReasoning.source} />
            </div>
          )}
        </Section>
      )}

      {/* Documentation Requirements */}
      {docs && (
        <Section id="documentation" title="Documentation Requirements" icon="fileText" defaultOpen={true}>
          {docs.required && docs.required.length > 0 && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-danger)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  Required
                </span>
                <span style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-danger-border)',
                }}>
                  {docs.required.length}
                </span>
              </div>
              <DocList items={docs.required} type="required" />
            </div>
          )}
          
          {docs.recommended && docs.recommended.length > 0 && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-info)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  Recommended
                </span>
                <span style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-info-bg)',
                  color: 'var(--color-info)',
                  border: '1px solid var(--color-info-border)',
                }}>
                  {docs.recommended.length}
                </span>
              </div>
              <DocList items={docs.recommended} type="recommended" />
            </div>
          )}
          
          {docs.orgSpecific && docs.orgSpecific.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  Organization-Specific
                </span>
                <AuthorityTag level="internal_policy" compact />
              </div>
              <DocList items={docs.orgSpecific} type="orgSpecific" />
            </div>
          )}
          {docs.scopeNote && (
            <div style={{
              marginTop: 'var(--space-md)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}>
              <strong style={{ color: 'var(--color-warning)' }}>Scope limitation: </strong>
              <HelpTextWithLinks text={docs.scopeNote} />
            </div>
          )}
        </Section>
      )}

      {/* Glossary */}
      <Section id="glossary" title="Regulatory Glossary" icon="book" defaultOpen={false}>
        <GlossaryPanel />
      </Section>

      {/* Quick Summary */}
      <Section id="summary" title="Assessment Summary" icon="layers">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-md)',
        }}>
          <div style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-hover)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
              Authorization
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              {answers.A1 || 'Not specified'}
            </div>
          </div>
          <div style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-hover)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
              PCCP Status
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              {answers.A2 === 'Yes' ? 'Has PCCP' : 'No PCCP'}
            </div>
          </div>
          <div style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-hover)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
              Intended Use Impact
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              {answers.B3 || 'Not assessed'}
            </div>
          </div>
          <div style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-hover)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
              Change Category
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              {answers.B1 || 'Not specified'}
            </div>
          </div>
        </div>

        {/* Key flags */}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
            Determination Flags
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            {(() => {
              const flags: Array<{ key: string; label: string; variant: 'danger' | 'warning' | 'success' | 'info' }> = [
                { key: 'isIntendedUseChange', label: 'Intended Use Change', variant: 'danger' },
                { key: 'isSignificant', label: 'Significant Change', variant: 'warning' },
                { key: 'pccpScopeVerified', label: 'PCCP Scope Verified', variant: 'success' },
                { key: 'isCyberOnly', label: 'Cybersecurity Only', variant: 'info' },
                { key: 'isBugFix', label: 'Bug Fix Only', variant: 'info' },
                { key: 'genAIHighImpactChange', label: 'GenAI High Impact', variant: 'warning' },
              ];
              const active = flags.filter(f => determination[f.key]);
              if (active.length === 0) {
                return (
                  <span style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-hover)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}>
                    No special flags
                  </span>
                );
              }
              return active.map(f => (
                <span key={f.key} style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: `var(--color-${f.variant}-bg)`,
                  color: `var(--color-${f.variant})`,
                  border: `1px solid var(--color-${f.variant}-border)`,
                }}>
                  {f.label}
                </span>
              ));
            })()}
          </div>
        </div>
      </Section>

      {/* Answers by Block */}
      {blocks.filter(b => b.id !== 'review').map((block, blockIndex) => {
        const questions = getQuestionsForBlock(block.id);
        const answeredQuestions = questions.filter(q => 
          !q.sectionDivider && !q.skip && answers[q.id] !== undefined && answers[q.id] !== ''
        );

        if (answeredQuestions.length === 0) return null;

        return (
          <Section 
            key={block.id} 
            id={block.id} 
            title={block.shortLabel} 
            icon={block.icon}
            badge={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBlock(blockIndex);
                }}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-primary-muted)',
                  color: 'var(--color-primary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {answeredQuestions.map((q) => {
                const qReasoning = questionReasoningLibrary[q.id];
                return (
                  <div key={q.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    paddingBottom: 'var(--space-md)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-sm)',
                    }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                        padding: '2px 6px',
                        background: 'var(--color-bg-hover)',
                        borderRadius: 'var(--radius-sm)',
                      }}>
                        {q.id}
                      </span>
                      {qReasoning?.status && (
                        <AuthorityTag level={qReasoning.status.toLowerCase().replace(' ', '_')} compact />
                      )}
                      <span style={{
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5,
                        flex: 1,
                      }}>
                        {q.q}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      marginLeft: 40,
                    }}>
                      {Array.isArray(answers[q.id]) 
                        ? answers[q.id].join(', ') 
                        : String(answers[q.id])}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}

      {/* Disclaimer */}
      <div style={{
        padding: 'var(--space-lg)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-warning-bg)',
        border: '1px solid var(--color-warning-border)',
        marginTop: 'var(--space-xl)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-md)',
        }}>
          <Icon name="alert" size={20} color="var(--color-warning)" className="flex-shrink-0 mt-0.5" />
          <div>
            <h4 style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-warning)',
              margin: '0 0 var(--space-sm) 0',
            }}>
              Disclaimer
            </h4>
            <p style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}>
              <strong>Intended for:</strong> Internal change-control, RA review initiation, and submission planning.{' '}
              <strong>Not intended for:</strong> Formal regulatory judgment, legal advice, or citation in submissions.{' '}
              U.S.-primary assessment using FDA software change framework and PCCP scope verification. 
              Non-U.S. jurisdictions are covered by escalation cues only, not full determinations.
            </p>
            <p style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              margin: 'var(--space-sm) 0 0 0',
            }}>
              v1 | Sources last reviewed Mar 2026 — verify current status at fda.gov before relying on this assessment | Primary: US (FDA) | Follow-up cues: EU, UK, CA, JP, CN
            </p>
          </div>
        </div>
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
