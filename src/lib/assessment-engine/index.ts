export { Answer, AuthPathway, Pathway, isAnsweredValue, answerAsString, answerAsArray, answerIsOneOf } from './types';
export type { Answers, AnswerValue } from './types';
export { computeDetermination } from './computeDetermination';
export type { DeterminationResult } from './computeDetermination';
export { computeDerivedState } from './computeDerivedState';
export { getBlockFields, getBlocks } from './getQuestions';
export type { DerivedState, AssessmentField, Block } from './getQuestions';
export {
  changeTaxonomy,
  CATEGORY_INTENDED_USE,
  CATEGORY_POST_MARKET,
  CHANGE_MONITORING_THRESHOLD_PREFIX,
} from './changeTaxonomy';
