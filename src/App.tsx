import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { Layout } from './components/Layout';
import { DashboardPage } from './components/DashboardPage';
import { QuestionCard } from './components/QuestionCard';
import { Icon } from './components/Icon';
import { BlockBanners } from './components/BlockBanners';
import { SAMPLE_CASES } from './sample-cases';
import {
  getBlocks,
  getBlockFields,
  computeDerivedState,
  computeDetermination,
  type AssessmentField,
} from './lib/assessment-engine';
import { buildCaseSummary } from './lib/assessment-metadata';
import { useCascadeClearing } from './hooks/useCascadeClearing';
import { useAssessmentProgress, useCompletedBlocks } from './hooks/useAssessmentProgress';
import { useAssessmentFlow } from './hooks/useAssessmentFlow';
import { useAssessmentWorkspace } from './hooks/useAssessmentWorkspace';
import { LayoutContext, type LayoutContextValue } from './contexts/LayoutContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const LazyReviewPanel = lazy(() =>
  import('./components/ReviewPanel').then((module) => ({ default: module.ReviewPanel })),
);
const LazyFeedbackSurvey = lazy(() =>
  import('./components/FeedbackSurvey').then((module) => ({ default: module.FeedbackSurvey })),
);
const LazyHandoffPage = lazy(() =>
  import('./components/HandoffPage').then((module) => ({ default: module.HandoffPage })),
);

