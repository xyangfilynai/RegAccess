import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useAssessment,
  useSaveAssessment,
  isAssessmentConflict,
  type AssessmentResponse,
  type SaveAssessmentPayload,
} from '../../api/hooks';
import {
  computeDerivedState,
  computeDetermination,
  getBlocks,
  getBlockFields,
  applyCascadeClearing,
  type Answers,
  type AnswerValue,
  type AssessmentField,
} from '@changepath/engine';
import { QuestionCard } from '../../components/QuestionCard';

const AUTOSAVE_DELAY_MS = 30_000;

/**
 * Reconciliation state machine — describes the relationship between
 * the local in-progress answers and the server-authoritative state.
 *
 *   idle         → no pending edits, in sync with server
 *   editing      → user has unsaved local edits
 *   saving       → an autosave/explicit save is in flight
 *   recalculating → server result arrived but client is still recomputing
 *   conflict     → server rejected save (409) — needs reconciliation
 */
type SyncStatus = 'idle' | 'editing' | 'saving' | 'conflict';

export const CaseAssessmentTab: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { data: serverAssessment, isLoading } = useAssessment(caseId);
  const saveAssessment = useSaveAssessment(caseId);

  const [localAnswers, setLocalAnswers] = useState<Answers>({});
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [reconciliationMessage, setReconciliationMessage] = useState<string | null>(null);

  // Refs hold the latest values for use inside debounced timers and callbacks,
  // avoiding stale-closure bugs where a 3-second-old answer set gets posted.
  const localAnswersRef = useRef<Answers>({});
  const pendingDeltaRef = useRef<Record<string, AnswerValue>>({});
  const expectedUpdatedAtRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconciliationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in lockstep with state.
  useEffect(() => {
    localAnswersRef.current = localAnswers;
  }, [localAnswers]);

  // Initialize local state from the server snapshot — but only the FIRST time
  // we see a server payload, or after an explicit reconciliation. Without this
  // guard, every React Query refetch (or save success) would silently wipe
  // in-progress edits.
  useEffect(() => {
    if (!serverAssessment) return;
    if (hasInitializedRef.current) {
      // Server replied to a save we initiated — refresh the optimistic-lock
      // token but do NOT replace local answers (the server already has them).
      if (serverAssessment.updatedAt) {
        expectedUpdatedAtRef.current = serverAssessment.updatedAt;
      }
      return;
    }
    hasInitializedRef.current = true;
    const initial = (serverAssessment.answersJson ?? {}) as Answers;
    setLocalAnswers(initial);
    localAnswersRef.current = initial;
    expectedUpdatedAtRef.current = serverAssessment.updatedAt ?? null;
  }, [serverAssessment]);

  // Provisional client-side engine execution (always runs on local state).
  const derivedState = useMemo(() => computeDerivedState(localAnswers), [localAnswers]);
  const blocks = useMemo(() => getBlocks(localAnswers, derivedState), [localAnswers, derivedState]);
  const provisionalDetermination = useMemo(() => computeDetermination(localAnswers), [localAnswers]);

  // Keep refs in sync so flushSave can read the latest memoized values
  // without redundantly re-running the engine.
  const derivedStateRef = useRef(derivedState);
  derivedStateRef.current = derivedState;
  const determinationRef = useRef(provisionalDetermination);
  determinationRef.current = provisionalDetermination;

  const currentBlock = blocks[activeBlockIndex];
  const currentFields = useMemo(() => {
    if (!currentBlock || currentBlock.id === 'review') return [];
    return getBlockFields(currentBlock.id, localAnswers, derivedState);
  }, [currentBlock, localAnswers, derivedState]);

  const flushSave = useCallback(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }

    const delta = pendingDeltaRef.current;
    if (Object.keys(delta).length === 0) return;

    // Snapshot the delta and clear the pending buffer BEFORE the network call,
    // so subsequent edits accumulate into a fresh delta rather than the one
    // currently being sent.
    const payloadDelta = { ...delta };
    pendingDeltaRef.current = {};

    const payload: SaveAssessmentPayload = {
      delta: payloadDelta as Record<string, unknown>,
      clientDerivedStateJson: derivedStateRef.current as Record<string, unknown>,
      clientEngineOutputJson: determinationRef.current as unknown as Record<string, unknown>,
      expectedUpdatedAt: expectedUpdatedAtRef.current,
    };

    setSyncStatus('saving');

    saveAssessment.mutate(payload, {
      onSuccess: (data: AssessmentResponse) => {
        // Adopt the server's authoritative answer set + engine output.
        // The server may have applied cascade clearing we didn't, so we
        // need to merge: server answers win for everything the user is
        // not currently editing.
        const serverAnswers = (data.answersJson ?? {}) as Answers;
        const stillPending = pendingDeltaRef.current;
        if (Object.keys(stillPending).length === 0) {
          setLocalAnswers(serverAnswers);
          localAnswersRef.current = serverAnswers;
          setSyncStatus('idle');
        } else {
          // User typed more while save was in flight — keep their unsaved
          // edits on top of the server snapshot and remain in editing state.
          const merged: Answers = { ...serverAnswers, ...stillPending };
          setLocalAnswers(merged);
          localAnswersRef.current = merged;
          setSyncStatus('editing');
          // Schedule another save for the new edits.
          if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
          autosaveTimer.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
        }
        if (data.updatedAt) {
          expectedUpdatedAtRef.current = data.updatedAt;
        }
        const clientPathway = (payload.clientEngineOutputJson as { pathway?: string } | undefined)?.pathway ?? null;
        const nextServerPathway = (data.engineOutputJson as { pathway?: string } | null)?.pathway ?? null;
        if (clientPathway !== null && nextServerPathway !== null && clientPathway !== nextServerPathway) {
          setReconciliationMessage(
            'Server recalculated a different authoritative determination. The local view has been updated.',
          );
          if (reconciliationTimer.current) {
            clearTimeout(reconciliationTimer.current);
          }
          reconciliationTimer.current = setTimeout(() => {
            setReconciliationMessage(null);
          }, 2500);
        }
        setConflictMessage(null);
      },
      onError: (err: unknown) => {
        if (isAssessmentConflict(err)) {
          // Another save landed first. Reapply our delta on top of the
          // newest server state by sending it as a fresh delta with the
          // updated `expectedUpdatedAt`. We do this by re-queueing it.
          for (const [k, v] of Object.entries(payloadDelta)) {
            // Don't clobber any field the user has since edited again.
            if (!(k in pendingDeltaRef.current)) {
              pendingDeltaRef.current[k] = v;
            }
          }
          expectedUpdatedAtRef.current = err.conflict.serverUpdatedAt;
          setSyncStatus('conflict');
          setConflictMessage('Another save reached the server first. Reconciling and retrying...');
          // Retry on the next tick so React Query has settled.
          setTimeout(flushSave, 0);
        } else {
          // Generic error — restore the delta so the user doesn't lose work.
          for (const [k, v] of Object.entries(payloadDelta)) {
            if (!(k in pendingDeltaRef.current)) {
              pendingDeltaRef.current[k] = v;
            }
          }
          setSyncStatus('editing');
          setConflictMessage(err instanceof Error ? `Save failed: ${err.message}` : 'Save failed');
        }
      },
    });
  }, [saveAssessment]);

  const handleAnswerChange = useCallback(
    (fieldId: string, value: AnswerValue) => {
      // Use the functional updater so we always work from the latest state,
      // not a value captured when this callback was created.
      setLocalAnswers((prev) => {
        const next = applyCascadeClearing(fieldId, value, prev);

        // Record every field that changed in the pending delta. Cascade
        // clearing may zero out many downstream fields — they all need to
        // be in the delta so the server clears them too.
        // Single pass: scan prev keys for changes and removals, then check
        // for any keys that are new in next (not in prev).
        for (const k of Object.keys(prev)) {
          if (k in next) {
            if (next[k] !== prev[k]) {
              pendingDeltaRef.current[k] = next[k];
            }
          } else if (prev[k] !== undefined) {
            pendingDeltaRef.current[k] = undefined;
          }
        }
        for (const k of Object.keys(next)) {
          if (!(k in prev)) {
            pendingDeltaRef.current[k] = next[k];
          }
        }

        localAnswersRef.current = next;
        return next;
      });

      setSyncStatus('editing');
      setConflictMessage(null);
      setReconciliationMessage(null);

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
    },
    [flushSave],
  );

  const handleExplicitSave = useCallback(() => {
    flushSave();
  }, [flushSave]);

  // Flush on unmount so we don't lose pending edits when navigating away.
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
      if (reconciliationTimer.current) {
        clearTimeout(reconciliationTimer.current);
        reconciliationTimer.current = null;
      }
      // Best-effort sync flush — fire-and-forget.
      if (Object.keys(pendingDeltaRef.current).length > 0) {
        const payloadDelta = { ...pendingDeltaRef.current };
        pendingDeltaRef.current = {};
        saveAssessment.mutate({
          delta: payloadDelta as Record<string, unknown>,
          clientDerivedStateJson: derivedStateRef.current as Record<string, unknown>,
          clientEngineOutputJson: determinationRef.current as unknown as Record<string, unknown>,
          expectedUpdatedAt: expectedUpdatedAtRef.current,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Server engine output (authoritative)
  const serverDecision = serverAssessment?.engineOutputJson as Record<string, unknown> | null;

  if (isLoading) {
    return <div className="loading-text">Loading assessment...</div>;
  }

  const assessmentBlocks = blocks.filter((b) => b.id !== 'review');

  const provisionalPathway = provisionalDetermination.pathway;
  const serverPathway = (serverDecision as { pathway?: string } | null)?.pathway ?? null;
  const showProvisionalLabel = syncStatus !== 'idle' || !serverPathway;
  const pathwayMismatch =
    (serverPathway !== null && provisionalPathway !== serverPathway && syncStatus !== 'idle') ||
    reconciliationMessage !== null;

  const dirty = syncStatus === 'editing' || syncStatus === 'saving' || syncStatus === 'conflict';

  return (
    <div>
      {/* Decision summary bar */}
      <div className={`decision-bar${pathwayMismatch ? ' decision-bar--mismatch' : ''}`}>
        <div>
          <span className="decision-label">{showProvisionalLabel ? 'PROVISIONAL: ' : 'AUTHORITATIVE: '}</span>
          <span className={showProvisionalLabel ? 'pathway-value--provisional' : 'pathway-value--authoritative'}>
            {showProvisionalLabel ? provisionalPathway : serverPathway}
          </span>
          {serverPathway && showProvisionalLabel && (
            <>
              <span className="pathway-separator">|</span>
              <span className="decision-label">SERVER: </span>
              <span className="pathway-value--authoritative">{serverPathway}</span>
            </>
          )}
          {pathwayMismatch && <span className="recalculating-hint">recalculating...</span>}
        </div>
        <div className="decision-bar-actions">
          {syncStatus === 'editing' && <span className="sync-label sync-label--editing">Unsaved changes</span>}
          {syncStatus === 'saving' && <span className="sync-label sync-label--saving">Saving...</span>}
          {syncStatus === 'conflict' && <span className="sync-label sync-label--conflict">Reconciling...</span>}
          <button
            onClick={handleExplicitSave}
            disabled={saveAssessment.isPending || !dirty}
            className="btn-outline btn-outline--compact"
          >
            Save
          </button>
        </div>
      </div>

      {conflictMessage && <div className="alert-banner alert-banner--error">{conflictMessage}</div>}

      {reconciliationMessage && <div className="alert-banner alert-banner--warning">{reconciliationMessage}</div>}

      {/* Completeness summary */}
      {serverAssessment?.completenessStatusJson && (
        <CompleteSummary status={serverAssessment.completenessStatusJson as unknown as CompletenessData} />
      )}

      {/* Block navigation */}
      <div className="block-nav">
        {assessmentBlocks.map((block, idx) => (
          <button
            key={block.id}
            onClick={() => setActiveBlockIndex(idx)}
            className={`block-nav-btn${activeBlockIndex === idx ? ' block-nav-btn--active' : ''}`}
          >
            {block.shortLabel}
          </button>
        ))}
      </div>

      {/* Questions */}
      {currentBlock && currentBlock.id !== 'review' && (
        <div>
          <h3 className="section-title-sm">{currentBlock.label}</h3>
          {currentFields.map((field: AssessmentField, index: number) => (
            <QuestionCard
              key={field.id}
              field={field}
              value={localAnswers[field.id]}
              onChange={(value) => handleAnswerChange(field.id, value)}
              index={index}
              hasValidationError={false}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="assessment-nav-footer">
        <button
          onClick={() => setActiveBlockIndex(Math.max(0, activeBlockIndex - 1))}
          disabled={activeBlockIndex === 0}
          className="btn-outline"
        >
          Previous
        </button>
        <button
          onClick={() => setActiveBlockIndex(Math.min(assessmentBlocks.length - 1, activeBlockIndex + 1))}
          disabled={activeBlockIndex >= assessmentBlocks.length - 1}
          className="btn-continue"
        >
          Next
        </button>
      </div>
    </div>
  );
};

interface CompletenessData {
  blocks: Array<{
    id: string;
    label: string;
    answeredRequired: number;
    totalRequired: number;
    complete: boolean;
  }>;
  overallComplete: boolean;
}

const CompleteSummary: React.FC<{ status: CompletenessData }> = ({ status }) => (
  <div className="completeness-summary">
    <strong>Completeness:</strong>{' '}
    {status.blocks.map((b) => (
      <span key={b.id} className="completeness-block">
        {b.label}: {b.answeredRequired}/{b.totalRequired} {b.complete ? '\u2713' : ''}
      </span>
    ))}
  </div>
);
