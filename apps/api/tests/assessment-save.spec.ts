import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    changeCase: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    assessmentResponseSet: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma';
import {
  saveAssessment,
  AssessmentConflictError,
} from '../src/services/assessment-service';

const ORG_ID = '00000000-0000-4000-a000-000000000001';
const CASE_ID = '00000000-0000-4000-a000-000000000030';
const ASSESSMENT_ID = '00000000-0000-4000-a000-000000000031';
const USER_ID = '00000000-0000-4000-a000-000000000010';

const T0 = new Date('2026-04-10T10:00:00Z');
const T1 = new Date('2026-04-10T10:05:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.changeCase.findFirst).mockResolvedValue({
    id: CASE_ID,
    organizationId: ORG_ID,
  } as never);
  vi.mocked(prisma.changeCase.update).mockResolvedValue({} as never);
  vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
});

describe('saveAssessment', () => {
  describe('optimistic locking', () => {
    it('rejects with AssessmentConflictError when expectedUpdatedAt is stale', async () => {
      vi.mocked(prisma.assessmentResponseSet.findFirst).mockResolvedValue({
        id: ASSESSMENT_ID,
        caseId: CASE_ID,
        answersJson: { A1: '510(k)' },
        updatedAt: T1, // server is newer
      } as never);

      await expect(
        saveAssessment(
          CASE_ID,
          {
            delta: { A1: 'PMA' },
            expectedUpdatedAt: T0, // client thinks it's older
          },
          ORG_ID,
          USER_ID,
        ),
      ).rejects.toBeInstanceOf(AssessmentConflictError);

      // No write should have happened.
      expect(prisma.assessmentResponseSet.update).not.toHaveBeenCalled();
      expect(prisma.assessmentResponseSet.create).not.toHaveBeenCalled();
    });

    it('accepts when expectedUpdatedAt matches server updatedAt', async () => {
      vi.mocked(prisma.assessmentResponseSet.findFirst).mockResolvedValue({
        id: ASSESSMENT_ID,
        caseId: CASE_ID,
        answersJson: { A1: '510(k)', A2: 'No' },
        updatedAt: T0,
      } as never);
      vi.mocked(prisma.assessmentResponseSet.update).mockResolvedValue({
        id: ASSESSMENT_ID,
        updatedAt: T1,
      } as never);

      await saveAssessment(
        CASE_ID,
        {
          delta: { A2: 'Yes' },
          expectedUpdatedAt: T0,
        },
        ORG_ID,
        USER_ID,
      );

      expect(prisma.assessmentResponseSet.update).toHaveBeenCalledTimes(1);
    });

    it('accepts when there is no existing assessment regardless of expectedUpdatedAt', async () => {
      vi.mocked(prisma.assessmentResponseSet.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.assessmentResponseSet.create).mockResolvedValue({
        id: ASSESSMENT_ID,
        updatedAt: T0,
      } as never);

      await saveAssessment(
        CASE_ID,
        {
          answersJson: { A1: '510(k)' },
          expectedUpdatedAt: T0, // bogus, but ignored on first save
        },
        ORG_ID,
        USER_ID,
      );

      expect(prisma.assessmentResponseSet.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('delta merging', () => {
    it('merges delta onto existing answers, keeping untouched fields', async () => {
      vi.mocked(prisma.assessmentResponseSet.findFirst).mockResolvedValue({
        id: ASSESSMENT_ID,
        caseId: CASE_ID,
        answersJson: { A1: '510(k)', A2: 'No', A6: ['LLM / Large Language Model'] },
        updatedAt: T0,
      } as never);
      vi.mocked(prisma.assessmentResponseSet.update).mockResolvedValue({
        id: ASSESSMENT_ID,
        updatedAt: T1,
      } as never);

      await saveAssessment(
        CASE_ID,
        { delta: { A2: 'Yes' } },
        ORG_ID,
        USER_ID,
      );

      const updateCall = vi.mocked(prisma.assessmentResponseSet.update).mock.calls[0][0];
      expect(updateCall.data.answersJson).toMatchObject({
        A1: '510(k)',
        A2: 'Yes', // updated by delta
        A6: ['LLM / Large Language Model'], // preserved
      });
    });

    it('applies cascade clearing defensively even when client only sent A1', async () => {
      vi.mocked(prisma.assessmentResponseSet.findFirst).mockResolvedValue({
        id: ASSESSMENT_ID,
        caseId: CASE_ID,
        answersJson: {
          A1: '510(k)',
          B1: 'Software',
          C1: 'No',
        },
        updatedAt: T0,
      } as never);
      vi.mocked(prisma.assessmentResponseSet.update).mockResolvedValue({
        id: ASSESSMENT_ID,
        updatedAt: T1,
      } as never);

      await saveAssessment(
        CASE_ID,
        { delta: { A1: 'PMA' } }, // client did NOT clear B1/C1
        ORG_ID,
        USER_ID,
      );

      const updateCall = vi.mocked(prisma.assessmentResponseSet.update).mock.calls[0][0];
      const written = updateCall.data.answersJson as Record<string, unknown>;
      expect(written.A1).toBe('PMA');
      // Server-side cascade clearing should have wiped these.
      expect(written.B1).toBeUndefined();
      expect(written.C1).toBeUndefined();
    });
  });

  describe('currentVersion semantics', () => {
    it('does NOT increment changeCase.currentVersion on save', async () => {
      vi.mocked(prisma.assessmentResponseSet.findFirst).mockResolvedValue({
        id: ASSESSMENT_ID,
        caseId: CASE_ID,
        answersJson: { A1: '510(k)' },
        updatedAt: T0,
      } as never);
      vi.mocked(prisma.assessmentResponseSet.update).mockResolvedValue({
        id: ASSESSMENT_ID,
        updatedAt: T1,
      } as never);

      await saveAssessment(
        CASE_ID,
        { delta: { A2: 'Yes' } },
        ORG_ID,
        USER_ID,
      );

      const caseUpdateCall = vi.mocked(prisma.changeCase.update).mock.calls[0][0];
      expect(caseUpdateCall.data).not.toHaveProperty('currentVersion');
      // currentDecision should still be set from the engine output.
      expect(caseUpdateCall.data).toHaveProperty('currentDecision');
    });
  });

  describe('input validation', () => {
    it('throws when neither delta nor answersJson is provided', async () => {
      await expect(
        saveAssessment(CASE_ID, {}, ORG_ID, USER_ID),
      ).rejects.toThrow('Either delta or answersJson must be provided');
    });

    it('throws when case is not in organization', async () => {
      vi.mocked(prisma.changeCase.findFirst).mockResolvedValue(null);

      await expect(
        saveAssessment(
          CASE_ID,
          { answersJson: { A1: '510(k)' } },
          ORG_ID,
          USER_ID,
        ),
      ).rejects.toThrow('Case not found in organization');
    });
  });
});
