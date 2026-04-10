import { z } from 'zod';

export const AssessmentResponseSetSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  schemaVersion: z.string(),
  answersJson: z.record(z.unknown()),
  derivedStateJson: z.record(z.unknown()).nullable(),
  engineOutputJson: z.record(z.unknown()).nullable(),
  completenessStatusJson: z.record(z.unknown()).nullable(),
  updatedByUserId: z.string().uuid(),
  updatedAt: z.coerce.date(),
});
export type AssessmentResponseSet = z.infer<typeof AssessmentResponseSetSchema>;

export const SaveAssessmentSchema = z
  .object({
    /** Incremental delta — only the field IDs whose values changed since last sync. */
    delta: z.record(z.unknown()).optional(),
    /** Full snapshot — used for initial save or after a reconciliation. */
    answersJson: z.record(z.unknown()).optional(),
    /**
     * The `updated_at` of the assessment row the client based its edits on.
     * Server rejects with 409 if this is stale (optimistic locking).
     * Null/omitted means "this is the first save for this case".
     */
    expectedUpdatedAt: z.coerce.date().nullable().optional(),
  })
  .refine((v) => v.delta !== undefined || v.answersJson !== undefined, {
    message: 'Either delta or answersJson must be provided',
  });
export type SaveAssessment = z.infer<typeof SaveAssessmentSchema>;

/** Engine execution result returned after server-side engine run */
export const EngineExecutionResultSchema = z.object({
  answersJson: z.record(z.unknown()),
  derivedStateJson: z.record(z.unknown()),
  engineOutputJson: z.record(z.unknown()),
  completenessStatusJson: z.record(z.unknown()),
  updatedAt: z.coerce.date(),
});
export type EngineExecutionResult = z.infer<typeof EngineExecutionResultSchema>;

/** Full assessment response including engine output */
export const AssessmentResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  schemaVersion: z.string(),
  answersJson: z.record(z.unknown()),
  derivedStateJson: z.record(z.unknown()).nullable(),
  engineOutputJson: z.record(z.unknown()).nullable(),
  completenessStatusJson: z.record(z.unknown()).nullable(),
  updatedByUserId: z.string().uuid(),
  updatedAt: z.coerce.date(),
});
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;
