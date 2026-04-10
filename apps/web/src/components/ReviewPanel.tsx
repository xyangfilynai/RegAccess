import React from 'react';
import type { Answers, Block, DeterminationResult, AssessmentField } from '../lib/assessment-engine';
import type { ReviewerNote } from '../lib/assessment-store';
import { useReviewPanelData } from '../hooks/useReviewPanelData';
import { useReportExport } from '../hooks/useReportExport';
import {
  ReviewAssessmentBasisSection,
  ReviewDecisionSupportSection,
  ReviewHeroSection,
  ReviewOpenIssuesSection,
  ReviewReviewerNotesSection,
  ReviewSourcesAndPreparationSection,
} from './review-panel';

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
  const data = useReviewPanelData(answers, determination, blocks, getFieldsForBlock, onHandoff);
  const { exportReport, isExporting } = useReportExport({
    answers,
    determination,
    blocks,
    getFieldsForBlock,
    reviewerNotes: reviewerNotes || [],
    assessmentId,
  });

  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
      }}
    >
      <ReviewHeroSection data={data} onExport={exportReport} isExporting={isExporting} />
      <ReviewAssessmentBasisSection data={data} />
      <ReviewDecisionSupportSection data={data} />
      <ReviewOpenIssuesSection data={data} />
      <ReviewSourcesAndPreparationSection data={data} determination={determination} onHandoff={onHandoff} />
      <ReviewReviewerNotesSection reviewerNotes={reviewerNotes} onAddNote={onAddNote} onRemoveNote={onRemoveNote} />
    </div>
  );
};
