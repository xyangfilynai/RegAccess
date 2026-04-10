import { prisma } from '../lib/prisma.js';
import { createAuditEvent } from './audit-service.js';
import { executeEngine } from './engine-executor.js';

export { executeEngine } from './engine-executor.js';

const SCHEMA_VERSION = '1.0.0';

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

export async function saveAssessment(
  caseId: string,
  answersJson: Record<string, unknown>,
  organizationId: string,
  userId: string,
) {
  // Verify case belongs to org
  const changeCase = await prisma.changeCase.findFirst({
    where: { id: caseId, organizationId },
  });
  if (!changeCase) {
    throw new Error('Case not found in organization');
  }

  // Get current assessment for audit before/after
  const existingAssessment = await prisma.assessmentResponseSet.findFirst({
    where: { caseId },
    orderBy: { updatedAt: 'desc' },
  });

  // Run authoritative engine execution
  const { derivedState, determination, completenessStatus } =
    executeEngine(answersJson);

  // Upsert assessment
  const assessment = existingAssessment
    ? await prisma.assessmentResponseSet.update({
        where: { id: existingAssessment.id },
        data: {
          answersJson,
          derivedStateJson: derivedState as unknown as Record<string, unknown>,
          engineOutputJson: determination as unknown as Record<string, unknown>,
          completenessStatusJson: completenessStatus as unknown as Record<string, unknown>,
          updatedByUserId: userId,
        },
      })
    : await prisma.assessmentResponseSet.create({
        data: {
          caseId,
          schemaVersion: SCHEMA_VERSION,
          answersJson,
          derivedStateJson: derivedState as unknown as Record<string, unknown>,
          engineOutputJson: determination as unknown as Record<string, unknown>,
          completenessStatusJson: completenessStatus as unknown as Record<string, unknown>,
          updatedByUserId: userId,
        },
      });

  // Update case currentDecision
  await prisma.changeCase.update({
    where: { id: caseId },
    data: {
      currentDecision: determination.pathway,
      currentVersion: { increment: 1 },
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
      ? { answersJson: existingAssessment.answersJson }
      : null,
    afterJson: { answersJson },
    performedByUserId: userId,
  });

  return assessment;
}
