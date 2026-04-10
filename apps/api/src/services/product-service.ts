import { prisma } from '../lib/prisma.js';
import { createAuditEvent } from './audit-service.js';
import type { CreateProduct, UpdateProduct } from '@changepath/shared';

export async function listProducts(organizationId: string) {
  return prisma.product.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProduct(id: string, organizationId: string) {
  return prisma.product.findFirst({
    where: { id, organizationId },
  });
}

export async function createProduct(
  data: CreateProduct,
  organizationId: string,
  userId: string,
) {
  const product = await prisma.product.create({
    data: {
      organizationId,
      productName: data.productName,
      deviceFamily: data.deviceFamily ?? null,
      deviceClass: data.deviceClass,
      regulatoryPathwayBaseline: data.regulatoryPathwayBaseline,
      predicateDevice: data.predicateDevice ?? null,
      pccpStatus: data.pccpStatus,
      softwareLevelOfConcern: data.softwareLevelOfConcern,
      jurisdictionsJson: data.jurisdictionsJson ?? null,
    },
  });

  await createAuditEvent({
    organizationId,
    entityType: 'product',
    entityId: product.id,
    action: 'create',
    afterJson: product as unknown as Record<string, unknown>,
    performedByUserId: userId,
  });

  return product;
}

export async function updateProduct(
  id: string,
  data: UpdateProduct,
  organizationId: string,
  userId: string,
) {
  const existing = await prisma.product.findFirst({
    where: { id, organizationId },
  });
  if (!existing) return null;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(data.productName !== undefined && { productName: data.productName }),
      ...(data.deviceFamily !== undefined && { deviceFamily: data.deviceFamily }),
      ...(data.deviceClass !== undefined && { deviceClass: data.deviceClass }),
      ...(data.regulatoryPathwayBaseline !== undefined && { regulatoryPathwayBaseline: data.regulatoryPathwayBaseline }),
      ...(data.predicateDevice !== undefined && { predicateDevice: data.predicateDevice }),
      ...(data.pccpStatus !== undefined && { pccpStatus: data.pccpStatus }),
      ...(data.softwareLevelOfConcern !== undefined && { softwareLevelOfConcern: data.softwareLevelOfConcern }),
      ...(data.jurisdictionsJson !== undefined && { jurisdictionsJson: data.jurisdictionsJson }),
    },
  });

  await createAuditEvent({
    organizationId,
    entityType: 'product',
    entityId: product.id,
    action: 'update',
    beforeJson: existing as unknown as Record<string, unknown>,
    afterJson: product as unknown as Record<string, unknown>,
    performedByUserId: userId,
  });

  return product;
}
