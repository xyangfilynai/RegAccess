import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DashboardPage } from './components/DashboardPage';
import { QuestionCard } from './components/QuestionCard';
import { ReviewPanel } from './components/ReviewPanel';
import { FeedbackSurvey } from './components/FeedbackSurvey';
import { HandoffPage } from './components/HandoffPage';
import { Icon } from './components/Icon';
import { BlockBanners } from './components/BlockBanners';
import { SAMPLE_CASES, SAMPLE_CASES_BY_ID } from './sample-cases';
import {
  getBlocks,
  getBlockFields,
  computeDerivedState,
  computeDetermination,
  Answer,
  isAnsweredValue,
  type Answers,
  type AssessmentField,
} from './lib/assessment-engine';
import {
  assessmentStore,
  type SavedAssessment,
} from './lib/assessment-store';
import { storage } from './lib/storage';

type Screen = 'dashboard' | 'assess' | 'feedback' | 'handoff';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [answers, setAnswers] = useState<Answers>(storage.loadAnswers);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(storage.loadBlockIndex);

  // Assessment management state
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>(() => assessmentStore.list());

  // Refresh saved assessments list
  const refreshSavedAssessments = useCallback(() => {
    setSavedAssessments(assessmentStore.list());
  }, []);

  // Persist answers to localStorage
  useEffect(() => {
    storage.saveAnswers(answers);
  }, [answers]);

  // Persist block index to localStorage
  useEffect(() => {
    storage.saveBlockIndex(currentBlockIndex);
  }, [currentBlockIndex]);

  // Compute derived state from answers
  const derivedState = useMemo(() => computeDerivedState(answers), [answers]);

  // Get blocks based on current answers
  const blocks = useMemo(() => getBlocks(answers, derivedState), [answers, derivedState]);

  // Fields shown for the current block (assessment items + section dividers)
  const getFieldsForBlock = useCallback((blockId: string): AssessmentField[] => {
    return getBlockFields(blockId, answers, derivedState);
  }, [answers, derivedState]);

  useEffect(() => {
    if (currentBlockIndex > blocks.length - 1) {
      setCurrentBlockIndex(Math.max(0, blocks.length - 1));
    }
  }, [blocks.length, currentBlockIndex]);

  const currentBlock = blocks[currentBlockIndex];
  const currentBlockFields = currentBlock ? getFieldsForBlock(currentBlock.id) : [];

  // Compute determination
  const determination = useMemo(() => computeDetermination(answers), [answers]);

  // Calculate answered and total field counts per block in a single pass
  const {
    answeredCounts,
    totalCounts,
    requiredAnsweredCounts,
    requiredCounts,
    overallAnswered,
    overallTotal,
    overallRequiredAnswered,
    overallRequiredTotal,
  } = useMemo(() => {
    const answered: Record<string, number> = {};
    const total: Record<string, number> = {};
    const requiredAnswered: Record<string, number> = {};
    const requiredTotal: Record<string, number> = {};
    let overallAnsweredCount = 0;
    let overallTotalCount = 0;
    let overallRequiredAnsweredCount = 0;
    let overallRequiredTotalCount = 0;

    blocks.forEach(block => {
      if (block.id === 'review') {
        answered[block.id] = 0;
        total[block.id] = 0;
        requiredAnswered[block.id] = 0;
        requiredTotal[block.id] = 0;
        return;
      }
      const blockFields = getFieldsForBlock(block.id);
      const visible = blockFields.filter(q => !q.sectionDivider && !q.skip);
      const required = visible.filter(q => q.pathwayCritical);
      total[block.id] = visible.length;
      answered[block.id] = visible.filter(q => isAnsweredValue(answers[q.id])).length;
      requiredTotal[block.id] = required.length;
      requiredAnswered[block.id] = required.filter(q => isAnsweredValue(answers[q.id])).length;
      overallTotalCount += visible.length;
      overallAnsweredCount += answered[block.id];
      overallRequiredTotalCount += required.length;
      overallRequiredAnsweredCount += requiredAnswered[block.id];
    });

    return {
      answeredCounts: answered,
      totalCounts: total,
      requiredAnsweredCounts: requiredAnswered,
      requiredCounts: requiredTotal,
      overallAnswered: overallAnsweredCount,
      overallTotal: overallTotalCount,
      overallRequiredAnswered: overallRequiredAnsweredCount,
      overallRequiredTotal: overallRequiredTotalCount,
    };
  }, [blocks, answers, getFieldsForBlock]);

  // Track completed blocks
  const completedBlocks = useMemo(() => {
    const completed = new Set<string>();
    blocks.forEach((block) => {
      if (block.id !== 'review' && (requiredCounts[block.id] || 0) > 0 && requiredAnsweredCounts[block.id] === requiredCounts[block.id]) {
        completed.add(block.id);
      }
    });
    return completed;
  }, [blocks, requiredAnsweredCounts, requiredCounts]);

  // Handle answer change with cascade clearing (matches original setAnswer logic)
  const handleAnswerChange = useCallback((fieldId: string, value: unknown) => {
    setAnswers(prev => {
      const next: Answers = { ...prev, [fieldId]: value };

      // A1 change -> clear all downstream blocks, including any legacy hidden answers.
      if (fieldId === 'A1' && prev.A1 !== value) {
        Object.keys(prev).filter(k =>
          k.startsWith('B') || k.startsWith('C') || k.startsWith('P') ||
          k.startsWith('D') || k.startsWith('E') || k.startsWith('F')
        ).forEach(k => { next[k] = undefined; });
      }

      // B1 change -> clear B2 + all downstream blocks, including any legacy hidden answers.
      if (fieldId === 'B1' && prev.B1 !== value) {
        next.B2 = undefined;
        Object.keys(prev).filter(k =>
          k.startsWith('C') || k.startsWith('P') ||
          k.startsWith('D') || k.startsWith('E') || k.startsWith('F')
        ).forEach(k => { next[k] = undefined; });
      }

      // B1 change away from "Intended Use / Indications for Use" -> clear B3
      if (
        fieldId === 'B1' &&
        prev.B1 === 'Intended Use / Indications for Use' &&
        value !== 'Intended Use / Indications for Use'
      ) {
        next.B3 = undefined;
      }

      return next;
    });
  }, []);

  const handlePrevious = useCallback(() => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // At block 0, go back to dashboard
      setScreen('dashboard');
    }
  }, [currentBlockIndex]);

  const handleBlockSelect = useCallback((index: number) => {
    setCurrentBlockIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Reset assessment and return to dashboard
  const handleReset = useCallback(() => {
    setAnswers({});
    setCurrentBlockIndex(0);
    setCurrentAssessmentId(null);
    storage.clearSession();
    setScreen('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check if current block has required pathway fields answered
  const currentBlockComplete = useMemo(() => {
    if (!currentBlock || currentBlock.id === 'review') return true;
    const fields = currentBlockFields;
    const requiredPathwayFields = fields.filter(q =>
      !q.sectionDivider && !q.skip && q.pathwayCritical
    );
    return requiredPathwayFields.every(q => isAnsweredValue(answers[q.id]));
  }, [currentBlock, currentBlockFields, answers]);

  // Validation state for highlighting incomplete required fields
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  const currentMissingRequired = useMemo(() => {
    if (!currentBlock || currentBlock.id === 'review') return 0;
    return Math.max(0, (requiredCounts[currentBlock.id] || 0) - (requiredAnsweredCounts[currentBlock.id] || 0));
  }, [currentBlock, requiredCounts, requiredAnsweredCounts]);

  type CaseSummaryTone = 'default' | 'warning' | 'success' | 'info';
  const caseSummary = useMemo((): { label: string; value: string; tone: CaseSummaryTone }[] => {
    const baselineMissing = !answers.A1c;
    const authIdMissing = !answers.A1b;
    return [
      {
        label: 'Authorization',
        value: answers.A1 ? String(answers.A1) : 'Not provided',
        tone: answers.A1 ? 'default' : 'warning',
      },
      {
        label: 'Authorization ID',
        value: answers.A1b ? String(answers.A1b) : 'Not provided',
        tone: authIdMissing ? 'warning' : 'default',
      },
      {
        label: 'Authorized baseline',
        value: answers.A1c ? String(answers.A1c) : 'Not provided',
        tone: baselineMissing ? 'warning' : 'default',
      },
      {
        label: 'Change',
        value: answers.B2 ? String(answers.B2) : answers.B1 ? String(answers.B1) : 'Not classified',
        tone: answers.B2 || answers.B1 ? 'info' : 'default',
      },
      {
        label: 'PCCP',
        value: answers.A2 === Answer.Yes ? 'Authorized PCCP on file' : answers.A2 === Answer.No ? 'No authorized PCCP' : 'Not specified',
        tone: answers.A2 === Answer.Yes ? 'success' : 'default',
      },
    ];
  }, [answers.A1, answers.A1b, answers.A1c, answers.A2, answers.B1, answers.B2]);

  // Clear validation errors when answers change
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `validationErrors` is intentionally excluded to prevent an infinite loop (the effect sets validationErrors, so including it in deps would cause re-triggering)
  }, [answers]);

  // Navigation with validation gating
  const handleNext = useCallback(() => {
    if (currentBlockIndex < blocks.length - 1) {
      if (currentBlock && currentBlock.id !== 'review' && !currentBlockComplete) {
        const errors: Record<string, boolean> = {};
        currentBlockFields
          .filter(q => !q.sectionDivider && !q.skip && q.pathwayCritical)
          .forEach(q => {
            if (!isAnsweredValue(answers[q.id])) {
              errors[q.id] = true;
            }
          });
        setValidationErrors(errors);
        return;
      }
      setCurrentBlockIndex(currentBlockIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentBlockIndex, blocks.length, currentBlock, currentBlockComplete, currentBlockFields, answers]);

  const handleLoadAssessment = useCallback((id: string) => {
    const assessment = assessmentStore.get(id);
    if (!assessment) return;
    setAnswers(assessment.answers);
    setCurrentBlockIndex(assessment.blockIndex);
    setCurrentAssessmentId(assessment.id);
    setValidationErrors({});
    setScreen('assess');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDuplicateAssessment = useCallback((id: string) => {
    assessmentStore.duplicate(id);
    refreshSavedAssessments();
  }, [refreshSavedAssessments]);

  const handleDeleteAssessment = useCallback((id: string) => {
    assessmentStore.delete(id);
    refreshSavedAssessments();
  }, [refreshSavedAssessments]);

  const handleAddNote = useCallback((author: string, text: string) => {
    if (currentAssessmentId) {
      assessmentStore.addNote(currentAssessmentId, author, text);
      refreshSavedAssessments();
    }
  }, [currentAssessmentId, refreshSavedAssessments]);

  const handleRemoveNote = useCallback((noteId: string) => {
    if (currentAssessmentId) {
      assessmentStore.removeNote(currentAssessmentId, noteId);
      refreshSavedAssessments();
    }
  }, [currentAssessmentId, refreshSavedAssessments]);

  // Get current reviewer notes from store
  const currentReviewerNotes = useMemo(() => {
    if (!currentAssessmentId) return [];
    const assessment = assessmentStore.get(currentAssessmentId);
    return assessment?.reviewerNotes || [];
  }, [currentAssessmentId, savedAssessments]); // savedAssessments as dependency to refresh

  // Navigate to dashboard without destroying current answers
  const handleHome = useCallback(() => {
    setScreen('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // --- Dashboard actions ---

  const handleOpenSampleCase = useCallback((sampleCaseId: string) => {
    const sampleCase = SAMPLE_CASES_BY_ID[sampleCaseId];
    if (!sampleCase) return;

    setAnswers({ ...sampleCase.answers });
    setCurrentBlockIndex(0);
    setValidationErrors({});
    setCurrentAssessmentId(null);
    setScreen('assess');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleFullAssessment = useCallback(() => {
    setAnswers({});
    setCurrentBlockIndex(0);
    setValidationErrors({});
    setCurrentAssessmentId(null);
    storage.clearSession();
    setScreen('assess');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleResume = useCallback(() => {
    // Answers and block index are already loaded from localStorage
    setScreen('assess');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // --- Dashboard page ---
  if (screen === 'dashboard') {
    return (
      <DashboardPage
        onFullAssessment={handleFullAssessment}
        onResume={handleResume}
        hasSavedSession={storage.hasSavedAnswers()}
        sampleCases={SAMPLE_CASES}
        onOpenSampleCase={handleOpenSampleCase}
        savedAssessments={savedAssessments}
        onLoadAssessment={handleLoadAssessment}
        onDuplicateAssessment={handleDuplicateAssessment}
        onDeleteAssessment={handleDeleteAssessment}
      />
    );
  }

  // --- Feedback survey ---
  if (screen === 'feedback') {
    return (
      <FeedbackSurvey onBack={() => setScreen('assess')} />
    );
  }

  // --- Handoff / preparation checklist ---
  if (screen === 'handoff') {
    return (
      <HandoffPage
        determination={determination}
        answers={answers}
        onBack={() => {
          // Go back to assessment on the review block
          setCurrentBlockIndex(blocks.length - 1);
          setScreen('assess');
        }}
        onBackToAssessment={() => {
          setCurrentBlockIndex(0);
          setScreen('assess');
        }}
      />
    );
  }

  // --- Assessment (existing flow) ---

  // Render current block content
  const renderBlockContent = () => {
    if (!currentBlock) return null;

    // Review block
    if (currentBlock.id === 'review') {
      return (
        <ReviewPanel
          determination={determination}
          answers={answers}
          blocks={blocks}
          getFieldsForBlock={getFieldsForBlock}
          onHandoff={() => setScreen('handoff')}
          reviewerNotes={currentReviewerNotes}
          onAddNote={currentAssessmentId ? handleAddNote : undefined}
          onRemoveNote={currentAssessmentId ? handleRemoveNote : undefined}
        />
      );
    }

    // Assessment blocks (fields) with contextual banners
    const blockId = currentBlock.id;

    return (
      <div>
        <BlockBanners
          blockId={blockId}
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
    <Layout
      blocks={blocks}
      currentBlockIndex={currentBlockIndex}
      onBlockSelect={handleBlockSelect}
      completedBlocks={completedBlocks}
      answeredCounts={answeredCounts}
      totalCounts={totalCounts}
      requiredAnsweredCounts={requiredAnsweredCounts}
      requiredCounts={requiredCounts}
      overallAnswered={overallAnswered}
      overallTotal={overallTotal}
      overallRequiredAnswered={overallRequiredAnswered}
      overallRequiredTotal={overallRequiredTotal}
      caseSummary={caseSummary}
      onReset={handleReset}
      onHome={handleHome}
    >
      {renderBlockContent()}

      {/* Navigation buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'var(--space-xl)',
        paddingTop: 'var(--space-lg)',
        borderTop: '1px solid var(--color-border)',
      }}>
        <button
          onClick={handlePrevious}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Icon name="arrowLeft" size={16} />
          {currentBlockIndex === 0 ? 'Dashboard' : 'Previous'}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          {/* Block indicator */}
          <span style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
          }}>
            {currentBlockIndex + 1} of {blocks.length}
          </span>

          {currentBlockIndex < blocks.length - 1 && (
            <button
              onClick={handleNext}
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
                transition: 'all var(--transition-fast)',
              }}
            >
              Continue
              <Icon name="arrow" size={16} color="#fff" />
            </button>
          )}
        </div>
      </div>

      {/* Incomplete warning */}
      {!currentBlockComplete && currentBlock?.id !== 'review' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-md)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
        }}>
          <Icon name="alertCircle" size={16} color="var(--color-warning)" />
          <span style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
          }}>
            Complete all required fields in this section to continue.
          </span>
        </div>
      )}
    </Layout>
  );
};
