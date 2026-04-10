import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for org-scoping in case/product queries.
 *
 * These tests verify that service functions enforce organizationId scoping
 * by mocking the Prisma client. In a full integration test suite, these
 * would run against a real database with multiple orgs.
 */

// Mock Prisma
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    changeCase: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    engineVersionRegistry: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma';
import * as caseService from '../src/services/case-service';
import * as productService from '../src/services/product-service';

const ORG_A = '00000000-0000-4000-a000-aaaaaaaaaaaa';
const ORG_B = '00000000-0000-4000-a000-bbbbbbbbbbbb';
const USER_A = '00000000-0000-4000-a000-000000000010';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('case org-scoping', () => {
  it('listCases filters by organizationId', async () => {
    const mockFindMany = vi.mocked(prisma.changeCase.findMany);
    mockFindMany.mockResolvedValue([]);

    await caseService.listCases(ORG_A);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG_A }),
      }),
    );
  });

  it('getCase rejects case from different org', async () => {
    const mockFindFirst = vi.mocked(prisma.changeCase.findFirst);
    mockFindFirst.mockResolvedValue(null);

    const result = await caseService.getCase('some-case-id', ORG_B);

    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG_B }),
      }),
    );
  });
});

describe('product org-scoping', () => {
  it('listProducts filters by organizationId', async () => {
    const mockFindMany = vi.mocked(prisma.product.findMany);
    mockFindMany.mockResolvedValue([]);

    await productService.listProducts(ORG_A);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_A },
      }),
    );
  });

  it('getProduct rejects product from different org', async () => {
    const mockFindFirst = vi.mocked(prisma.product.findFirst);
    mockFindFirst.mockResolvedValue(null);

    const result = await productService.getProduct('some-product-id', ORG_B);

    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG_B }),
      }),
    );
  });

  it('updateProduct checks org scope before updating', async () => {
    const mockFindFirst = vi.mocked(prisma.product.findFirst);
    mockFindFirst.mockResolvedValue(null);

    const result = await productService.updateProduct(
      'some-product-id',
      { productName: 'Hacked Name' },
      ORG_B,
      USER_A,
    );

    expect(result).toBeNull();
    // Should NOT have called update
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});
