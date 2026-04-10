import React from 'react';
import type { SavedAssessment } from '../lib/assessment-store';
import type { SampleCaseDefinition } from '../sample-cases';
import {
  DashboardActionsSection,
  DashboardHeroSection,
  DashboardShellHeader,
  PrototypeUseSection,
  SampleLibrarySection,
  SavedAssessmentsSection,
} from './DashboardSections';

interface DashboardPageProps {
  onFullAssessment: () => void;
  onResume: () => void;
  sampleCases: SampleCaseDefinition[];
  onOpenSampleCase: (id: string) => void;
  hasSavedSession: boolean;
  savedAssessments?: SavedAssessment[];
  onLoadAssessment?: (id: string) => void;
  onDuplicateAssessment?: (id: string) => void;
  onDeleteAssessment?: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onFullAssessment,
  onResume,
  sampleCases,
  onOpenSampleCase,
  hasSavedSession,
  savedAssessments = [],
  onLoadAssessment,
  onDuplicateAssessment,
  onDeleteAssessment,
}) => {
  const hasSavedWork = hasSavedSession || savedAssessments.length > 0;

  return (
    <div className="dashboard-page">
      <DashboardShellHeader />

      <main className="dashboard-main">
        <DashboardHeroSection />
        <DashboardActionsSection
          hasSavedSession={hasSavedSession}
          onResume={onResume}
          onFullAssessment={onFullAssessment}
        />
        <SampleLibrarySection sampleCases={sampleCases} onOpenSampleCase={onOpenSampleCase} />
        <SavedAssessmentsSection
          hasSavedWork={hasSavedWork}
          savedAssessments={savedAssessments}
          onLoadAssessment={onLoadAssessment}
          onDuplicateAssessment={onDuplicateAssessment}
          onDeleteAssessment={onDeleteAssessment}
        />
        <PrototypeUseSection />
      </main>
    </div>
  );
};
