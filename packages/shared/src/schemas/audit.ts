import { z } from 'zod';

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  caseId: z.string().uuid().nullable(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  beforeJson: z.record(z.unknown()).nullable(),
  afterJson: z.record(z.unknown()).nullable(),
  performedByUserId: z.string().uuid(),
  performedAt: z.coerce.date(),
  reason: z.string().nullable(),
  ipAddress: z.string().nullable(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
