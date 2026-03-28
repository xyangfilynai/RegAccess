import React, { useState } from 'react';
import { Icon } from '../Icon';
import { HelpTextWithLinks } from '../ui';
import type { ReviewerNote } from '../../lib/assessment-store';
import type { DeterminationResult } from '../../lib/assessment-engine';
import type { ReviewPanelData } from '../../hooks/useReviewPanelData';
import {
  CompactBadge,
  EvidenceGapSourceRef,
  IssueCard,
  RecordFactBlock,
  SectionCard,
  SectionHeading,
  SubsectionLabel,
  SummaryField,
  TraceStep,
} from './presentational';

interface ReviewHeroSectionProps {
  data: ReviewPanelData;
  onExport: () => Promise<void>;
  isExporting: boolean;
}

export const ReviewHeroSection: React.FC<ReviewHeroSectionProps> = ({ data, onExport, isExporting }) => (
  <SectionCard accentColor={data.config.accent} background={data.config.surface} borderColor={data.config.border}>
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-warning-bg)',
        border: '1px solid var(--color-warning-border)',
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.55,
        marginBottom: 'var(--space-lg)',
      }}
    >
      <strong style={{ color: 'var(--color-warning)' }}>Internal assessment only.</strong> This is a ChangePath-generated
      preliminary assessment, not a regulatory determination. It applies conservative internal policies that may exceed
      regulatory requirements. Outputs must be reviewed by qualified regulatory, clinical, and quality personnel before
      any reliance or action.
    </div>
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

      <button onClick={onExport} disabled={isExporting} className="btn-primary" aria-busy={isExporting}>
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
              {' '}
              <strong style={{ color: 'var(--color-text)' }}>Boundary note:</strong>{' '}
              <HelpTextWithLinks text={data.pccpHeroSummary.detail} />
            </>
          ) : null}
        </div>
      </div>
    )}
  </SectionCard>
);

export const ReviewAssessmentBasisSection: React.FC<{ data: ReviewPanelData }> = ({ data }) => (
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
        <div className="text-detail" style={{ marginBottom: 12 }}>
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
        <div className="text-detail" style={{ marginBottom: 12 }}>
          System-generated basis derived from the current record and pathway logic.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.assessmentBasisView.systemBasis.length > 0 ? (
            data.assessmentBasisView.systemBasis.map((item, index) => (
              <div key={`basis-${index}`} className="card-sm text-body" style={{ lineHeight: 1.65 }}>
                <HelpTextWithLinks text={item} />
              </div>
            ))
          ) : (
            <div className="card-sm" style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              No additional assessment-basis detail is available for this record.
            </div>
          )}
        </div>
      </div>
    </div>
  </SectionCard>
);

export const ReviewDecisionSupportSection: React.FC<{ data: ReviewPanelData }> = ({ data }) => (
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
        <div className="card-sm" style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          No decision-trace detail is available for this record.
        </div>
      )}
    </SectionCard>

    {data.alternativePathwayNotes.length > 0 && (
      <SectionCard style={{ height: '100%' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <SectionHeading>What Would Change This Pathway</SectionHeading>
        </div>

        <div className="text-detail" style={{ marginBottom: 12 }}>
          System-generated conditions under which the current record would support a different pathway.
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {data.alternativePathwayNotes.map((item, index) => (
            <div key={`alternative-${index}`} className="card-sm text-body" style={{ lineHeight: 1.65 }}>
              <HelpTextWithLinks text={item} />
            </div>
          ))}
        </div>
      </SectionCard>
    )}
  </div>
);

export const ReviewOpenIssuesSection: React.FC<{ data: ReviewPanelData }> = ({ data }) => (
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
        No ChangePath-detected issues remain for this record. Proceed with qualified expert review and QMS controls before any
        reliance or action.
      </div>
    )}
  </SectionCard>
);

interface ReviewSourcesAndPreparationSectionProps {
  data: ReviewPanelData;
  determination: DeterminationResult;
  onHandoff?: () => void;
}

export const ReviewSourcesAndPreparationSection: React.FC<ReviewSourcesAndPreparationSectionProps> = ({
  data,
  determination,
  onHandoff,
}) => (
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
            <div key={`reasoning-source-${source}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
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
          <button onClick={onHandoff} className="btn-success">
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
);

interface ReviewReviewerNotesSectionProps {
  reviewerNotes?: ReviewerNote[];
  onAddNote?: (author: string, text: string) => void;
  onRemoveNote?: (noteId: string) => void;
}

export const ReviewReviewerNotesSection: React.FC<ReviewReviewerNotesSectionProps> = ({
  reviewerNotes,
  onAddNote,
  onRemoveNote,
}) => {
  const [noteAuthor, setNoteAuthor] = useState('');
  const [noteText, setNoteText] = useState('');

  return (
    <SectionCard>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <SectionHeading>Reviewer Notes</SectionHeading>
      </div>

      <div className="text-detail" style={{ marginBottom: 12 }}>
        Reviewer-entered comments for this assessment record.
      </div>

      {reviewerNotes && reviewerNotes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: onAddNote ? 14 : 0 }}>
          {reviewerNotes.map((note) => (
            <div key={note.id} className="card-sm">
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
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{note.author}</span>
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
            onChange={(event) => setNoteAuthor(event.target.value)}
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
            onChange={(event) => setNoteText(event.target.value)}
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
  );
};
