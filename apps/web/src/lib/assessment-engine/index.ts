/**
 * Re-export everything from @changepath/engine.
 * This file preserves backward compatibility with existing relative imports
 * throughout the web app (e.g., `from '../lib/assessment-engine'`).
 */
export {
  Answer,
  AuthPathway,
  Pathway,
  isAnsweredValue,
  answerAsString,
  answerAsArray,
  answerIsOneOf,
  computeDetermination,
  computeDerivedState,
  getBlockFields,
  getBlocks,
  changeTaxonomy,
  CATEGORY_INTENDED_USE,
  parseNumericAnswer,
} from '@changepath/engine';

export type {
  Answers,
  AnswerValue,
  DeterminationResult,
  DerivedState,
  AssessmentField,
  Block,
  ChangeTypeDefinition,
  ChangeCategoryDefinition,
} from '@changepath/engine';
