/**
 * Assessment persistence store.
 * Lightweight localStorage-backed multi-assessment storage with version tracking.
 */

import type { Answers } from './assessment-engine';
import { isPlainObject, isStringArray, readStoredJson, removeStoredKeys, writeStoredJson } from './browser-storage';
import { PERSISTENCE_KEYS } from './persistence-keys';
import { isAnswersRecord } from './storage';

export interface ReviewerNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface AssessmentVersion {
  versionNumber: number;
  answers: Answers;
  timestamp: string;
  note: string;
}

export interface SavedAssessment {
  id: string;
  name: string;
  answers: Answers;
  blockIndex: number;
  createdAt: string;
  updatedAt: string;
  versions: AssessmentVersion[];
  reviewerNotes: ReviewerNote[];
  /** Pathway determination at time of last save */
  lastPathway?: string;
}

interface PersistedSavedAssessment extends SavedAssessment {
  schemaVersion: number;
}

const ASSESSMENT_STORE_SCHEMA_VERSION = 1;

function generateId(): string {
  return crypto.randomUUID();
}

const isReviewerNote = (value: unknown): value is ReviewerNote =>
  isPlainObject(value) &&
  typeof value.id === 'string' &&
  typeof value.author === 'string' &&
  typeof value.text === 'string' &&
  isValidTimestamp(value.timestamp);

const isAssessmentVersion = (value: unknown): value is AssessmentVersion =>
  isPlainObject(value) &&
  typeof value.versionNumber === 'number' &&
  Number.isFinite(value.versionNumber) &&
  value.versionNumber >= 1 &&
  isAnswersRecord(value.answers) &&
  isValidTimestamp(value.timestamp) &&
  typeof value.note === 'string';

const isSavedAssessment = (value: unknown): value is SavedAssessment =>
  isPlainObject(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isAnswersRecord(value.answers) &&
  typeof value.blockIndex === 'number' &&
  Number.isFinite(value.blockIndex) &&
  value.blockIndex >= 0 &&
  isValidTimestamp(value.createdAt) &&
  isValidTimestamp(value.updatedAt) &&
  Array.isArray(value.versions) &&
  value.versions.every((entry) => isAssessmentVersion(entry)) &&
  Array.isArray(value.reviewerNotes) &&
  value.reviewerNotes.every((entry) => isReviewerNote(entry)) &&
  (value.lastPathway === undefined || typeof value.lastPathway === 'string');

const isValidTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

const normalizeTimestamp = (value: unknown, fallback: string): string => (isValidTimestamp(value) ? value : fallback);

const toNonNegativeInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const normalizeReviewerNote = (value: unknown, fallbackTimestamp: string): ReviewerNote | null => {
  if (isReviewerNote(value)) return value;
  if (!isPlainObject(value)) return null;
  if (typeof value.id !== 'string' || typeof value.author !== 'string' || typeof value.text !== 'string') {
    return null;
  }

  return {
    id: value.id,
    author: value.author,
    text: value.text,
    timestamp: normalizeTimestamp(value.timestamp, fallbackTimestamp),
  };
};

const normalizeAssessmentVersion = (value: unknown, fallbackTimestamp: string): AssessmentVersion | null => {
  if (isAssessmentVersion(value)) return value;
  if (!isPlainObject(value) || !isAnswersRecord(value.answers) || typeof value.note !== 'string') return null;

  return {
    versionNumber: Math.max(1, toNonNegativeInteger(value.versionNumber)),
    answers: value.answers,
    timestamp: normalizeTimestamp(value.timestamp, fallbackTimestamp),
    note: value.note,
  };
};

const normalizeSavedAssessment = (value: unknown): SavedAssessment | null => {
  if (isSavedAssessment(value)) return value;
  if (!isPlainObject(value)) return null;
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || !isAnswersRecord(value.answers)) {
    return null;
  }

  const createdAtFallback = new Date().toISOString();
  const createdAt = normalizeTimestamp(value.createdAt, createdAtFallback);
  const updatedAt = normalizeTimestamp(value.updatedAt, createdAt);
  const reviewerNotes = Array.isArray(value.reviewerNotes)
    ? value.reviewerNotes
        .map((entry) => normalizeReviewerNote(entry, updatedAt))
        .filter((entry): entry is ReviewerNote => entry !== null)
    : [];
  const versions = Array.isArray(value.versions)
    ? value.versions
        .map((entry) => normalizeAssessmentVersion(entry, updatedAt))
        .filter((entry): entry is AssessmentVersion => entry !== null)
    : [];

  return {
    id: value.id,
    name: value.name,
    answers: value.answers,
    blockIndex: toNonNegativeInteger(value.blockIndex),
    createdAt,
    updatedAt,
    versions,
    reviewerNotes,
    lastPathway: typeof value.lastPathway === 'string' ? value.lastPathway : undefined,
  };
};

