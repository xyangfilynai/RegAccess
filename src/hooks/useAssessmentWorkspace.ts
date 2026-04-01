import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assessmentStore, type SavedAssessment } from '../lib/assessment-store';
import { buildAssessmentName } from '../lib/assessment-metadata';
import { storage } from '../lib/storage';
import type { Answers } from '../lib/assessment-engine';
import { SAMPLE_CASES_BY_ID } from '../sample-cases';
import { scrollToTop } from '../lib/utils';

export type Screen = 'dashboard' | 'assess' | 'handoff';
type WorkspaceSource = 'draft' | 'library' | 'sample';

interface DraftSnapshot {
  answers: Answers;
  blockIndex: number;
  hasSavedDraft: boolean;
}

const loadDraftSnapshot = (): DraftSnapshot => ({
  answers: storage.loadAnswers(),
  blockIndex: storage.loadBlockIndex(),
  hasSavedDraft: storage.hasSavedAnswers(),
});

export interface AssessmentWorkspace {
  screen: Screen;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  currentBlockIndex: number;
  setCurrentBlockIndex: React.Dispatch<React.SetStateAction<number>>;
  currentAssessmentId: string | null;
  savedAssessments: SavedAssessment[];
  validationErrors: Record<string, boolean>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  hasSavedSession: boolean;
  currentReviewerNotes: SavedAssessment['reviewerNotes'];
  handleReset: () => void;
  handleLoadAssessment: (id: string) => void;
  handleDuplicateAssessment: (id: string) => void;
  handleDeleteAssessment: (id: string) => void;
  handleAddNote: (author: string, text: string) => void;
  handleRemoveNote: (noteId: string) => void;
  handleSaveAssessment: (lastPathway: string) => SavedAssessment | null;
  handleHome: () => void;
  handleOpenSampleCase: (sampleCaseId: string) => void;
  handleFullAssessment: () => void;
  handleResume: () => void;
}

