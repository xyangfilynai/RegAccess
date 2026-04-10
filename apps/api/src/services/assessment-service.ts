import { Prisma } from '@prisma/client';
import {
  applyCascadeClearingBatch,
  type Answers,
  type AnswerValue,
} from '@changepath/engine';
import { prisma } from '../lib/prisma.js';
import { createAuditEvent } from './audit-service.js';
import { executeEngine } from './engine-executor.js';

export { executeEngine } from './engine-executor.js';

const SCHEMA_VERSION = '1.0.0';

/** Thrown when an autosave includes a stale `expectedUpdatedAt`. */
export class AssessmentConflictError extends Error {
  readonly code = 'ASSESSMENT_CONFLICT';
  constructor(
    public readonly serverUpdatedAt: Date,
    public readonly clientExpectedAt: Date | null,
  ) {
    super('Assessment was modified by another save');
  }
}

/** Helper to cast values for Prisma JSON columns. */
const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export async function getAssessment(caseId: string, organizationId: string) {
  // Verify case belongs to org
  const changeCase = await prisma.changeCase.findFirst({
    where: { id: caseId, organizationId },
  });
  if (!changeCase) return null;

  return prisma.assessmentResponseSet.findFirst({
    where: { caseId },
    orderBy: { updatedAt: 'desc' },
  });
}

export interface SaveAssessmentInput {
  /** Optional incremental delta — only the field IDs whose values changed. */
  delta?: Record<string, AnswerValue>;
  /** Optional full snapshot — used for initial save and reconciliation fallbacks. */
  answersJson?: Record<string, AnswerValue>;
  /**
   * Expected `updated_at` of the latest assessment row, as observed by the
   * client. If supplied and stale, the save is rejected with an
   * `AssessmentConflictError` (HTTP 409 at the route layer).
   */
  expectedUpdatedAt?: Date | null;
}

export async function saveAssessment(
  caseId: string,
  input: SaveAssessmentInput,
  organizationId: string,
  userId: string,
) {
  if (!input.delta && !input.answersJson) {
    throw new Error('Either delta or answersJson must be provided');
  }

  // Verify case belongs to org
  const changeCase = await prisma.changeCase.findFirst({
    where: { id: caseId, organizationId },
  });
  if (!changeCase) {
    throw new Error('Case not found in organization');
  }

  // Get current assessment for audit before/after + optimistic-lock check
  const existingAssessment = await prisma.assessmentResponseSet.findFirst({
    where: { caseId },
    orderBy: { updatedAt: 'desc' },
  });

  // Optimistic locking — reject if the client's expected timestamp is stale.
  if (
    existingAssessment &&
    input.expectedUpdatedAt !== undefined &&
    input.expectedUpdatedAt !== null
  ) {
    const expectedMs = new Date(input.expectedUpdatedAt).getTime();
    const serverMs = existingAssessment.updatedAt.getTime();
    if (expectedMs !== serverMs) {
      throw new AssessmentConflictError(
        existingAssessment.updatedAt,
        input.expectedUpdatedAt,
      );
    }
  }

  // Merge delta onto existing answers, or use full snapshot.
  const baselineAnswers: Answers =
    (existingAssessment?.answersJson as Answers | null | undefined) ?? {};
  let mergedAnswers: Answers;
  if (input.delta) {
    mergedAnswers = { ...baselineAnswers, ...input.delta };
  } else {
    mergedAnswers = { ...input.answersJson } as Answers;
  }

  // Defensively re-apply cascade clearing on the server. The client should
  // already have applied this, but the engine cannot trust client state.
  const cleanedAnswers = applyCascadeClearingBatch(mergedAnswers, baselineAnswers);

  // Run authoritative engine execution
  const { derivedState, determination, completenessStatus } =
    executeEngine(cleanedAnswers);

  // Upsert assessment
  const assessment = existingAssessment
    ? await prisma.assessmentResponseSet.update({
        where: { id: existingAssessment.id },
        data: {
          answersJson: toJsonValue(cleanedAnswers),
          derivedStateJson: toJsonValue(derivedState),
          engineOutputJson: toJsonValue(determination),
          completenessStatusJson: toJsonValue(completenessStatus),
          updatedByUserId: userId,
        },
      })
    : await prisma.assessmentResponseSet.create({
        data: {
          caseId,
          schemaVersion: SCHEMA_VERSION,
          answersJson: toJsonValue(cleanedAnswers),
          derivedStateJson: toJsonValue(derivedState),
          engineOutputJson: toJsonValue(determination),
          completenessStatusJson: toJsonValue(completenessStatus),
          updatedByUserId: userId,
        },
      });

  // Update case currentDecision only.
  // NOTE: `currentVersion` is intentionally NOT incremented on save —
  // it's reserved for explicit version events (approval snapshots, reopens).
  // See Phase 5 of the implementation plan.
  await prisma.changeCase.update({
    where: { id: caseId },
    data: {
      currentDecision: determination.pathway,
    },
  });

  // Write audit event with before/after
  await createAuditEvent({
    organizationId,
    caseId,
    entityType: 'assessment_response_set',
    entityId: assessment.id,
    action: existingAssessment ? 'update' : 'create',
    beforeJson: existingAssessment
      ? { answersJson: existingAssessment.answersJson as Prisma.InputJsonValue }
      : null,
    afterJson: { answersJson: toJsonValue(cleanedAnswers) },
    performedByUserId: userId,
  });

  return assessment;
}
