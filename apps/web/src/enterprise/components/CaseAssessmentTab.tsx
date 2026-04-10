import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAssessment, useSaveAssessment } from '../../api/hooks';
import {
  computeDerivedState,
  computeDetermination,
  getBlocks,
  getBlockFields,
  type Answers,
  type AssessmentField,
} from '@changepath/engine';
import { QuestionCard } from '../../components/QuestionCard';

const AUTOSAVE_DELAY_MS = 3000;

export const CaseAssessmentTab: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { data: serverAssessment, isLoading } = useAssessment(caseId);
  const saveAssessment = useSaveAssessment(caseId);
  const [localAnswers, setLocalAnswers] = useState<Answers>({});
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize from server
  useEffect(() => {
    if (serverAssessment?.answersJson) {
      setLocalAnswers(serverAssessment.answersJson as Answers);
    }
  }, [serverAssessment]);

  // Provisional client-side engine execution
  const derivedState = useMemo(() => computeDerivedState(localAnswers), [localAnswers]);
  const blocks = useMemo(() => getBlocks(localAnswers, derivedState), [localAnswers, derivedState]);
  const provisionalDetermination = useMemo(() => computeDetermination(localAnswers), [localAnswers]);

  const currentBlock = blocks[activeBlockIndex];
  const currentFields = useMemo(() => {
    if (!currentBlock || currentBlock.id === 'review') return [];
    return getBlockFields(currentBlock.id, localAnswers, derivedState);
  }, [currentBlock, localAnswers, derivedState]);

  const handleAnswerChange = useCallback(
    (fieldId: string, value: string | string[] | undefined) => {
      setLocalAnswers((prev) => ({ ...prev, [fieldId]: value }));
      setDirty(true);

      // Autosave after inactivity
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        const updatedAnswers = { ...localAnswers, [fieldId]: value };
        saveAssessment.mutate(updatedAnswers as Record<string, unknown>);
        setDirty(false);
      }, AUTOSAVE_DELAY_MS);
    },
    [localAnswers, saveAssessment],
  );

  const handleExplicitSave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    saveAssessment.mutate(localAnswers as Record<string, unknown>);
    setDirty(false);
  }, [localAnswers, saveAssessment]);

  // Server engine output (authoritative)
  const serverDecision = serverAssessment?.engineOutputJson as Record<string, unknown> | null;

  if (isLoading) {
    return <div style={{ padding: 32, color: '#6b7280' }}>Loading assessment...</div>;
  }

  const assessmentBlocks = blocks.filter((b) => b.id !== 'review');

  return (
    <div>
      {/* Decision summary bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#f0fdf4',
          borderRadius: 8,
          marginBottom: 20,
          border: '1px solid #bbf7d0',
        }}
      >
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>PROVISIONAL: </span>
          <span style={{ fontWeight: 600, color: '#059669' }}>{provisionalDetermination.pathway}</span>
          {serverDecision && (
            <>
              <span style={{ margin: '0 12px', color: '#d1d5db' }}>|</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>SERVER: </span>
              <span style={{ fontWeight: 600, color: '#1d4ed8' }}>
                {(serverDecision as { pathway?: string }).pathway ?? '—'}
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {dirty && <span style={{ fontSize: 12, color: '#d97706' }}>Unsaved changes</span>}
          {saveAssessment.isPending && <span style={{ fontSize: 12, color: '#6b7280' }}>Saving...</span>}
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

      {/* Completeness summary */}
      {serverAssessment?.completenessStatusJson && (
        <CompleteSummary status={serverAssessment.completenessStatusJson as unknown as CompletenessData} />
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
  blocks: Array<{ id: string; label: string; answeredRequired: number; totalRequired: number; complete: boolean }>;
  overallComplete: boolean;
}

const CompleteSummary: React.FC<{ status: CompletenessData }> = ({ status }) => (
  <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, fontSize: 13 }}>
    <strong>Completeness:</strong>{' '}
    {status.blocks.map((b) => (
      <span key={b.id} style={{ marginRight: 12 }}>
        {b.label}: {b.answeredRequired}/{b.totalRequired} {b.complete ? '\u2713' : ''}
      </span>
    ))}
  </div>
);
