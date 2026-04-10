/**
 * Computes per-block and overall progress counts for the assessment.
 */

import { useMemo } from 'react';
import { isAnsweredValue, type Answers, type AssessmentField, type Block } from '../lib/assessment-engine';

export interface ProgressCounts {
  answeredCounts: Record<string, number>;
  totalCounts: Record<string, number>;
  requiredAnsweredCounts: Record<string, number>;
  requiredCounts: Record<string, number>;
  overallAnswered: number;
  overallTotal: number;
  overallRequiredAnswered: number;
  overallRequiredTotal: number;
}

/**
 * Pure function: computes progress counts from blocks and answers.
 */
export function computeProgressCounts(
  blocks: Block[],
  answers: Answers,
  getFieldsForBlock: (blockId: string) => AssessmentField[],
): ProgressCounts {
  const answered: Record<string, number> = {};
  const total: Record<string, number> = {};
  const requiredAnswered: Record<string, number> = {};
  const requiredTotal: Record<string, number> = {};
  let overallAnsweredCount = 0;
  let overallTotalCount = 0;
  let overallRequiredAnsweredCount = 0;
  let overallRequiredTotalCount = 0;

  blocks.forEach((block) => {
    if (block.id === 'review') {
      answered[block.id] = 0;
      total[block.id] = 0;
      requiredAnswered[block.id] = 0;
      requiredTotal[block.id] = 0;
      return;
    }
    const blockFields = getFieldsForBlock(block.id);
    const visible = blockFields.filter((q) => !q.sectionDivider && !q.skip);
    const required = visible.filter((q) => q.pathwayCritical);
    total[block.id] = visible.length;
    answered[block.id] = visible.filter((q) => isAnsweredValue(answers[q.id])).length;
    requiredTotal[block.id] = required.length;
    requiredAnswered[block.id] = required.filter((q) => isAnsweredValue(answers[q.id])).length;
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
}

/**
 * Hook version: memoized progress counts.
 */
export function useAssessmentProgress(
  blocks: Block[],
  answers: Answers,
  getFieldsForBlock: (blockId: string) => AssessmentField[],
): ProgressCounts {
  return useMemo(() => computeProgressCounts(blocks, answers, getFieldsForBlock), [blocks, answers, getFieldsForBlock]);
}

/**
 * Computes the set of completed block IDs (all required fields answered).
 */
export function useCompletedBlocks(
  blocks: Block[],
  requiredAnsweredCounts: Record<string, number>,
  requiredCounts: Record<string, number>,
): Set<string> {
  return useMemo(() => {
    const completed = new Set<string>();
    blocks.forEach((block) => {
      if (
        block.id !== 'review' &&
        (requiredCounts[block.id] || 0) > 0 &&
        requiredAnsweredCounts[block.id] === requiredCounts[block.id]
      ) {
        completed.add(block.id);
      }
    });
    return completed;
  }, [blocks, requiredAnsweredCounts, requiredCounts]);
}
