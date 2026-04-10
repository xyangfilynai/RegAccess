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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <DashboardShellHeader />

      {/* Main Content */}
      <main
        style={{
          maxWidth: 840,
          margin: '0 auto',
          padding: '64px 40px 80px',
        }}
      >
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

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          main {
            padding: 48px 24px 60px !important;
          }
          header {
            padding: 0 24px !important;
          }
        }
        @media (max-width: 480px) {
          main {
            padding: 40px 16px 60px !important;
          }
          header {
            padding: 0 16px !important;
          }
          h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};
