/**
 * Access pass localStorage persistence.
 *
 * SECURITY NOTE — threat model for stored access passes:
 *
 * The signed access pass is stored verbatim in localStorage as a bearer
 * credential. This is an accepted trade-off for a client-only SPA with no
 * backend session layer. Consequences:
 *
 *  - Any code running on the same origin (XSS, browser extensions, injected
 *    scripts) can read, copy, or replay the stored pass on another device.
 *  - localStorage is not encrypted at rest — anyone with filesystem access to
 *    the browser profile can extract the pass.
 *
 * This storage layer is NOT a security boundary. It exists to persist the UX
 * "unlocked" state across page reloads. If the application ever gains a server
 * component, pass verification should move server-side and the raw pass should
 * not be stored on the client.
 */

import { readStoredValue, removeStoredKeys, writeStoredValue } from '../lib/browser-storage';
import { clearAssessmentStoreStorage } from '../lib/assessment-store';
import { PERSISTENCE_KEYS } from '../lib/persistence-keys';

const ACCESS_PROTECTED_STORAGE_KEYS = [PERSISTENCE_KEYS.draftAnswers, PERSISTENCE_KEYS.draftBlockIndex] as const;

export const readStoredAccessPass = (): string | null => readStoredValue(PERSISTENCE_KEYS.accessPass);

/** Stores the raw signed pass in localStorage. See module-level security note. */
export const storeAccessPass = (rawPass: string): boolean => writeStoredValue(PERSISTENCE_KEYS.accessPass, rawPass);

export const removeStoredAccessPass = (): void => {
  removeStoredKeys(PERSISTENCE_KEYS.accessPass);
};

export const removeAccessAndProtectedData = (): void => {
  removeStoredKeys(PERSISTENCE_KEYS.accessPass, ...ACCESS_PROTECTED_STORAGE_KEYS);
  clearAssessmentStoreStorage();
};
