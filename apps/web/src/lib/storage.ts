import type { Answers } from './assessment-engine';
import {
  isPlainObject,
  isStringArray,
  readStoredValue,
  readStoredJson,
  removeStoredKeys,
  writeStoredJson,
  writeStoredValue,
} from './browser-storage';
import { PERSISTENCE_KEYS } from './persistence-keys';

const isAnswerValue = (value: unknown): value is string | string[] => typeof value === 'string' || isStringArray(value);

export const isAnswersRecord = (value: unknown): value is Answers =>
  isPlainObject(value) && Object.values(value).every((entry) => isAnswerValue(entry));

export const storage = {
  loadAnswers(): Answers {
    const saved = readStoredJson(PERSISTENCE_KEYS.draftAnswers);
    return isAnswersRecord(saved) ? saved : {};
  },

  saveAnswers(answers: Answers): void {
    writeStoredJson(PERSISTENCE_KEYS.draftAnswers, answers);
  },

  loadBlockIndex(): number {
    const saved = readStoredValue(PERSISTENCE_KEYS.draftBlockIndex);
    const parsed = saved ? Number.parseInt(saved, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  },

  saveBlockIndex(index: number): void {
    writeStoredValue(PERSISTENCE_KEYS.draftBlockIndex, String(index));
  },

  clearSession(): void {
    removeStoredKeys(PERSISTENCE_KEYS.draftAnswers, PERSISTENCE_KEYS.draftBlockIndex);
  },

  hasSavedAnswers(): boolean {
    return Object.keys(this.loadAnswers()).length > 0;
  },
};
