import { useCallback, useEffect, useMemo, useState } from 'react';
import { assessmentStore, type SavedAssessment } from '../lib/assessment-store';
import { buildAssessmentName } from '../lib/assessment-metadata';
import { storage } from '../lib/storage';
import type { Answers } from '../lib/assessment-engine';
import { SAMPLE_CASES_BY_ID } from '../sample-cases';

export type Screen = 'dashboard' | 'assess' | 'feedback' | 'handoff';
type WorkspaceSource = 'draft' | 'library' | 'sample';

interface DraftSnapshot {
  answers: Answers;
  blockIndex: number;
  hasSavedDraft: boolean;
}

const scrollToTop = () => {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

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
  activeSampleCaseId: string | null;
  currentAssessmentId: string | null;
  savedAssessments: SavedAssessment[];
  validationErrors: Record<string, boolean>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  hasSavedSession: boolean;
  isViewingSample: boolean;
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
  const [activeSampleCaseId, setActiveSampleCaseId] = useState<string | null>(null);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>(() => assessmentStore.list());
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [workspaceSource, setWorkspaceSource] = useState<WorkspaceSource>('draft');
  const [hasSavedDraft, setHasSavedDraft] = useState(initialDraftSnapshot.hasSavedDraft);
  const isViewingSample = workspaceSource === 'sample';

  const refreshSavedAssessments = useCallback(() => {
    setSavedAssessments(assessmentStore.list());
  }, []);

  useEffect(() => {
    if (workspaceSource !== 'draft') return;

    if (Object.keys(answers).length === 0) {
      storage.clearSession();
      setHasSavedDraft(false);
      return;
    }

    storage.saveAnswers(answers);
    storage.saveBlockIndex(currentBlockIndex);
    setHasSavedDraft(true);
  }, [answers, currentBlockIndex, workspaceSource]);

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
    setActiveSampleCaseId(null);
    setScreen('dashboard');
    scrollToTop();
  }, [restoreDraftSnapshot, workspaceSource]);

  const handleLoadAssessment = useCallback((id: string) => {
    const assessment = assessmentStore.get(id);
    if (!assessment) return;

    setAnswers(assessment.answers);
    setCurrentBlockIndex(assessment.blockIndex);
    setCurrentAssessmentId(assessment.id);
    setActiveSampleCaseId(null);
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
      setActiveSampleCaseId(null);
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
    setActiveSampleCaseId(sampleCaseId);
    setWorkspaceSource('sample');
    setScreen('assess');
    scrollToTop();
  }, []);

  const handleFullAssessment = useCallback(() => {
    setAnswers({});
    setCurrentBlockIndex(0);
    setValidationErrors({});
    setCurrentAssessmentId(null);
    setActiveSampleCaseId(null);
    setWorkspaceSource('draft');
    setHasSavedDraft(false);
    storage.clearSession();
    setScreen('assess');
    scrollToTop();
  }, []);

  const handleResume = useCallback(() => {
    restoreDraftSnapshot();
    setCurrentAssessmentId(null);
    setActiveSampleCaseId(null);
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
    activeSampleCaseId,
    currentAssessmentId,
    savedAssessments,
    validationErrors,
    setValidationErrors,
    hasSavedSession,
    isViewingSample,
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