export function useAssessmentWorkspace(): AssessmentWorkspace {
  const initialDraftSnapshot = useMemo(() => loadDraftSnapshot(), []);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [answers, setAnswers] = useState<Answers>(initialDraftSnapshot.answers);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(initialDraftSnapshot.blockIndex);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>(() => assessmentStore.list());
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [workspaceSource, setWorkspaceSource] = useState<WorkspaceSource>('draft');
  const [hasSavedDraft, setHasSavedDraft] = useState(initialDraftSnapshot.hasSavedDraft);

  const refreshSavedAssessments = useCallback(() => {
    setSavedAssessments(assessmentStore.list());
  }, []);

  const pendingSaveRef = useRef<{ answers: Answers; blockIndex: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingDraftSave = useCallback(() => {
    if (!pendingSaveRef.current) return;
    storage.saveAnswers(pendingSaveRef.current.answers);
    storage.saveBlockIndex(pendingSaveRef.current.blockIndex);
    pendingSaveRef.current = null;
  }, []);

  useEffect(() => {
    if (workspaceSource !== 'draft') {
      // Cancel any pending draft save when leaving draft mode
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      flushPendingDraftSave();
      return;
    }

    if (Object.keys(answers).length === 0) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      pendingSaveRef.current = null;
      storage.clearSession();
      setHasSavedDraft(false);
      return;
    }

    setHasSavedDraft(true);
    pendingSaveRef.current = { answers, blockIndex: currentBlockIndex };

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      flushPendingDraftSave();
      saveTimerRef.current = null;
    }, 500);
  }, [answers, currentBlockIndex, flushPendingDraftSave, workspaceSource]);

  // Flush any pending debounced save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      flushPendingDraftSave();
    };
  }, [flushPendingDraftSave]);

  useEffect(() => {
    setValidationErrors((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  }, [answers]);

  const currentSavedAssessment = useMemo(
    () => savedAssessments.find((assessment) => assessment.id === currentAssessmentId) || null,
    [currentAssessmentId, savedAssessments],
  );

  const restoreDraftSnapshot = useCallback(() => {
    const snapshot = loadDraftSnapshot();
    setAnswers(snapshot.answers);
    setCurrentBlockIndex(snapshot.blockIndex);
    setHasSavedDraft(snapshot.hasSavedDraft);
    setWorkspaceSource('draft');
  }, []);

  const currentReviewerNotes = currentSavedAssessment?.reviewerNotes || [];
  const hasSavedSession = hasSavedDraft;

  const handleReset = useCallback(() => {
    if (workspaceSource === 'draft') {
      setAnswers({});
      setCurrentBlockIndex(0);
      setHasSavedDraft(false);
      storage.clearSession();
    } else {
      restoreDraftSnapshot();
    }
    setCurrentAssessmentId(null);
    setScreen('dashboard');
    scrollToTop();
  }, [restoreDraftSnapshot, workspaceSource]);

  const handleLoadAssessment = useCallback((id: string) => {
    const assessment = assessmentStore.get(id);
    if (!assessment) return;

    setAnswers(assessment.answers);
    setCurrentBlockIndex(assessment.blockIndex);
    setCurrentAssessmentId(assessment.id);
    setWorkspaceSource('library');
    setValidationErrors({});
    setScreen('assess');
    scrollToTop();
  }, []);

  const handleDuplicateAssessment = useCallback(
    (id: string) => {
      assessmentStore.duplicate(id);
      refreshSavedAssessments();
    },
    [refreshSavedAssessments],
  );

  const handleDeleteAssessment = useCallback(
    (id: string) => {
      assessmentStore.delete(id);
      if (currentAssessmentId === id) {
        setCurrentAssessmentId(null);
      }
      refreshSavedAssessments();
    },
    [currentAssessmentId, refreshSavedAssessments],
  );

  const handleAddNote = useCallback(
    (author: string, text: string) => {
      if (!currentAssessmentId) return;
      assessmentStore.addNote(currentAssessmentId, author, text);
      refreshSavedAssessments();
    },
    [currentAssessmentId, refreshSavedAssessments],
  );

  const handleRemoveNote = useCallback(
    (noteId: string) => {
      if (!currentAssessmentId) return;
      assessmentStore.removeNote(currentAssessmentId, noteId);
      refreshSavedAssessments();
    },
    [currentAssessmentId, refreshSavedAssessments],
  );

  const handleSaveAssessment = useCallback(
    (lastPathway: string): SavedAssessment | null => {
      if (Object.keys(answers).length === 0) return null;

      const saved = assessmentStore.save({
        id: currentAssessmentId || undefined,
        name: currentSavedAssessment?.name || buildAssessmentName(answers),
        answers,
        blockIndex: currentBlockIndex,
        lastPathway,
      });

      setCurrentAssessmentId(saved.id);
      refreshSavedAssessments();
      return saved;
    },
    [answers, currentAssessmentId, currentBlockIndex, currentSavedAssessment?.name, refreshSavedAssessments],
  );

  const handleHome = useCallback(() => {
    if (workspaceSource !== 'draft') {
      restoreDraftSnapshot();
      setCurrentAssessmentId(null);
    }
    setScreen('dashboard');
    scrollToTop();
  }, [restoreDraftSnapshot, workspaceSource]);

  const handleOpenSampleCase = useCallback((sampleCaseId: string) => {
    const sampleCase = SAMPLE_CASES_BY_ID[sampleCaseId];
    if (!sampleCase) return;

    setAnswers({ ...sampleCase.answers });
    setCurrentBlockIndex(0);
    setValidationErrors({});
    setCurrentAssessmentId(null);
    setWorkspaceSource('sample');
    setScreen('assess');
    scrollToTop();
  }, []);

  const handleFullAssessment = useCallback(() => {
    setAnswers({});
    setCurrentBlockIndex(0);
    setValidationErrors({});
    setCurrentAssessmentId(null);
    setWorkspaceSource('draft');
    setHasSavedDraft(false);
    storage.clearSession();
    setScreen('assess');
    scrollToTop();
  }, []);

  const handleResume = useCallback(() => {
    restoreDraftSnapshot();
    setCurrentAssessmentId(null);
    setScreen('assess');
    scrollToTop();
  }, [restoreDraftSnapshot]);

  return {
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
  };
}
