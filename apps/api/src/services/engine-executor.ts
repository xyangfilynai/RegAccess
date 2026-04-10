import {
  computeDerivedState,
  computeDetermination,
  getBlocks,
  getBlockFields,
  type Answers,
} from '@changepath/engine';

interface CompletenessBlock {
  id: string;
  label: string;
  answeredRequired: number;
  totalRequired: number;
  complete: boolean;
}

export interface CompletenessStatus {
  blocks: CompletenessBlock[];
  overallComplete: boolean;
}

/**
 * Runs the authoritative server-side engine execution.
 * This is the single source of truth for pathway determination.
 * Pure function — no database dependency.
 */
export function executeEngine(answersJson: Record<string, unknown>) {
  const answers = answersJson as Answers;
  const derivedState = computeDerivedState(answers);
  const determination = computeDetermination(answers);

  // Compute completeness status
  const blocks = getBlocks(answers, derivedState);
  const completeness: CompletenessStatus = {
    blocks: blocks
      .filter((b) => b.id !== 'review')
      .map((block) => {
        const fields = getBlockFields(block.id, answers, derivedState);
        const requiredFields = fields.filter((f) => !f.skip && f.pathwayCritical);
        const answeredRequired = requiredFields.filter((f) => {
          const value = answers[f.id];
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'string') return value.trim() !== '';
          return value !== undefined && value !== null;
        }).length;

        return {
          id: block.id,
          label: block.label,
          answeredRequired,
          totalRequired: requiredFields.length,
          complete: answeredRequired >= requiredFields.length,
        };
      }),
    overallComplete: false,
  };
  completeness.overallComplete = completeness.blocks.every((b) => b.complete);

  return {
    derivedState,
    determination,
    completenessStatus: completeness,
  };
}
