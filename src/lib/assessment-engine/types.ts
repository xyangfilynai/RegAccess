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

export type Answers = Record<string, any>;

export const isAnsweredValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return value !== undefined && value !== null;
};

