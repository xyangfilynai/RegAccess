/**
 * Cascade clearing rules for the assessment answer model.
 *
 * When certain "upstream" fields change, all downstream fields must be cleared
 * to avoid stale answers that no longer apply to the new context.
 *
 * Rules:
 * 1. A1 change → clear all B*, C*, P*, D*, E*, F* fields
 * 2. B1 change → clear B2 + all C*, P*, D*, E*, F* fields
 * 3. B1 change away from "Intended Use / Indications for Use" → also clear B3
 */

import { useCallback } from 'react';
import type { Answers, AnswerValue } from '../lib/assessment-engine';
import { CATEGORY_INTENDED_USE } from '../lib/assessment-engine/changeTaxonomy';

/** Prefixes of field IDs that are downstream of A1. */
const DOWNSTREAM_OF_A1 = ['B', 'C', 'P', 'D', 'E', 'F'];

/** Prefixes of field IDs that are downstream of B1 (excluding B2 which is handled explicitly). */
const DOWNSTREAM_OF_B1 = ['C', 'P', 'D', 'E', 'F'];

/**
 * Pure function: applies cascade clearing rules to an answer change.
 * Returns the new answers state.
 */
export function applyCascadeClearing(fieldId: string, value: AnswerValue, prev: Answers): Answers {
  const next: Answers = { ...prev, [fieldId]: value };

  // A1 change → clear all downstream blocks
  if (fieldId === 'A1' && prev.A1 !== value) {
    for (const k of Object.keys(prev)) {
      if (DOWNSTREAM_OF_A1.some((p) => k.startsWith(p))) {
        next[k] = undefined;
      }
    }
  }

  // B1 change → clear B2 + all downstream blocks
  if (fieldId === 'B1' && prev.B1 !== value) {
    next.B2 = undefined;
    for (const k of Object.keys(prev)) {
      if (DOWNSTREAM_OF_B1.some((p) => k.startsWith(p))) {
        next[k] = undefined;
      }
    }
  }

  // B1 change away from Intended Use → also clear B3
  if (fieldId === 'B1' && prev.B1 === CATEGORY_INTENDED_USE && value !== CATEGORY_INTENDED_USE) {
    next.B3 = undefined;
  }

  return next;
}

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
