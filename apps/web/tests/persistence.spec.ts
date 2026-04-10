import { describe, expect, it, vi } from 'vitest';
import { assessmentStore } from '../src/lib/assessment-store';
import {
  STORAGE_WRITE_LIMIT_CHARS,
  StorageQuotaError,
  StorageWriteError,
  writeStoredJson,
} from '../src/lib/browser-storage';
import { PERSISTENCE_KEYS } from '../src/lib/persistence-keys';
import { storage } from '../src/lib/storage';

describe('browser persistence', () => {
  it('falls back to an empty answer set when persisted answers are malformed', () => {
    localStorage.setItem(PERSISTENCE_KEYS.draftAnswers, '{"A1":{"nested":"nope"}}');

    expect(storage.loadAnswers()).toEqual({});
    expect(storage.hasSavedAnswers()).toBe(false);
  });

  it('normalizes legacy saved assessments and creates versions only on meaningful updates', () => {
    localStorage.setItem(
      PERSISTENCE_KEYS.savedAssessments,
      JSON.stringify([
        {
          id: 'legacy-assessment',
          name: 'Legacy assessment',
          answers: { A1: '510(k)' },
          blockIndex: -3,
          createdAt: 'not-a-date',
          updatedAt: '2026-03-02T00:00:00.000Z',
          lastPathway: 'Letter to File',
        },
        {
          id: 'valid-assessment',
          name: 'Stored assessment',
          answers: { A1: '510(k)' },
          blockIndex: 0,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
          versions: [],
          reviewerNotes: [],
          lastPathway: 'Letter to File',
        },
        {
          id: 'broken-assessment',
          name: 'Broken assessment',
          answers: 'not-an-answer-record',
          blockIndex: 0,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
          versions: [],
          reviewerNotes: [],
        },
      ]),
    );

    const normalized = assessmentStore.list();

    expect(normalized).toHaveLength(2);
    expect(localStorage.getItem(PERSISTENCE_KEYS.savedAssessments)).toBeNull();
    expect(localStorage.getItem(PERSISTENCE_KEYS.savedAssessmentIndex)).not.toBeNull();
    expect(normalized.find((assessment) => assessment.id === 'legacy-assessment')).toMatchObject({
      id: 'legacy-assessment',
      name: 'Legacy assessment',
      blockIndex: 0,
      versions: [],
      reviewerNotes: [],
      lastPathway: 'Letter to File',
    });
    expect(
      Date.parse(normalized.find((assessment) => assessment.id === 'legacy-assessment')?.createdAt || ''),
    ).not.toBeNaN();

    const created = assessmentStore.save({
      name: 'Draft review',
      answers: { A1: '510(k)' },
      blockIndex: 0,
      lastPathway: 'Letter to File',
    });

    const unchangedUpdate = assessmentStore.save({
      id: created.id,
      name: created.name,
      answers: { A1: '510(k)' },
      blockIndex: 0,
      lastPathway: 'Letter to File',
    });

    expect(unchangedUpdate.versions).toHaveLength(0);

    const changedUpdate = assessmentStore.save({
      id: created.id,
      name: created.name,
      answers: { A1: '510(k)', B1: 'Training Data' },
      blockIndex: 1,
      lastPathway: 'New Submission Required',
    });

    expect(changedUpdate.versions).toHaveLength(1);
    expect(changedUpdate.versions[0].answers).toEqual({ A1: '510(k)' });
  });

  it('returns a fresh list snapshot so callers can trigger UI updates safely', () => {
    assessmentStore.save({
      name: 'Assessment A',
      answers: { A1: '510(k)' },
      blockIndex: 0,
      lastPathway: 'Letter to File',
    });

    const firstList = assessmentStore.list();
    const secondList = assessmentStore.list();

    expect(secondList).toHaveLength(1);
    expect(secondList).not.toBe(firstList);
    expect(localStorage.getItem(PERSISTENCE_KEYS.savedAssessments)).toBeNull();
    expect(localStorage.getItem(PERSISTENCE_KEYS.savedAssessmentIndex)).not.toBeNull();
  });

  it('generates IDs using crypto.randomUUID', () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID');

    const saved = assessmentStore.save({
      name: 'UUID test',
      answers: { A1: '510(k)' },
      blockIndex: 0,
      lastPathway: 'Letter to File',
    });

    expect(uuidSpy).toHaveBeenCalled();
    expect(saved.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    uuidSpy.mockRestore();
  });

  it('throws StorageQuotaError when a save exceeds the size limit', () => {
    const hugeValue = 'x'.repeat(STORAGE_WRITE_LIMIT_CHARS + 1);

    expect(() =>
      assessmentStore.save({
        name: 'Oversized assessment',
        answers: { A1: hugeValue },
        blockIndex: 0,
        lastPathway: 'Letter to File',
      }),
    ).toThrow(StorageQuotaError);
  });

  it('preserves existing data when a save is rejected by the size guard', () => {
    assessmentStore.save({
      name: 'Existing assessment',
      answers: { A1: '510(k)' },
      blockIndex: 0,
      lastPathway: 'Letter to File',
    });

    const hugeValue = 'x'.repeat(STORAGE_WRITE_LIMIT_CHARS + 1);

    try {
      assessmentStore.save({
        name: 'Oversized assessment',
        answers: { A1: hugeValue },
        blockIndex: 0,
        lastPathway: 'Letter to File',
      });
    } catch {
      // expected
    }

    const remaining = assessmentStore.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Existing assessment');
  });

  it('throws StorageWriteError when browser storage rejects a write', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked by browser');
    });

    expect(() => writeStoredJson('write-failure-test', { ok: true })).toThrow(StorageWriteError);

    setItemSpy.mockRestore();
  });
});
