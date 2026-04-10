import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const toJsonValue = (value: Record<string, unknown> | null): Prisma.InputJsonValue | undefined =>
  value === null ? undefined : (value as Prisma.InputJsonValue);

/**
 * Per-org feature flag service.
 *
 * Phase 3+ features (evidence uploads, comments, reviews, exports) gate
 * themselves on these flags so we can roll them out to specific orgs
 * without redeploying.
 *
 * The current implementation reads on every call. A future enhancement
 * may cache reads per request.
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
}

export const FEATURE_FLAGS = Object.freeze({
  EvidenceUploads: 'evidence_uploads',
  Comments: 'comments',
  Reviews: 'reviews',
  Exports: 'exports',
  SectionLocking: 'section_locking',
} as const);

export async function isFeatureEnabled(
  organizationId: string,
  flagKey: string,
): Promise<boolean> {
  const flag = await prisma.organizationFeatureFlag.findUnique({
    where: { organizationId_flagKey: { organizationId, flagKey } },
  });
  return flag?.enabled ?? false;
}

export async function listFeatureFlags(organizationId: string): Promise<FeatureFlag[]> {
  const flags = await prisma.organizationFeatureFlag.findMany({
    where: { organizationId },
  });
  return flags.map((f) => ({
    key: f.flagKey,
    enabled: f.enabled,
    config: (f.configJson as Record<string, unknown> | null) ?? null,
  }));
}

export async function setFeatureFlag(
  organizationId: string,
  flagKey: string,
  enabled: boolean,
  config: Record<string, unknown> | null = null,
): Promise<FeatureFlag> {
  const flag = await prisma.organizationFeatureFlag.upsert({
    where: { organizationId_flagKey: { organizationId, flagKey } },
    create: {
      organizationId,
      flagKey,
      enabled,
      configJson: toJsonValue(config),
    },
    update: {
      enabled,
      configJson: toJsonValue(config),
    },
  });
  return {
    key: flag.flagKey,
    enabled: flag.enabled,
    config: (flag.configJson as Record<string, unknown> | null) ?? null,
  };
}
