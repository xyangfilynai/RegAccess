import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DashboardPage } from './components/DashboardPage';
import { QuestionCard } from './components/QuestionCard';
import { ReviewPanel } from './components/ReviewPanel';
import { FeedbackSurvey } from './components/FeedbackSurvey';
import { HandoffPage } from './components/HandoffPage';
import { Icon } from './components/Icon';
import { SAMPLE_CASE } from './sampleCase';
import {
  getBlocks,
  getQuestions,
  computeDerivedState,
  computeDetermination,
  changeTaxonomy,
  Answer,
  isAnsweredValue,
  type Answers,
  type Question,
} from './lib/assessment-engine';
import {
  assessmentStore,
  type SavedAssessment,
} from './lib/assessment-store';

const STORAGE_KEY = 'regassess-answers';
const BLOCK_STORAGE_KEY = 'regassess-block-index';

type Screen = 'dashboard' | 'assess' | 'feedback' | 'handoff';

const bannerStyle = {
  warning: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-warning-bg)',
    border: '1px solid var(--color-warning-border)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  } as React.CSSProperties,
  danger: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-danger-bg)',
    border: '1px solid var(--color-danger-border)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  } as React.CSSProperties,
};

// Load saved answers from localStorage
const loadSavedAnswers = (): Answers => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Load saved block index from localStorage
const loadSavedBlockIndex = (): number => {
  try {
    const saved = localStorage.getItem(BLOCK_STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
};

// Check if there's a saved session with actual answers
const hasSavedAnswers = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    return Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
};

export const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [answers, setAnswers] = useState<Answers>(loadSavedAnswers);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(loadSavedBlockIndex);

  // Assessment management state
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>(() => assessmentStore.list());

  // Refresh saved assessments list
  const refreshSavedAssessments = useCallback(() => {
    setSavedAssessments(assessmentStore.list());
  }, []);

  // Persist answers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // Ignore storage errors
    }
  }, [answers]);

  // Persist block index to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BLOCK_STORAGE_KEY, String(currentBlockIndex));
    } catch {
      // Ignore storage errors
    }
  }, [currentBlockIndex]);

  // Compute derived state from answers
  const derivedState = useMemo(() => computeDerivedState(answers), [answers]);

  // Get blocks based on current answers
  const blocks = useMemo(() => getBlocks(answers, derivedState), [answers, derivedState]);

  // Get questions for current block
  const getQuestionsForBlock = useCallback((blockId: string): Question[] => {
    return getQuestions(blockId, answers, derivedState);
  }, [answers, derivedState]);

  useEffect(() => {
    if (currentBlockIndex > blocks.length - 1) {
      setCurrentBlockIndex(Math.max(0, blocks.length - 1));
    }
  }, [blocks.length, currentBlockIndex]);

  const currentBlock = blocks[currentBlockIndex];
  const currentQuestions = currentBlock ? getQuestionsForBlock(currentBlock.id) : [];

  // Compute determination
  const determination = useMemo(() => computeDetermination(answers), [answers]);

  // Calculate answered and total question counts per block in a single pass
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
      const questions = getQuestionsForBlock(block.id);
      const visible = questions.filter(q => !q.sectionDivider && !q.skip);
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
  }, [blocks, answers, getQuestionsForBlock]);

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
  const handleAnswerChange = useCallback((questionId: string, value: unknown) => {
    setAnswers(prev => {
      const next: Answers = { ...prev, [questionId]: value };

      // A1 change -> clear all downstream blocks, including any legacy hidden answers.
      if (questionId === 'A1' && prev.A1 !== value) {
        Object.keys(prev).filter(k =>
          k.startsWith('B') || k.startsWith('C') || k.startsWith('P') ||
          k.startsWith('D') || k.startsWith('E') || k.startsWith('F')
        ).forEach(k => { next[k] = undefined; });
      }

      // B1 change -> clear B2 + all downstream blocks, including any legacy hidden answers.
      if (questionId === 'B1' && prev.B1 !== value) {
        next.B2 = undefined;
        Object.keys(prev).filter(k =>
          k.startsWith('C') || k.startsWith('P') ||
          k.startsWith('D') || k.startsWith('E') || k.startsWith('F')
        ).forEach(k => { next[k] = undefined; });
      }

      // B1 change away from "Intended Use / Indications for Use" -> clear B3
      if (
        questionId === 'B1' &&
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
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BLOCK_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setScreen('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check if current block has required questions answered
  const currentBlockComplete = useMemo(() => {
    if (!currentBlock || currentBlock.id === 'review') return true;
    const questions = currentQuestions;
    const requiredQuestions = questions.filter(q =>
      !q.sectionDivider && !q.skip && q.pathwayCritical
    );
    return requiredQuestions.every(q => isAnsweredValue(answers[q.id]));
  }, [currentBlock, currentQuestions, answers]);

  // Validation state for highlighting missing required fields
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
        value: answers.A1 ? String(answers.A1) : 'Missing',
        tone: answers.A1 ? 'default' : 'warning',
      },
      {
        label: 'Authorization ID',
        value: answers.A1b ? String(answers.A1b) : 'Missing',
        tone: authIdMissing ? 'warning' : 'default',
      },
      {
        label: 'Authorized baseline',
        value: answers.A1c ? String(answers.A1c) : 'Missing',
        tone: baselineMissing ? 'warning' : 'default',
      },
      {
        label: 'Change',
        value: answers.B2 ? String(answers.B2) : answers.B1 ? String(answers.B1) : 'Not yet classified',
        tone: answers.B2 || answers.B1 ? 'info' : 'default',
      },
      {
        label: 'PCCP',
        value: answers.A2 === Answer.Yes ? 'Authorized PCCP present' : answers.A2 === Answer.No ? 'No PCCP authorized' : 'Not yet specified',
        tone: answers.A2 === Answer.Yes ? 'success' : 'default',
      },
    ];
  }, [answers.A1, answers.A1b, answers.A1c, answers.A2, answers.B1, answers.B2]);

  // Clear validation errors when answers change
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  // Navigation with validation gating
  const handleNext = useCallback(() => {
    if (currentBlockIndex < blocks.length - 1) {
      if (currentBlock && currentBlock.id !== 'review' && !currentBlockComplete) {
        const errors: Record<string, boolean> = {};
        currentQuestions
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
  }, [currentBlockIndex, blocks.length, currentBlock, currentBlockComplete, currentQuestions, answers]);

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

  const handleQuickReview = useCallback(() => {
    // Clear session, load SAMPLE_CASE (without meta keys), navigate to assess
    setAnswers({ ...SAMPLE_CASE });
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
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BLOCK_STORAGE_KEY);
    } catch { /* ignore */ }
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
        onQuickReview={handleQuickReview}
        onFullAssessment={handleFullAssessment}
        onResume={handleResume}
        hasSavedSession={hasSavedAnswers()}
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
          getQuestionsForBlock={getQuestionsForBlock}
          onHandoff={() => setScreen('handoff')}
          reviewerNotes={currentReviewerNotes}
          onAddNote={currentAssessmentId ? handleAddNote : undefined}
          onRemoveNote={currentAssessmentId ? handleRemoveNote : undefined}
        />
      );
    }

    // Question blocks with contextual banners
    const blockId = currentBlock.id;

    return (
      <div>
        {/* Block-level contextual banners */}
        {!currentBlockComplete && (
          <div style={bannerStyle.warning}>
            <Icon name="alertCircle" size={15} color="var(--color-warning)" style={{ marginTop: 1 }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning)' }}>
                {currentMissingRequired} required item{currentMissingRequired === 1 ? '' : 's'} still open in this section
              </span>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
                Answer the questions marked <strong>Required</strong> to finalize the pathway logic. Optional fields can still improve review quality and documentation quality.
              </div>
            </div>
          </div>
        )}

        {blockId === 'C' && answers.B3 === Answer.Yes && (
          <div style={bannerStyle.warning}>
            <Icon name="alertCircle" size={15} color="var(--color-warning)" style={{ marginTop: 1 }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning)' }}>
                Intended use change detected
              </span>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
                A new submission is generally required.{' '}
                {derivedState.isPMA
                  ? 'PMA supplement required.'
                  : `New ${derivedState.isDeNovo ? '510(k) or De Novo request' : '510(k)'} required.`}
              </div>
            </div>
          </div>
        )}

        {blockId === 'C' && answers.B3 === Answer.Uncertain && (
          <div style={bannerStyle.warning}>
            <Icon name="alertCircle" size={15} color="var(--color-warning)" style={{ marginTop: 1 }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning)' }}>
                Intended use uncertain — routing conservatively
              </span>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
                Conservatively routed to new submission. Complete the questions below for your change control record.{' '}
                <strong>A Pre-Submission (Q-Sub) is strongly recommended.</strong>
              </div>
            </div>
          </div>
        )}

        {blockId === 'C' && derivedState.isDeNovo && !derivedState.isPMA && answers.B3 !== Answer.Yes && (
          (answers.C0_DN1 === Answer.No || answers.C0_DN1 === Answer.Uncertain ||
           answers.C0_DN2 === Answer.No || answers.C0_DN2 === Answer.Uncertain) ? (
            <div style={bannerStyle.danger}>
              <Icon name="alertCircle" size={15} color="var(--color-danger)" style={{ marginTop: 1 }} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-danger)' }}>
                  De Novo device-type fit concern
                </span>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
                  The modified device may no longer fit within the De Novo classification. An FDA Pre-Submission (Q-Sub) is strongly recommended.
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.55,
            }}>
              <strong>De Novo advisory:</strong> {"For software changes, FDA's 510(k) change guidances are relevant to De Novo-authorized existing devices. For material or borderline changes, an FDA Pre-Submission is recommended."}
            </div>
          )
        )}

        {blockId === 'C' && !derivedState.isPMA && answers.B3 !== Answer.Yes &&
         answers.C1 !== Answer.Yes && answers.C2 !== Answer.Yes &&
         [answers.C3, answers.C4, answers.C5, answers.C6].includes(Answer.Uncertain) && (
          <div style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.55,
          }}>
            {'"Uncertain" answers are conservatively treated as significant. Complete remaining questions for documentation.'}
          </div>
        )}

        {blockId === 'P' && (() => {
          const selType = (answers.B1 && answers.B2) ? changeTaxonomy[answers.B1 as string]?.types?.find((t) => t.name === answers.B2) : null;
          const pccpStatus = selType?.pccp;
          const pccpNote = selType?.pccpNote;
          if (!selType || !pccpStatus) return null;
          const isEligible = pccpStatus === 'TYPICAL' || pccpStatus === 'EXEMPT';
          const isConditional = pccpStatus === 'CONDITIONAL';
          return (
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: isEligible ? 'var(--color-success-bg)' : isConditional ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${isEligible ? 'var(--color-success-border)' : isConditional ? 'var(--color-warning-border)' : 'var(--color-danger-border)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}>
              <Icon
                name={isEligible ? 'check' : 'alertCircle'}
                size={15}
                color={isEligible ? 'var(--color-success)' : isConditional ? 'var(--color-warning)' : 'var(--color-danger)'}
                style={{ marginTop: 1 }}
              />
              <div>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isEligible ? 'var(--color-success)' : isConditional ? 'var(--color-warning)' : 'var(--color-danger)',
                }}>
                  Future PCCP planning fit for {`"${answers.B2 as string}"`}:{' '}
                  {pccpStatus === 'TYPICAL' ? 'Generally suitable if explicitly pre-authorized and bounded'
                    : pccpStatus === 'EXEMPT' ? 'PCCP is usually not the key mechanism when this change truly remains documentation-only'
                    : pccpStatus === 'CONDITIONAL' ? 'Potentially suitable, but only if scope, data, and boundaries are explicitly authorized'
                    : pccpStatus === 'UNLIKELY' ? 'Rarely suitable for future PCCP coverage'
                    : 'Generally outside PCCP scope per current FDA framework'}
                </span>
                {pccpNote && (
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
                    {pccpNote}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {currentQuestions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            value={answers[question.id]}
            onChange={(value) => handleAnswerChange(question.id, value)}
            index={index}
            hasValidationError={Boolean(validationErrors[question.id])}
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
            Complete the required questions in this section to continue.
          </span>
        </div>
      )}
    </Layout>
  );
};
