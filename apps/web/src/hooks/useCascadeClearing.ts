/**
 * React-side wrapper around the engine's pure cascade-clearing function.
 *
 * The actual rules live in `@changepath/engine` (`applyCascadeClearing`)
 * so the server can apply them defensively before running the engine.
 */

import { useCallback } from 'react';
import { applyCascadeClearing, type Answers, type AnswerValue } from '@changepath/engine';

// Re-export the pure function so existing imports keep working.
export { applyCascadeClearing };

/**
 * Hook that wraps a setAnswers dispatcher with cascade clearing logic.
 * Returns a stable callback: (fieldId, value) => void.
 */
export function useCascadeClearing(
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>,
): (fieldId: string, value: AnswerValue) => void {
  return useCallback(
    (fieldId: string, value: AnswerValue) => {
      setAnswers((prev) => applyCascadeClearing(fieldId, value, prev));
    },
    [setAnswers],
  );
}
