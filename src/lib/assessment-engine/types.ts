export const Answer = Object.freeze({
  Yes: "Yes" as const,
  No: "No" as const,
  Uncertain: "Uncertain" as const,
});

export const AuthPathway = Object.freeze({
  FiveOneZeroK: "510(k)" as const,
  DeNovo: "De Novo" as const,
  PMA: "PMA" as const,
});

export const Pathway = Object.freeze({
  LetterToFile: "Letter to File" as const,
  ImplementPCCP: "Implement Under Authorized PCCP" as const,
  NewSubmission: "New Submission Required" as const,
  PMASupplementRequired: "PMA Supplement Required" as const,
  PMAAnnualReport: "PMA Annual Report / Letter to File" as const,
  AssessmentIncomplete: "Assessment Incomplete" as const,
});

export type AnswerValue = string | string[] | undefined;
export type Answers = Record<string, AnswerValue>;

/** Check if an answer value is one of the given string options. */
export const answerIsOneOf = (value: AnswerValue, options: readonly string[]): boolean =>
  typeof value === 'string' && options.includes(value);

/** Safely read an answer value as a string (returns '' if array or undefined). */
export const answerAsString = (value: AnswerValue): string =>
  typeof value === 'string' ? value : '';

/** Safely read an answer value as a string array (returns [] if string or undefined). */
export const answerAsArray = (value: AnswerValue): string[] =>
  Array.isArray(value) ? value : [];

export const isAnsweredValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return value !== undefined && value !== null;
};

