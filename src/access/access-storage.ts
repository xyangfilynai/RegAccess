import { _invalidateCache } from '../lib/assessment-store';
import { readStoredValue, removeStoredKeys, writeStoredValue } from '../lib/browser-storage';
import { PERSISTENCE_KEYS } from '../lib/persistence-keys';

export const ACCESS_PROTECTED_STORAGE_KEYS = [
  PERSISTENCE_KEYS.draftAnswers,
  PERSISTENCE_KEYS.draftBlockIndex,
  PERSISTENCE_KEYS.savedAssessments,
] as const;

export const readStoredAccessPass = (): string | null => readStoredValue(PERSISTENCE_KEYS.accessPass);

export const storeAccessPass = (rawPass: string): boolean => writeStoredValue(PERSISTENCE_KEYS.accessPass, rawPass);

export const removeStoredAccessPass = (): void => {
  removeStoredKeys(PERSISTENCE_KEYS.accessPass);
};

export const clearProtectedAssessmentData = (): void => {
  removeStoredKeys(...ACCESS_PROTECTED_STORAGE_KEYS);
  _invalidateCache();
};

export const clearExpiredAccessState = (): void => {
  removeStoredKeys(PERSISTENCE_KEYS.accessPass, ...ACCESS_PROTECTED_STORAGE_KEYS);
  _invalidateCache();
};

export const removeAccessAndProtectedData = (): void => {
  removeStoredKeys(PERSISTENCE_KEYS.accessPass, ...ACCESS_PROTECTED_STORAGE_KEYS);
  _invalidateCache();
};
