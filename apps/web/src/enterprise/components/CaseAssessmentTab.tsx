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

const AUTOSAVE_DELAY_MS = 3000;

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

  // Refs hold the latest values for use inside debounced timers and callbacks,
  // avoiding stale-closure bugs where a 3-second-old answer set gets posted.
  const localAnswersRef = useRef<Answers>({});
  const pendingDeltaRef = useRef<Record<string, AnswerValue>>({});
  const expectedUpdatedAtRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const blocks = useMemo(
    () => getBlocks(localAnswers, derivedState),
    [localAnswers, derivedState],
  );
  const provisionalDetermination = useMemo(
    () => computeDetermination(localAnswers),
    [localAnswers],
  );

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
          setConflictMessage(
            'Another save reached the server first. Reconciling and retrying...',
          );
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
          setConflictMessage(
            err instanceof Error ? `Save failed: ${err.message}` : 'Save failed',
          );
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
        for (const k of Object.keys(next)) {
          if (next[k] !== prev[k]) {
            pendingDeltaRef.current[k] = next[k];
          }
        }
        for (const k of Object.keys(prev)) {
          if (!(k in next) && prev[k] !== undefined) {
            pendingDeltaRef.current[k] = undefined;
          }
        }

        localAnswersRef.current = next;
        return next;
      });

      setSyncStatus('editing');
      setConflictMessage(null);

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
      // Best-effort sync flush — fire-and-forget.
      if (Object.keys(pendingDeltaRef.current).length > 0) {
        const payloadDelta = { ...pendingDeltaRef.current };
        pendingDeltaRef.current = {};
        saveAssessment.mutate({
          delta: payloadDelta as Record<string, unknown>,
          expectedUpdatedAt: expectedUpdatedAtRef.current,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Server engine output (authoritative)
  const serverDecision = serverAssessment?.engineOutputJson as Record<string, unknown> | null;

  if (isLoading) {
    return <div style={{ padding: 32, color: '#6b7280' }}>Loading assessment...</div>;
  }

  const assessmentBlocks = blocks.filter((b) => b.id !== 'review');

  const provisionalPathway = provisionalDetermination.pathway;
  const serverPathway = (serverDecision as { pathway?: string } | null)?.pathway ?? null;
  const pathwayMismatch =
    serverPathway !== null && provisionalPathway !== serverPathway && syncStatus !== 'idle';

  const dirty = syncStatus === 'editing' || syncStatus === 'saving' || syncStatus === 'conflict';

  return (
    <div>
      {/* Decision summary bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: pathwayMismatch ? '#fef3c7' : '#f0fdf4',
          borderRadius: 8,
          marginBottom: 20,
          border: pathwayMismatch ? '1px solid #fcd34d' : '1px solid #bbf7d0',
        }}
      >
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>PROVISIONAL: </span>
          <span style={{ fontWeight: 600, color: '#059669' }}>{provisionalPathway}</span>
          {serverPathway && (
            <>
              <span style={{ margin: '0 12px', color: '#d1d5db' }}>|</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>SERVER: </span>
              <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{serverPathway}</span>
            </>
          )}
          {pathwayMismatch && (
            <span style={{ marginLeft: 12, fontSize: 12, color: '#92400e' }}>
              recalculating...
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {syncStatus === 'editing' && (
            <span style={{ fontSize: 12, color: '#d97706' }}>Unsaved changes</span>
          )}
          {syncStatus === 'saving' && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>Saving...</span>
          )}
          {syncStatus === 'conflict' && (
            <span style={{ fontSize: 12, color: '#dc2626' }}>Reconciling...</span>
          )}
          <button
            onClick={handleExplicitSave}
            disabled={saveAssessment.isPending || !dirty}
            className="btn-outline"
            style={{ fontSize: 13, padding: '4px 14px' }}
          >
            Save
          </button>
        </div>
      </div>

      {conflictMessage && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {conflictMessage}
        </div>
      )}

      {/* Completeness summary */}
      {serverAssessment?.completenessStatusJson && (
        <CompleteSummary
          status={serverAssessment.completenessStatusJson as unknown as CompletenessData}
        />
      )}

      {/* Block navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {assessmentBlocks.map((block, idx) => (
          <button
            key={block.id}
            onClick={() => setActiveBlockIndex(idx)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: activeBlockIndex === idx ? 600 : 400,
              background: activeBlockIndex === idx ? '#2563eb' : '#f3f4f6',
              color: activeBlockIndex === idx ? '#fff' : '#374151',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {block.shortLabel}
          </button>
        ))}
      </div>

      {/* Questions */}
      {currentBlock && currentBlock.id !== 'review' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{currentBlock.label}</h3>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button
          onClick={() => setActiveBlockIndex(Math.max(0, activeBlockIndex - 1))}
          disabled={activeBlockIndex === 0}
          className="btn-outline"
        >
          Previous
        </button>
        <button
          onClick={() =>
            setActiveBlockIndex(Math.min(assessmentBlocks.length - 1, activeBlockIndex + 1))
          }
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
  <div
    style={{
      marginBottom: 16,
      padding: '8px 12px',
      background: '#f9fafb',
      borderRadius: 6,
      fontSize: 13,
    }}
  >
    <strong>Completeness:</strong>{' '}
    {status.blocks.map((b) => (
      <span key={b.id} style={{ marginRight: 12 }}>
        {b.label}: {b.answeredRequired}/{b.totalRequired} {b.complete ? '\u2713' : ''}
      </span>
    ))}
  </div>
);
