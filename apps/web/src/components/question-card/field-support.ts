import type { AssessmentField } from '../../lib/assessment-engine';

/**
 * Whether a field has any supporting context (help text, reasoning, guidance,
 * notes, etc.) that the SupportSection should render.
 *
 * Used by both QuestionCard (to control spacing) and SupportSection (to decide
 * whether to render at all). Centralised here to keep the two in sync.
 */
export const hasSupportingContext = (field: AssessmentField, qReasoning: unknown): boolean =>
  Boolean(
    field.help ||
    qReasoning ||
    field.mlguidance ||
    field.infoNote ||
    field.classificationGuidance ||
    field.selectedTypeData ||
    field.autoWarn ||
    field.boundaryNote,
  );
