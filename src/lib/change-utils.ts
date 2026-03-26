/**
 * Shared utilities for change-context extraction and text formatting.
 * Used by review-insights, case-specific-reasoning, and other analysis modules.
 */

import { changeTaxonomy, type Answers } from './assessment-engine';

export interface SelectedChangeContext {
  category: string | null;
  typeName: string;
  description: string | null;
  pccpNote: string | null;
}

export const joinWithAnd = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

export const getChangeLabel = (answers: Answers, fallback = 'the reported change'): string =>
  (answers.B2 as string) || (answers.B1 as string) || fallback;

export const getSelectedChangeContext = (answers: Answers): SelectedChangeContext | null => {
  const category = typeof answers.B1 === 'string' && answers.B1.trim() ? answers.B1.trim() : null;
  const typeName = typeof answers.B2 === 'string' && answers.B2.trim() ? answers.B2.trim() : null;
  if (!category && !typeName) return null;

  const categoryConfig = category ? changeTaxonomy[category] : null;
  const typeConfig = typeName
    ? categoryConfig?.types?.find((type: { name: string }) => type.name === typeName)
    : null;

  return {
    category,
    typeName: typeName || category || 'the reported change',
    description: typeConfig?.desc || null,
    pccpNote: typeConfig?.pccpNote || null,
  };
};
