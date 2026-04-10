import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { isAnsweredValue, type Answers, type AssessmentField, type Block } from '../lib/assessment-engine';
import { scrollToTop } from '../lib/utils';

export const getPathwayCriticalFields = (fields: AssessmentField[]): AssessmentField[] =>
  fields.filter((field) => !field.sectionDivider && !field.skip && field.pathwayCritical);

export const buildBlockValidationErrors = (answers: Answers, fields: AssessmentField[]): Record<string, boolean> =>
  getPathwayCriticalFields(fields).reduce<Record<string, boolean>>((errors, field) => {
    if (!isAnsweredValue(answers[field.id])) {
      errors[field.id] = true;
    }
    return errors;
  }, {});

export const isBlockPathwayComplete = (
  block: Block | undefined,
  fields: AssessmentField[],
  answers: Answers,
): boolean => {
  if (!block || block.id === 'review') return true;
  return getPathwayCriticalFields(fields).every((field) => isAnsweredValue(answers[field.id]));
};

export interface UseAssessmentFlowOptions {
  answers: Answers;
  blocks: Block[];
  currentBlockIndex: number;
  getFieldsForBlock: (blockId: string) => AssessmentField[];
  requiredAnsweredCounts: Record<string, number>;
  requiredCounts: Record<string, number>;
  setCurrentBlockIndex: Dispatch<SetStateAction<number>>;
  setValidationErrors: Dispatch<SetStateAction<Record<string, boolean>>>;
  onExitAssessment: () => void;
}

export interface AssessmentFlowState {
  currentBlock: Block | undefined;
  currentBlockFields: AssessmentField[];
  currentBlockComplete: boolean;
  currentMissingRequired: number;
  handlePrevious: () => void;
  handleNext: () => void;
  handleBlockSelect: (index: number) => void;
}

export function useAssessmentFlow({
  answers,
  blocks,
  currentBlockIndex,
  getFieldsForBlock,
  requiredAnsweredCounts,
  requiredCounts,
  setCurrentBlockIndex,
  setValidationErrors,
  onExitAssessment,
}: UseAssessmentFlowOptions): AssessmentFlowState {
  useEffect(() => {
    if (currentBlockIndex > blocks.length - 1) {
      setCurrentBlockIndex(Math.max(0, blocks.length - 1));
    }
  }, [blocks.length, currentBlockIndex, setCurrentBlockIndex]);

  const currentBlock = blocks[currentBlockIndex];
  const currentBlockFields = useMemo(
    () => (currentBlock ? getFieldsForBlock(currentBlock.id) : []),
    [currentBlock, getFieldsForBlock],
  );

  const currentBlockComplete = useMemo(
    () => isBlockPathwayComplete(currentBlock, currentBlockFields, answers),
    [answers, currentBlock, currentBlockFields],
  );

  const currentMissingRequired = useMemo(() => {
    if (!currentBlock || currentBlock.id === 'review') return 0;
    return Math.max(0, (requiredCounts[currentBlock.id] || 0) - (requiredAnsweredCounts[currentBlock.id] || 0));
  }, [currentBlock, requiredCounts, requiredAnsweredCounts]);

  const handlePrevious = useCallback(() => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
      scrollToTop();
      return;
    }

    onExitAssessment();
  }, [currentBlockIndex, onExitAssessment, setCurrentBlockIndex]);

  const handleNext = useCallback(() => {
    if (currentBlockIndex >= blocks.length - 1) return;

    if (currentBlock && currentBlock.id !== 'review' && !currentBlockComplete) {
      setValidationErrors(buildBlockValidationErrors(answers, currentBlockFields));
      return;
    }

    setCurrentBlockIndex(currentBlockIndex + 1);
    scrollToTop();
  }, [
    answers,
    blocks.length,
    currentBlock,
    currentBlockComplete,
    currentBlockFields,
    currentBlockIndex,
    setCurrentBlockIndex,
    setValidationErrors,
  ]);

  const handleBlockSelect = useCallback(
    (index: number) => {
      setCurrentBlockIndex(index);
      scrollToTop();
    },
    [setCurrentBlockIndex],
  );

  return {
    currentBlock,
    currentBlockFields,
    currentBlockComplete,
    currentMissingRequired,
    handlePrevious,
    handleNext,
    handleBlockSelect,
  };
}
