import { prisma } from '../lib/prisma.js';

interface CreateAuditEventInput {
  organizationId: string;
  caseId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  performedByUserId: string;
  reason?: string | null;
  ipAddress?: string | null;
}

export async function createAuditEvent(input: CreateAuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      caseId: input.caseId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.beforeJson ?? null,
      afterJson: input.afterJson ?? null,
      performedByUserId: input.performedByUserId,
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function getAuditEventsForCase(caseId: string, organizationId: string) {
  return prisma.auditEvent.findMany({
    where: {
      caseId,
      organizationId,
    },
    orderBy: { performedAt: 'desc' },
    include: {
      performedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}
