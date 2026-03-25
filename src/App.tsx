import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layout } from './components/Layout';
import { GatePage } from './components/GatePage';
import { DashboardPage } from './components/DashboardPage';
import { QuestionCard } from './components/QuestionCard';
import { ReviewPanel } from './components/ReviewPanel';
import { Icon } from './components/Icon';
import { SAMPLE_CASE } from './sampleCase';
import {
  getBlocks,
  getQuestions,
  computeDerivedState,
  computeDetermination,
  Answer,
  type Answers,
  type Block,
  type Question,
} from './lib/assessment-engine';

const STORAGE_KEY = 'regassess-answers';
const BLOCK_STORAGE_KEY = 'regassess-block-index';

type Screen = 'gate' | 'dashboard' | 'assess';

const isAnsweredValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return value !== undefined && value !== null;
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
  const [screen, setScreen] = useState<Screen>('gate');
  const [answers, setAnswers] = useState<Answers>(loadSavedAnswers);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(loadSavedBlockIndex);

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

  const currentBlock = blocks[currentBlockIndex];
  const currentQuestions = currentBlock ? getQuestionsForBlock(currentBlock.id) : [];

  // Compute determination
  const determination = useMemo(() => computeDetermination(answers), [answers]);

  // Calculate answered counts per block
  const answeredCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    blocks.forEach(block => {
      if (block.id === 'review') {
        counts[block.id] = 0;
        return;
      }
      const questions = getQuestionsForBlock(block.id);
      counts[block.id] = questions.filter(q =>
        !q.sectionDivider && !q.skip && isAnsweredValue(answers[q.id])
      ).length;
    });
    return counts;
  }, [blocks, answers, getQuestionsForBlock]);

  // Calculate total questions per block
  const totalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    blocks.forEach(block => {
      if (block.id === 'review') {
        counts[block.id] = 0;
        return;
      }
      const questions = getQuestionsForBlock(block.id);
      counts[block.id] = questions.filter(q => !q.sectionDivider && !q.skip).length;
    });
    return counts;
  }, [blocks, getQuestionsForBlock]);

  // Track completed blocks
  const completedBlocks = useMemo(() => {
    const completed = new Set<string>();
    blocks.forEach((block, index) => {
      if (index < currentBlockIndex) {
        completed.add(block.id);
      }
    });
    return completed;
  }, [blocks, currentBlockIndex]);

  // Handle answer change with cascade clearing (matches original setAnswer logic)
  const handleAnswerChange = useCallback((questionId: string, value: any) => {
    setAnswers(prev => {
      const next: Answers = { ...prev, [questionId]: value };

      // A1 change -> clear all downstream (B, C, P, D, E, F)
      if (questionId === 'A1' && prev.A1 !== value) {
        Object.keys(prev).filter(k =>
          k.startsWith('B') || k.startsWith('C') || k.startsWith('P') ||
          k.startsWith('D') || k.startsWith('E') || k.startsWith('F')
        ).forEach(k => { next[k] = undefined; });
      }

      // A3 change -> clear EU-specific and F-block keys
      if (questionId === 'A3') {
        const prevMarkets = (prev.A3 as string[]) || [];
        const nextMarkets = (value as string[]) || [];
        if (prevMarkets.includes('EU') && !nextMarkets.includes('EU')) {
          ['A4', 'A5', 'C8', 'C8b', 'C8c', 'C9', 'C9b',
           'C_PMA5', 'C_PMA6', 'C_PMA6b', 'D9', 'F1',
          ].forEach(k => { next[k] = undefined; });
        }
        if (
          prevMarkets.length !== nextMarkets.length ||
          !prevMarkets.every((m: string) => nextMarkets.includes(m))
        ) {
          Object.keys(prev).filter(k => k.startsWith('F')).forEach(k => { next[k] = undefined; });
        }
      }

      // B1 change -> clear B2 + all downstream (C, P, D, E, F)
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

  // --- Dashboard actions ---

  const handleQuickReview = useCallback(() => {
    // Clear session, load SAMPLE_CASE (without meta keys), navigate to assess
    setAnswers({ ...SAMPLE_CASE });
    setCurrentBlockIndex(0);
    setValidationErrors({});
    setScreen('assess');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleFullAssessment = useCallback(() => {
    setAnswers({});
    setCurrentBlockIndex(0);
    setValidationErrors({});
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

  // --- Gate page ---
  if (screen === 'gate') {
    return <GatePage onEnter={() => setScreen('dashboard')} />;
  }

  // --- Dashboard page ---
  if (screen === 'dashboard') {
    return (
      <DashboardPage
        onQuickReview={handleQuickReview}
        onFullAssessment={handleFullAssessment}
        onResume={handleResume}
        hasSavedSession={hasSavedAnswers()}
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
          pathway={determination.pathway}
          determination={determination}
          answers={answers}
          blocks={blocks}
          getQuestionsForBlock={getQuestionsForBlock}
          onEditBlock={handleBlockSelect}
        />
      );
    }

    // Question blocks
    return (
      <div>
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
      onReset={handleReset}
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

          {/* Next button */}
          {currentBlockIndex < blocks.length - 1 ? (
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
              {currentBlock?.id === 'review' ? 'Finish' : 'Continue'}
              <Icon name="arrow" size={16} color="#fff" />
            </button>
          ) : (
            <button
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-success)',
                border: 'none',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon name="printer" size={16} color="#fff" />
              Print Report
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
