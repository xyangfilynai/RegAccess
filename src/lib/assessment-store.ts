/**
 * Assessment persistence store.
 * Lightweight localStorage-backed multi-assessment storage with version tracking.
 */

import type { Answers } from './assessment-engine';

export type AssessmentStatus = 'Draft' | 'In Review' | 'Final Internal Memo';

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
  status: AssessmentStatus;
  answers: Answers;
  blockIndex: number;
  createdAt: string;
  updatedAt: string;
  versions: AssessmentVersion[];
  reviewerNotes: ReviewerNote[];
  /** Pathway determination at time of last save */
  lastPathway?: string;
}

const STORE_KEY = 'regassess-assessments';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadAll(): SavedAssessment[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(assessments: SavedAssessment[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(assessments));
  } catch {
    // Ignore storage errors
  }
}

export const assessmentStore = {
  list(): SavedAssessment[] {
    return loadAll().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  get(id: string): SavedAssessment | undefined {
    return loadAll().find(a => a.id === id);
  },

  save(assessment: Omit<SavedAssessment, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'reviewerNotes'> & { id?: string }): SavedAssessment {
    const all = loadAll();
    const now = new Date().toISOString();

    if (assessment.id) {
      // Update existing
      const idx = all.findIndex(a => a.id === assessment.id);
      if (idx >= 0) {
        const existing = all[idx];
        // Create version snapshot of previous state
        const newVersion: AssessmentVersion = {
          versionNumber: existing.versions.length + 1,
          answers: existing.answers,
          timestamp: existing.updatedAt,
          note: `Auto-saved before update`,
        };
        all[idx] = {
          ...existing,
          ...assessment,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: now,
          versions: [...existing.versions, newVersion],
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
      status: assessment.status || 'Draft',
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

  updateStatus(id: string, status: AssessmentStatus): void {
    const all = loadAll();
    const idx = all.findIndex(a => a.id === id);
    if (idx >= 0) {
      all[idx].status = status;
      all[idx].updatedAt = new Date().toISOString();
      saveAll(all);
    }
  },

  addNote(id: string, author: string, text: string): void {
    const all = loadAll();
    const idx = all.findIndex(a => a.id === id);
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
    const idx = all.findIndex(a => a.id === assessmentId);
    if (idx >= 0) {
      all[idx].reviewerNotes = all[idx].reviewerNotes.filter(n => n.id !== noteId);
      all[idx].updatedAt = new Date().toISOString();
      saveAll(all);
    }
  },

  duplicate(id: string): SavedAssessment | undefined {
    const original = loadAll().find(a => a.id === id);
    if (!original) return undefined;
    return assessmentStore.save({
      name: `${original.name} (Copy)`,
      status: 'Draft',
      answers: { ...original.answers },
      blockIndex: 0,
      lastPathway: original.lastPathway,
    });
  },

  delete(id: string): void {
    const all = loadAll().filter(a => a.id !== id);
    saveAll(all);
  },

  restoreVersion(assessmentId: string, versionNumber: number): SavedAssessment | undefined {
    const all = loadAll();
    const idx = all.findIndex(a => a.id === assessmentId);
    if (idx < 0) return undefined;
    const version = all[idx].versions.find(v => v.versionNumber === versionNumber);
    if (!version) return undefined;

    // Save current as new version before restoring
    const current = all[idx];
    const snapshotVersion: AssessmentVersion = {
      versionNumber: current.versions.length + 1,
      answers: current.answers,
      timestamp: current.updatedAt,
      note: `Before restoring to v${versionNumber}`,
    };
    all[idx] = {
      ...current,
      answers: { ...version.answers },
      updatedAt: new Date().toISOString(),
      versions: [...current.versions, snapshotVersion],
    };
    saveAll(all);
    return all[idx];
  },
};
