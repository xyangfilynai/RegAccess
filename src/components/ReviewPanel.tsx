import React, { useState } from 'react';
import { Icon } from './Icon';
import {
  GuidanceRef,
  HelpTextWithLinks,
} from './ui';
import type { Answers, Block, DeterminationResult, AssessmentField } from '../lib/assessment-engine';
import {
  findGuidanceLink,
  getSourceBadge,
} from '../lib/content';
import { assessmentStore, type ReviewerNote } from '../lib/assessment-store';
import { buildPdfReportDocument } from '../lib/pdf-report-model';
import {
  useReviewPanelData,
  type MergedBlockerItem,
  type AssessmentRecordFact,
} from '../hooks/useReviewPanelData';

/* ------------------------------------------------------------------ */
/*  Small presentational components                                    */
/* ------------------------------------------------------------------ */

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
  item: MergedBlockerItem;
}> = ({ item }) => {
  const uniqueSources = Array.from(new Set(item.sourceRefs));
  const accent = item.kind === 'expert'
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
          <HelpTextWithLinks text={item.title} />
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
          {item.kind === 'expert' ? 'Expert Review' : 'Evidence Gap'}
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
        {item.meta}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <SubsectionLabel>Why It Matters</SubsectionLabel>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <HelpTextWithLinks text={item.whyThisMatters} />
          </div>
        </div>

        <div>
          <SubsectionLabel>{item.actionLabel}</SubsectionLabel>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <HelpTextWithLinks text={item.actionText} />
          </div>
        </div>

        {uniqueSources.length > 0 && (
          <div>
            <SubsectionLabel>Basis</SubsectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {uniqueSources.map((source) => (
                <div
                  key={`${item.title}-${source}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
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

/* ------------------------------------------------------------------ */
/*  ReviewPanel                                                        */
/* ------------------------------------------------------------------ */

interface ReviewPanelProps {
  determination: DeterminationResult;
  answers: Answers;
  blocks: Block[];
  getFieldsForBlock: (blockId: string) => AssessmentField[];
  onHandoff?: () => void;
  reviewerNotes?: ReviewerNote[];
  onAddNote?: (author: string, text: string) => void;
  onRemoveNote?: (noteId: string) => void;
  assessmentId?: string | null;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  determination,
  answers,
  blocks,
  getFieldsForBlock,
  onHandoff,
  reviewerNotes,
  onAddNote,
  onRemoveNote,
  assessmentId,
}) => {
  const [noteAuthor, setNoteAuthor] = useState('');
  const [noteText, setNoteText] = useState('');

  const data = useReviewPanelData(answers, determination, blocks, getFieldsForBlock, onHandoff);

  const showReviewerNotes = Boolean(onAddNote || (reviewerNotes && reviewerNotes.length > 0));

  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
      }}
    >
      {/* === Pathway summary hero === */}
      <SectionCard
        accentColor={data.config.accent}
        background={data.config.surface}
        borderColor={data.config.border}
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
                color: data.config.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 8,
              }}
            >
              {data.config.label}
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
              {data.isIncomplete ? data.incompleteHeading : data.pathway}
            </h1>

            {data.summaryReason && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.65,
                  maxWidth: 760,
                }}
              >
                <strong style={{ color: 'var(--color-text)' }}>System reasoning:</strong>{' '}
                <HelpTextWithLinks text={data.summaryReason} />
              </div>
            )}
          </div>

          <button
            onClick={async () => {
              const assessmentName = assessmentId
                ? assessmentStore.get(assessmentId)?.name
                : undefined;
              const reportDoc = buildPdfReportDocument(
                answers,
                determination,
                blocks,
                getFieldsForBlock,
                {
                  assessmentId: assessmentId || undefined,
                  assessmentName,
                  reviewerNotes: reviewerNotes || [],
                },
              );
              const { generateAndDownloadDocx } = await import('../lib/docx-renderer');
              await generateAndDownloadDocx(reportDoc);
            }}
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
            Export Report
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <SummaryField label="Assessed Pathway">
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.45 }}>
              {data.pathway}
            </div>
          </SummaryField>

          <SummaryField label="Record Status">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CompactBadge
                label={data.relianceState.label}
                bg={data.relianceState.bg}
                border={data.relianceState.border}
                text={data.relianceState.text}
              />
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                {data.relianceState.detail}
              </div>
            </div>
          </SummaryField>

          <SummaryField label="Indicated Next Step">
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
              <HelpTextWithLinks text={data.primaryAction} />
            </div>
          </SummaryField>
        </div>

        {data.pccpHeroSummary && (
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
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
              <strong style={{ color: 'var(--color-text)' }}>{data.pccpHeroSummary.heading}.</strong>{' '}
              <HelpTextWithLinks text={data.pccpHeroSummary.summary} />
              {data.pccpHeroSummary.detail ? (
                <>
                  {' '}<strong style={{ color: 'var(--color-text)' }}>Boundary note:</strong>{' '}
                  <HelpTextWithLinks text={data.pccpHeroSummary.detail} />
                </>
              ) : null}
            </div>
          </div>
        )}
      </SectionCard>

      {/* === Assessment Basis === */}
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
            <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', lineHeight: 1.55, marginBottom: 12 }}>
              User-entered or selected fields from the current record.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
                marginBottom: data.longRecordFacts.length > 0 ? 10 : 0,
              }}
            >
              {data.shortRecordFacts.map((fact) => (
                <RecordFactBlock key={fact.label} fact={fact} />
              ))}
            </div>

            {data.longRecordFacts.length > 0 && (
              <div style={{ display: 'grid', gap: 10 }}>
                {data.longRecordFacts.map((fact) => (
                  <RecordFactBlock key={fact.label} fact={fact} />
                ))}
              </div>
            )}
          </div>

          <div>
            <SubsectionLabel>System Basis</SubsectionLabel>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', lineHeight: 1.55, marginBottom: 12 }}>
              System-generated basis derived from the current record and pathway logic.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.assessmentBasisView.systemBasis.length > 0 ? data.assessmentBasisView.systemBasis.map((item, index) => (
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

      {/* === Decision Trace + Alternative Pathways === */}
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

          {data.decisionSupportNotes.length > 0 && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-muted)',
                border: '1px solid var(--color-info-border)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <SubsectionLabel>Supporting Reasoning</SubsectionLabel>
              <div style={{ display: 'grid', gap: 8 }}>
                {data.decisionSupportNotes.map((item, index) => (
                  <div
                    key={`support-note-${index}`}
                    style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
                  >
                    <HelpTextWithLinks text={item} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.decisionTraceSteps.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {data.decisionTraceSteps.map((step, index) => (
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

        {data.alternativePathwayNotes.length > 0 && (
          <SectionCard style={{ height: '100%' }}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <SectionHeading>What Would Change This Pathway</SectionHeading>
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', lineHeight: 1.55, marginBottom: 12 }}>
              System-generated conditions under which the current record would support a different pathway.
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {data.alternativePathwayNotes.map((item, index) => (
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

      {/* === Open Issues === */}
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
          {data.mergedBlockers.length > 0 && (
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
              {data.mergedBlockers.length}
            </span>
          )}
        </div>

        {data.mergedBlockers.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {data.mergedBlockers.map((blocker) => (
              <IssueCard key={blocker.id} item={blocker} />
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

      {/* === Sources + Preparation === */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-lg)',
        }}
      >
        {data.citedSources.length > 0 && (
          <SectionCard style={{ height: '100%' }}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <SectionHeading>Regulatory Sources Referenced</SectionHeading>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.citedSources.map((source) => (
                <div
                  key={`reasoning-source-${source}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                >
                  <span style={{ color: 'var(--color-text-muted)', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                  <EvidenceGapSourceRef code={source} />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {data.showPreparationSection && (
          <SectionCard
            dataTestId={onHandoff && !data.isIncomplete ? 'handoff-cta' : undefined}
            background={data.preparationNeedsCaution ? 'var(--color-warning-bg)' : 'var(--color-bg-elevated)'}
            borderColor={data.preparationNeedsCaution ? 'var(--color-warning-border)' : 'var(--color-border)'}
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
                marginBottom: data.supportingNextSteps.length > 0 ? 12 : 0,
              }}
            >
              {data.isIncomplete
                ? 'Complete pathway-critical fields before treating this record as ready for the preparation checklist.'
                : data.preparationNeedsCaution
                  ? 'The checklist can be opened from this record, but open issues remain and should be closed before reliance or execution.'
                  : 'Use the checklist as the next execution step for this pathway.'}
            </div>

            {data.supportingNextSteps.length > 0 && (
              <div style={{ display: 'grid', gap: 8, marginBottom: onHandoff && !data.isIncomplete ? 16 : 0 }}>
                {data.supportingNextSteps.map((step, index) => (
                  <TraceStep key={`next-step-${index}`} index={index} text={step} />
                ))}
              </div>
            )}

            {onHandoff && !data.isIncomplete && (
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

      {/* === Reviewer Notes === */}
      {showReviewerNotes && (
        <SectionCard>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <SectionHeading>Reviewer Notes</SectionHeading>
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', lineHeight: 1.55, marginBottom: 12 }}>
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
            <div style={{ display: 'grid', gap: 10 }}>
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
