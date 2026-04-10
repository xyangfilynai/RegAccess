import { z } from 'zod';

export const CaseStatus = z.enum([
  'draft',
  'in_authoring',
  'in_cross_functional_review',
  'changes_requested',
  'approval_pending',
  'approved',
  'exported',
  'reopened',
  'archived',
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

export const CasePriority = z.enum(['low', 'medium', 'high', 'critical']);
export type CasePriority = z.infer<typeof CasePriority>;

export const ChangeCaseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  caseNumber: z.string(),
  title: z.string().min(1).max(500),
  changeSummary: z.string().nullable(),
  changeType: z.string().nullable(),
  status: CaseStatus,
  priority: CasePriority,
  createdByUserId: z.string().uuid(),
  caseOwnerUserId: z.string().uuid(),
  dueDate: z.coerce.date().nullable(),
  currentDecision: z.string().nullable(),
  currentVersion: z.number().int().positive(),
  engineVersion: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ChangeCase = z.infer<typeof ChangeCaseSchema>;

export const CreateCaseSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().min(1).max(500),
  changeSummary: z.string().optional().nullable(),
  changeType: z.string().optional().nullable(),
  priority: CasePriority.default('medium'),
  dueDate: z.coerce.date().optional().nullable(),
  caseOwnerUserId: z.string().uuid().optional(), // defaults to current user
});
export type CreateCase = z.infer<typeof CreateCaseSchema>;

export const UpdateCaseSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  changeSummary: z.string().optional().nullable(),
  changeType: z.string().optional().nullable(),
  status: CaseStatus.optional(),
  priority: CasePriority.optional(),
  dueDate: z.coerce.date().optional().nullable(),
  caseOwnerUserId: z.string().uuid().optional(),
});
export type UpdateCase = z.infer<typeof UpdateCaseSchema>;

/** Response DTO with joined product name */
export const CaseWithProductSchema = ChangeCaseSchema.extend({
  productName: z.string(),
  caseOwnerName: z.string().nullable(),
});
export type CaseWithProduct = z.infer<typeof CaseWithProductSchema>;