const DeferredContentFallback: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => (
  <div
    style={{
      minHeight: fullScreen ? '100vh' : undefined,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: fullScreen ? '48px 24px' : '32px 0',
    }}
  >
    <div className="card-sm" style={{ minWidth: 220, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
      Loading…
    </div>
  </div>
);

export const App: React.FC = () => {
  const {
    screen,
    setScreen,
    answers,
    setAnswers,
    currentBlockIndex,
    setCurrentBlockIndex,
    currentAssessmentId,
    savedAssessments,
    validationErrors,
    setValidationErrors,
    hasSavedSession,
    currentReviewerNotes,
    handleReset,
    handleLoadAssessment,
    handleDuplicateAssessment,
    handleDeleteAssessment,
    handleAddNote,
    handleRemoveNote,
    handleSaveAssessment,
    handleHome,
    handleOpenSampleCase,
    handleFullAssessment,
    handleResume,
  } = useAssessmentWorkspace();

  // Compute derived state from answers
  const derivedState = useMemo(() => computeDerivedState(answers), [answers]);
  const blocks = useMemo(() => getBlocks(answers, derivedState), [answers, derivedState]);

  const getFieldsForBlock = useCallback(
    (blockId: string): AssessmentField[] => {
      return getBlockFields(blockId, answers, derivedState);
    },
    [answers, derivedState],
  );

  const determination = useMemo(() => computeDetermination(answers), [answers]);

  // --- Extracted hooks ---
  const handleAnswerChange = useCascadeClearing(setAnswers);

  const {
    answeredCounts,
    totalCounts,
    requiredAnsweredCounts,
    requiredCounts,
    overallAnswered,
    overallTotal,
    overallRequiredAnswered,
    overallRequiredTotal,
  } = useAssessmentProgress(blocks, answers, getFieldsForBlock);

  const completedBlocks = useCompletedBlocks(blocks, requiredAnsweredCounts, requiredCounts);

  const {
    currentBlock,
    currentBlockFields,
    currentBlockComplete,
    currentMissingRequired,
    handlePrevious,
    handleNext,
    handleBlockSelect,
  } = useAssessmentFlow({
    answers,
    blocks,
    currentBlockIndex,
    getFieldsForBlock,
    requiredAnsweredCounts,
    requiredCounts,
    setCurrentBlockIndex,
    setValidationErrors,
    onExitAssessment: () => setScreen('dashboard'),
  });

  const caseSummary = useMemo(() => buildCaseSummary(answers), [answers]);

  const layoutContextValue: LayoutContextValue = useMemo(
    () => ({
      blocks,
      currentBlockIndex,
      onBlockSelect: handleBlockSelect,
      completedBlocks,
      answeredCounts,
      totalCounts,
      requiredAnsweredCounts,
      requiredCounts,
      overallAnswered,
      overallTotal,
      overallRequiredAnswered,
      overallRequiredTotal,
      caseSummary,
      onReset: handleReset,
      onHome: handleHome,
      onSaveAssessment: () => {
        handleSaveAssessment(determination.pathway);
      },
      canSaveAssessment: Object.keys(answers).length > 0,
      saveLabel: currentAssessmentId ? 'Update library record' : 'Save to library',
    }),
    [
      blocks,
      currentBlockIndex,
      handleBlockSelect,
      completedBlocks,
      answeredCounts,
      totalCounts,
      requiredAnsweredCounts,
      requiredCounts,
      overallAnswered,
      overallTotal,
      overallRequiredAnswered,
      overallRequiredTotal,
      caseSummary,
      handleReset,
      handleHome,
      handleSaveAssessment,
      determination.pathway,
      answers,
      currentAssessmentId,
    ],
  );

  // --- Screen routing ---
  if (screen === 'dashboard') {
    return (
      <DashboardPage
        onFullAssessment={handleFullAssessment}
        onResume={handleResume}
        hasSavedSession={hasSavedSession}
        sampleCases={SAMPLE_CASES}
        onOpenSampleCase={handleOpenSampleCase}
        savedAssessments={savedAssessments}
        onLoadAssessment={handleLoadAssessment}
        onDuplicateAssessment={handleDuplicateAssessment}
        onDeleteAssessment={handleDeleteAssessment}
      />
    );
  }

  if (screen === 'feedback') {
    return (
      <Suspense fallback={<DeferredContentFallback fullScreen />}>
        <LazyFeedbackSurvey onBack={() => setScreen('assess')} />
      </Suspense>
    );
  }

  if (screen === 'handoff') {
    return (
      <Suspense fallback={<DeferredContentFallback fullScreen />}>
        <LazyHandoffPage
          determination={determination}
          answers={answers}
          onBack={() => {
            setCurrentBlockIndex(blocks.length - 1);
            setScreen('assess');
          }}
          onBackToAssessment={() => {
            setCurrentBlockIndex(0);
            setScreen('assess');
          }}
        />
      </Suspense>
    );
  }

  // --- Assessment flow ---
  const renderBlockContent = () => {
    if (!currentBlock) return null;

    if (currentBlock.id === 'review') {
      return (
        <ErrorBoundary section="Review Panel">
          <Suspense fallback={<DeferredContentFallback />}>
            <LazyReviewPanel
              determination={determination}
              answers={answers}
              blocks={blocks}
              getFieldsForBlock={getFieldsForBlock}
              onHandoff={() => setScreen('handoff')}
              reviewerNotes={currentReviewerNotes}
              onAddNote={currentAssessmentId ? handleAddNote : undefined}
              onRemoveNote={currentAssessmentId ? handleRemoveNote : undefined}
              assessmentId={currentAssessmentId}
            />
          </Suspense>
        </ErrorBoundary>
      );
    }

    return (
      <div>
        <BlockBanners
          blockId={currentBlock.id}
          answers={answers}
          derivedState={derivedState}
          currentBlockComplete={currentBlockComplete}
          currentMissingRequired={currentMissingRequired}
        />

        {currentBlockFields.map((field, index) => (
          <QuestionCard
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={(value) => handleAnswerChange(field.id, value)}
            index={index}
            hasValidationError={Boolean(validationErrors[field.id])}
          />
        ))}
      </div>
    );
  };

  return (
    <LayoutContext.Provider value={layoutContextValue}>
      <Layout>
        {renderBlockContent()}

        {/* Navigation buttons */}
        <div className="nav-footer">
          <button onClick={handlePrevious} className="btn-outline">
            <Icon name="arrowLeft" size={16} />
            {currentBlockIndex === 0 ? 'Dashboard' : 'Previous'}
          </button>

          <div className="nav-footer-right">
            <span className="nav-footer-counter">
              {currentBlockIndex + 1} of {blocks.length}
            </span>

            {currentBlockIndex < blocks.length - 1 && (
              <button onClick={handleNext} className="btn-continue">
                Continue
                <Icon name="arrow" size={16} color="#fff" />
              </button>
            )}
          </div>
        </div>

        {/* Incomplete warning */}
        {!currentBlockComplete && currentBlock?.id !== 'review' && (
          <div className="incomplete-warning">
            <Icon name="alertCircle" size={16} color="var(--color-warning)" />
            <span className="incomplete-warning-text">Complete all required fields in this section to continue.</span>
          </div>
        )}
      </Layout>
    </LayoutContext.Provider>
  );
};
