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

export const SaveAssessmentSchema = z.object({
  answersJson: z.record(z.unknown()),
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
