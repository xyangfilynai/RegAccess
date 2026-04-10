import { prisma } from '../lib/prisma.js';
import { createAuditEvent } from './audit-service.js';
import { getCurrentEngineVersion } from './engine-version-service.js';
import type { CreateCase, UpdateCase } from '@changepath/shared';

async function generateCaseNumber(organizationId: string): Promise<string> {
  const count = await prisma.changeCase.count({ where: { organizationId } });
  const seq = (count + 1).toString().padStart(4, '0');
  return `CC-${seq}`;
}

export async function listCases(
  organizationId: string,
  filters?: { status?: string; productId?: string },
) {
  return prisma.changeCase.findMany({
    where: {
      organizationId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.productId && { productId: filters.productId }),
    },
    include: {
      product: { select: { productName: true } },
      caseOwner: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getCase(id: string, organizationId: string) {
  return prisma.changeCase.findFirst({
    where: { id, organizationId },
    include: {
      product: { select: { productName: true } },
      caseOwner: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function createCase(
  data: CreateCase,
  organizationId: string,
  userId: string,
) {
  // Verify product belongs to this org
  const product = await prisma.product.findFirst({
    where: { id: data.productId, organizationId },
  });
  if (!product) {
    throw new Error('Product not found in organization');
  }

  // Lock current engine version
  const engineVersion = await getCurrentEngineVersion();

  const caseNumber = await generateCaseNumber(organizationId);

  const changeCase = await prisma.changeCase.create({
    data: {
      organizationId,
      productId: data.productId,
      caseNumber,
      title: data.title,
      changeSummary: data.changeSummary ?? null,
      changeType: data.changeType ?? null,
      status: 'draft',
      priority: data.priority,
      createdByUserId: userId,
      caseOwnerUserId: data.caseOwnerUserId ?? userId,
      dueDate: data.dueDate ?? null,
      engineVersion: engineVersion.engineVersion,
    },
    include: {
      product: { select: { productName: true } },
      caseOwner: { select: { id: true, name: true } },
    },
  });

  await createAuditEvent({
    organizationId,
    caseId: changeCase.id,
    entityType: 'change_case',
    entityId: changeCase.id,
    action: 'create',
    afterJson: changeCase as unknown as Record<string, unknown>,
    performedByUserId: userId,
  });

  return changeCase;
}

export async function updateCase(
  id: string,
  data: UpdateCase,
  organizationId: string,
  userId: string,
) {
  const existing = await prisma.changeCase.findFirst({
    where: { id, organizationId },
  });
  if (!existing) return null;

  const changeCase = await prisma.changeCase.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.changeSummary !== undefined && { changeSummary: data.changeSummary }),
      ...(data.changeType !== undefined && { changeType: data.changeType }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.caseOwnerUserId !== undefined && { caseOwnerUserId: data.caseOwnerUserId }),
    },
    include: {
      product: { select: { productName: true } },
      caseOwner: { select: { id: true, name: true } },
    },
  });

  await createAuditEvent({
    organizationId,
    caseId: changeCase.id,
    entityType: 'change_case',
    entityId: changeCase.id,
    action: 'update',
    beforeJson: existing as unknown as Record<string, unknown>,
    afterJson: changeCase as unknown as Record<string, unknown>,
    performedByUserId: userId,
  });

  return changeCase;
}
