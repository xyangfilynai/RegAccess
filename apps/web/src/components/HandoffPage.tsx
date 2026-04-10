import React, { useMemo } from 'react';
import { AuthPathway, type Answers, type DeterminationResult } from '../lib/assessment-engine';
import { getSections, getHandoffTitle, getHandoffDesc, getPreparationPackageLabel } from '../lib/handoff-checklist';
import { useHandoffChecklist } from '../hooks/useHandoffChecklist';
import {
  HandoffAdvisories,
  HandoffAssessmentContext,
  HandoffBackButton,
  HandoffChecklistSections,
  HandoffCompletionSection,
  HandoffIncompleteState,
  HandoffPreSubmissionNotice,
  HandoffShellHeader,
  HandoffTitleCard,
} from './HandoffSections';

// Re-export for test compatibility
export type { ChecklistSection } from '../lib/handoff-checklist';
export { getSections } from '../lib/handoff-checklist';

interface HandoffPageProps {
  determination: DeterminationResult;
  answers: Answers;
  onBack: () => void;
  onBackToAssessment: () => void;
}

export const HandoffPage: React.FC<HandoffPageProps> = ({ determination, answers, onBack, onBackToAssessment }) => {
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isNewSub = determination.isNewSub;
  const isIncomplete = determination.isIncomplete;
  const consistencyIssues = determination.consistencyIssues || [];

  const sections = useMemo(() => getSections(determination, answers), [determination, answers]);
  const title = getHandoffTitle(determination, answers);
  const desc = getHandoffDesc(determination, answers);
  const packageLabel = getPreparationPackageLabel(determination, answers);
  const { checks, markedComplete, checkedCount, totalItems, progressPercent, toggleCheck, markComplete } =
    useHandoffChecklist(sections);

  if (isIncomplete) {
    return <HandoffIncompleteState onBack={onBack} onBackToAssessment={onBackToAssessment} />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <HandoffShellHeader />

      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '36px 32px 60px',
        }}
      >
        <HandoffBackButton onClick={onBack} />

        <div
          style={{
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            background: 'var(--color-bg-elevated)',
          }}
        >
          <HandoffTitleCard
            determination={determination}
            answers={answers}
            title={title}
            description={desc}
            packageLabel={packageLabel}
            progressPercent={progressPercent}
            checkedCount={checkedCount}
            totalItems={totalItems}
          />

          <div style={{ padding: '24px 32px' }}>
            <HandoffAdvisories consistencyIssueCount={consistencyIssues.length} />
            <HandoffAssessmentContext answers={answers} />
            <HandoffPreSubmissionNotice isNewSubmission={isNewSub} isDeNovo={isDeNovo} isPMA={isPMA} />
            <HandoffChecklistSections sections={sections} checks={checks} onToggleCheck={toggleCheck} />
            <HandoffCompletionSection
              checkedCount={checkedCount}
              totalItems={totalItems}
              markedComplete={markedComplete}
              onMarkComplete={markComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
