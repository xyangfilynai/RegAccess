import { useState } from 'react';
import type { Answers, Block, DeterminationResult, AssessmentField } from '../lib/assessment-engine';
import type { ReviewerNote } from '../lib/assessment-store';

interface UseReportExportOptions {
  answers: Answers;
  determination: DeterminationResult;
  blocks: Block[];
  getFieldsForBlock: (blockId: string) => AssessmentField[];
  reviewerNotes: ReviewerNote[];
  assessmentId?: string | null;
}

export function useReportExport({
  answers,
  determination,
  blocks,
  getFieldsForBlock,
  reviewerNotes,
  assessmentId,
}: UseReportExportOptions) {
  const [isExporting, setIsExporting] = useState(false);

  const exportReport = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const [{ assessmentStore }, { buildPdfReportDocument }, { generateAndDownloadDocx }] = await Promise.all([
        import('../lib/assessment-store'),
        import('../lib/pdf-report-model'),
        import('../lib/docx-renderer'),
      ]);

      const assessmentName = assessmentId ? assessmentStore.get(assessmentId)?.name : undefined;
      const reportDoc = buildPdfReportDocument(answers, determination, blocks, getFieldsForBlock, {
        assessmentId: assessmentId || undefined,
        assessmentName,
        reviewerNotes,
      });

      await generateAndDownloadDocx(reportDoc);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportReport,
    isExporting,
  };
}