const toPersistedSavedAssessment = (assessment: SavedAssessment): PersistedSavedAssessment => ({
  ...assessment,
  schemaVersion: ASSESSMENT_STORE_SCHEMA_VERSION,
});

const getAssessmentRecordKey = (id: string): string => `${PERSISTENCE_KEYS.savedAssessmentRecordPrefix}${id}`;

const serializeAnswers = (answers: Answers): string =>
  JSON.stringify(
    Object.entries(answers)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, value]),
  );

const hasMeaningfulAssessmentChange = (
  existing: SavedAssessment,
  next: Pick<SavedAssessment, 'name' | 'answers' | 'blockIndex' | 'lastPathway'>,
): boolean =>
  existing.name !== next.name ||
  existing.blockIndex !== next.blockIndex ||
  existing.lastPathway !== next.lastPathway ||
  serializeAnswers(existing.answers) !== serializeAnswers(next.answers);

/** Write-through cache: avoids redundant JSON.parse calls when
 *  multiple store operations run in the same synchronous turn
 *  (e.g. save → list refresh). Updated in-place on writes — never invalidated. */
let _cache: SavedAssessment[] | null = null;
let _indexById: Map<string, SavedAssessment> | null = null;

function rebuildIndex(assessments: SavedAssessment[]): void {
  _indexById = new Map(assessments.map((a) => [a.id, a]));
}

function readStoredAssessmentIds(): string[] | null {
  const rawIndex = readStoredJson(PERSISTENCE_KEYS.savedAssessmentIndex);
  if (!isStringArray(rawIndex)) return null;

  const deduped = new Set<string>();
  rawIndex.forEach((id) => {
    if (id.trim()) {
      deduped.add(id);
    }
  });

  return [...deduped];
}

function loadLegacyAssessments(): SavedAssessment[] {
  const raw = readStoredJson(PERSISTENCE_KEYS.savedAssessments);
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => normalizeSavedAssessment(entry))
    .filter((entry): entry is SavedAssessment => entry !== null);
}

function loadAssessmentRecord(id: string): SavedAssessment | null {
  return normalizeSavedAssessment(readStoredJson(getAssessmentRecordKey(id)));
}

function persistAssessments(assessments: SavedAssessment[], previousIds: string[]): void {
  assessments.forEach((assessment) => {
    writeStoredJson(getAssessmentRecordKey(assessment.id), toPersistedSavedAssessment(assessment));
  });

  writeStoredJson(
    PERSISTENCE_KEYS.savedAssessmentIndex,
    assessments.map((assessment) => assessment.id),
  );

  removeStoredKeys(PERSISTENCE_KEYS.savedAssessments);

  const nextIds = new Set(assessments.map((assessment) => assessment.id));
  const staleRecordKeys = previousIds.filter((id) => !nextIds.has(id)).map((id) => getAssessmentRecordKey(id));
  if (staleRecordKeys.length > 0) {
    removeStoredKeys(...staleRecordKeys);
  }
}

function loadAll(): SavedAssessment[] {
  if (_cache) return _cache;

  const storedIds = readStoredAssessmentIds();
  if (storedIds) {
    _cache = storedIds
      .map((id) => loadAssessmentRecord(id))
      .filter((entry): entry is SavedAssessment => entry !== null);
    rebuildIndex(_cache);

    if (_cache.length !== storedIds.length) {
      try {
        persistAssessments(_cache, storedIds);
      } catch {
        // Keep serving the valid subset even if index repair fails.
      }
    }

    return _cache;
  }

  _cache = loadLegacyAssessments();
  rebuildIndex(_cache);

  if (_cache.length > 0) {
    const previousLegacyIds = _cache.map((assessment) => assessment.id);
    try {
      persistAssessments(_cache, previousLegacyIds);
    } catch {
      // Continue serving legacy-loaded data even if migration cannot complete yet.
    }
  }

  return _cache;
}

