import {
  Answer,
  AuthPathway,
  computeDerivedState,
  getBlocks,
  getBlockFields,
  type Answers,
} from '../src/lib/assessment-engine';

export const base510k = (overrides: Answers = {}): Answers => ({
  A1: AuthPathway.FiveOneZeroK,
  A1b: 'K123456',
  A1c: 'v1.0',
  A1d: 'Authorized IFU statement',
  A2: Answer.No,
  A6: ['Traditional ML (e.g., random forest, SVM)'],
  B3: Answer.No,
  C1: Answer.No,
  C2: Answer.No,
  C3: Answer.No,
  C4: Answer.No,
  C5: Answer.No,
  C6: Answer.No,
  ...overrides,
});

export const baseDeNovo = (overrides: Answers = {}): Answers => base510k({ A1: AuthPathway.DeNovo, ...overrides });

export const basePMA = (overrides: Answers = {}): Answers => ({
  A1: AuthPathway.PMA,
  A1b: 'P123456',
  A1c: 'v1.0',
  A1d: 'Authorized IFU statement',
  A2: Answer.No,
  A6: ['Traditional ML (e.g., random forest, SVM)'],
  B3: Answer.No,
  ...overrides,
});

/* ------------------------------------------------------------------ */
/*  Field-visibility helpers                                           */
/* ------------------------------------------------------------------ */

/** Find a field definition by ID within a block, computing derived state automatically. */
export const findField = (blockId: string, answers: Answers, fieldId: string) => {
  const ds = computeDerivedState(answers);
  return getBlockFields(blockId, answers, ds).find((q) => q.id === fieldId);
};

/** Returns true if a field exists in the block and is not skipped. */
export const isFieldVisible = (blockId: string, answers: Answers, fieldId: string) => {
  const q = findField(blockId, answers, fieldId);
  return q !== undefined && !q.skip;
};

/** Returns true if a field does not exist in the block or is skipped. */
export const isFieldHidden = (blockId: string, answers: Answers, fieldId: string) => {
  return !isFieldVisible(blockId, answers, fieldId);
};

/** Returns the ordered list of visible block IDs for a given set of answers. */
export const getVisibleBlockIds = (answers: Answers) => {
  const ds = computeDerivedState(answers);
  return getBlocks(answers, ds).map((b) => b.id);
};
