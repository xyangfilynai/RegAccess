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
 *
 * This is a pure function so it can run identically on the client (during
 * editing) and on the server (defensively, before engine execution).
 */

import type { Answers, AnswerValue } from './types';
import { CATEGORY_INTENDED_USE } from './changeTaxonomy';

/** Prefixes of field IDs that are downstream of A1. */
const DOWNSTREAM_OF_A1 = ['B', 'C', 'P', 'D', 'E', 'F'];

/** Prefixes of field IDs that are downstream of B1 (excluding B2 which is handled explicitly). */
const DOWNSTREAM_OF_B1 = ['C', 'P', 'D', 'E', 'F'];

/**
 * Pure function: applies cascade clearing rules for a single field change.
 * Returns the new answers state.
 */
export function applyCascadeClearing(
  fieldId: string,
  value: AnswerValue,
  prev: Answers,
): Answers {
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
  if (
    fieldId === 'B1' &&
    prev.B1 === CATEGORY_INTENDED_USE &&
    value !== CATEGORY_INTENDED_USE
  ) {
    next.B3 = undefined;
  }

  return next;
}

/**
 * Reconcile a candidate answer set against a prior baseline by clearing
 * downstream fields whose upstream parents changed but which were *not*
 * explicitly updated by the candidate. This is the server-side defence:
 * clients should also apply cascade clearing while editing, but the server
 * cannot trust them to do so consistently (e.g., a malicious or buggy
 * client could send a parent change without clearing dependents).
 *
 * Semantics:
 * - A field is "explicitly changed" if `candidate[key]` differs from
 *   `baseline[key]` (treating arrays element-wise, treating missing keys
 *   as `undefined`).
 * - When a parent's value is explicitly changed, every downstream field
 *   that is NOT itself explicitly changed is cleared. Fields the user
 *   *did* explicitly set are preserved, even if their parent also changed
 *   in the same save.
 *
 * Returns the cleaned answer set.
 */
export function applyCascadeClearingBatch(
  candidate: Answers,
  baseline: Answers,
): Answers {
  const result: Answers = { ...candidate };

  const isExplicitlyChanged = (key: string): boolean =>
    !shallowEqualValue(candidate[key], baseline[key]);

  const clearIfImplicit = (key: string): void => {
    if (!isExplicitlyChanged(key)) {
      result[key] = undefined;
    }
  };

  const allKeys = new Set<string>([
    ...Object.keys(baseline),
    ...Object.keys(candidate),
  ]);

  // A1 cascade: clear all downstream blocks that weren't explicitly changed.
  if (isExplicitlyChanged('A1')) {
    for (const key of allKeys) {
      if (DOWNSTREAM_OF_A1.some((p) => key.startsWith(p))) {
        clearIfImplicit(key);
      }
    }
  }

  // B1 cascade: clear B2 + downstream blocks that weren't explicitly changed.
  if (isExplicitlyChanged('B1')) {
    clearIfImplicit('B2');
    for (const key of allKeys) {
      if (DOWNSTREAM_OF_B1.some((p) => key.startsWith(p))) {
        clearIfImplicit(key);
      }
    }
  }

  // B1 changed away from Intended Use → clear B3 (unless explicitly changed).
  if (
    isExplicitlyChanged('B1') &&
    baseline.B1 === CATEGORY_INTENDED_USE &&
    candidate.B1 !== CATEGORY_INTENDED_USE
  ) {
    clearIfImplicit('B3');
  }

  return result;
}

function shallowEqualValue(a: AnswerValue, b: AnswerValue): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return false;
}
