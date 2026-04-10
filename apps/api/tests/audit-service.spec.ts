import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    auditEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma';
import { createAuditEvent, getAuditEventsForCase } from '../src/services/audit-service';

const ORG_ID = '00000000-0000-4000-a000-000000000001';
const CASE_ID = '00000000-0000-4000-a000-000000000030';
const USER_ID = '00000000-0000-4000-a000-000000000010';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createAuditEvent', () => {
  it('creates an audit event with correct fields', async () => {
    const mockCreate = vi.mocked(prisma.auditEvent.create);
    mockCreate.mockResolvedValue({
      id: 'event-1',
      organizationId: ORG_ID,
      caseId: CASE_ID,
      entityType: 'change_case',
      entityId: CASE_ID,
      action: 'update',
      beforeJson: { status: 'draft' },
      afterJson: { status: 'in_authoring' },
      performedByUserId: USER_ID,
      performedAt: new Date(),
      reason: null,
      ipAddress: null,
    });

    await createAuditEvent({
      organizationId: ORG_ID,
      caseId: CASE_ID,
      entityType: 'change_case',
      entityId: CASE_ID,
      action: 'update',
      beforeJson: { status: 'draft' },
      afterJson: { status: 'in_authoring' },
      performedByUserId: USER_ID,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        caseId: CASE_ID,
        entityType: 'change_case',
        entityId: CASE_ID,
        action: 'update',
        performedByUserId: USER_ID,
      }),
    });
  });

  it('allows null caseId for non-case entities', async () => {
    const mockCreate = vi.mocked(prisma.auditEvent.create);
    mockCreate.mockResolvedValue({
      id: 'event-2',
      organizationId: ORG_ID,
      caseId: null,
      entityType: 'product',
      entityId: 'product-1',
      action: 'create',
      beforeJson: null,
      afterJson: { productName: 'Test' },
      performedByUserId: USER_ID,
      performedAt: new Date(),
      reason: null,
      ipAddress: null,
    });

    await createAuditEvent({
      organizationId: ORG_ID,
      entityType: 'product',
      entityId: 'product-1',
      action: 'create',
      afterJson: { productName: 'Test' },
      performedByUserId: USER_ID,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        caseId: null,
        entityType: 'product',
      }),
    });
  });

  it('stores before/after snapshots for assessment updates', async () => {
    const mockCreate = vi.mocked(prisma.auditEvent.create);
    mockCreate.mockResolvedValue({
      id: 'event-3',
      organizationId: ORG_ID,
      caseId: CASE_ID,
      entityType: 'assessment_response_set',
      entityId: 'assessment-1',
      action: 'update',
      beforeJson: { answersJson: { A1: '510(k)' } },
      afterJson: { answersJson: { A1: '510(k)', B1: 'Training Data' } },
      performedByUserId: USER_ID,
      performedAt: new Date(),
      reason: null,
      ipAddress: null,
    });

    await createAuditEvent({
      organizationId: ORG_ID,
      caseId: CASE_ID,
      entityType: 'assessment_response_set',
      entityId: 'assessment-1',
      action: 'update',
      beforeJson: { answersJson: { A1: '510(k)' } },
      afterJson: { answersJson: { A1: '510(k)', B1: 'Training Data' } },
      performedByUserId: USER_ID,
    });

    const callData = mockCreate.mock.calls[0][0].data;
    expect(callData.beforeJson).toEqual({ answersJson: { A1: '510(k)' } });
    expect(callData.afterJson).toEqual({
      answersJson: { A1: '510(k)', B1: 'Training Data' },
    });
  });
});

describe('getAuditEventsForCase', () => {
  it('filters by both caseId and organizationId', async () => {
    const mockFindMany = vi.mocked(prisma.auditEvent.findMany);
    mockFindMany.mockResolvedValue([]);

    await getAuditEventsForCase(CASE_ID, ORG_ID);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { caseId: CASE_ID, organizationId: ORG_ID },
      }),
    );
  });
});