function saveAll(assessments: SavedAssessment[]): void {
  const previousIds = readStoredAssessmentIds() ?? loadLegacyAssessments().map((assessment) => assessment.id);

  try {
    persistAssessments(assessments, previousIds);
  } catch (error) {
    // The in-memory cache may have been mutated before this call.
    // Invalidate it so the next loadAll() re-reads from localStorage.
    _cache = null;
    _indexById = null;
    throw error;
  }
  _cache = assessments;
  rebuildIndex(assessments);
}

/**
 * Force the next loadAll() to re-read localStorage.
 *
 * @internal Intended for tests and the access-storage cleanup path only.
 * Do not call from general application code — the write-through cache is
 * kept consistent by saveAll() during normal operation.
 */
export function _invalidateCache(): void {
  _cache = null;
  _indexById = null;
}

export function clearAssessmentStoreStorage(): void {
  const recordIds = readStoredAssessmentIds() ?? loadLegacyAssessments().map((assessment) => assessment.id);
  const recordKeys = recordIds.map((id) => getAssessmentRecordKey(id));
  removeStoredKeys(PERSISTENCE_KEYS.savedAssessments, PERSISTENCE_KEYS.savedAssessmentIndex, ...recordKeys);
  _invalidateCache();
}

export const assessmentStore = {
  list(): SavedAssessment[] {
    return [...loadAll()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  get(id: string): SavedAssessment | undefined {
    loadAll(); // ensure cache is populated
    return _indexById?.get(id);
  },

  save(
    assessment: Omit<SavedAssessment, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'reviewerNotes'> & {
      id?: string;
    },
  ): SavedAssessment {
    const all = loadAll();
    const now = new Date().toISOString();

    if (assessment.id) {
      // Update existing
      const idx = all.findIndex((a) => a.id === assessment.id);
      if (idx >= 0) {
        const existing = all[idx];
        const nextName = assessment.name || existing.name;
        const nextPayload = {
          name: nextName,
          answers: assessment.answers,
          blockIndex: assessment.blockIndex,
          lastPathway: assessment.lastPathway,
        };
        const versions = hasMeaningfulAssessmentChange(existing, nextPayload)
          ? [
              ...existing.versions,
              {
                versionNumber: existing.versions.length + 1,
                answers: existing.answers,
                timestamp: existing.updatedAt,
                note: 'Snapshot saved before update',
              },
            ]
          : existing.versions;

        all[idx] = {
          ...existing,
          ...nextPayload,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: now,
          versions,
          reviewerNotes: existing.reviewerNotes,
        };
        saveAll(all);
        return all[idx];
      }
    }

    // Create new
    const newAssessment: SavedAssessment = {
      id: generateId(),
      name: assessment.name || `Assessment ${all.length + 1}`,
      answers: assessment.answers,
      blockIndex: assessment.blockIndex,
      createdAt: now,
      updatedAt: now,
      versions: [],
      reviewerNotes: [],
      lastPathway: assessment.lastPathway,
    };
    all.push(newAssessment);
    saveAll(all);
    return newAssessment;
  },

  addNote(id: string, author: string, text: string): void {
    const all = loadAll();
    const idx = all.findIndex((a) => a.id === id);
    if (idx >= 0) {
      all[idx].reviewerNotes.push({
        id: generateId(),
        author,
        text,
        timestamp: new Date().toISOString(),
      });
      all[idx].updatedAt = new Date().toISOString();
      saveAll(all);
    }
  },

  removeNote(assessmentId: string, noteId: string): void {
    const all = loadAll();
    const idx = all.findIndex((a) => a.id === assessmentId);
    if (idx >= 0) {
      all[idx].reviewerNotes = all[idx].reviewerNotes.filter((n) => n.id !== noteId);
      all[idx].updatedAt = new Date().toISOString();
      saveAll(all);
    }
  },

  duplicate(id: string): SavedAssessment | undefined {
    const original = loadAll().find((a) => a.id === id);
    if (!original) return undefined;
    return assessmentStore.save({
      name: `${original.name} (Copy)`,
      answers: { ...original.answers },
      blockIndex: 0,
      lastPathway: original.lastPathway,
    });
  },

  delete(id: string): void {
    const all = loadAll().filter((a) => a.id !== id);
    saveAll(all);
  },
};
