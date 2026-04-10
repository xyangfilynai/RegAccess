import { Answer, answerAsString, type Answers } from './assessment-engine';

export interface CaseSummaryItem {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'success' | 'info';
}

export const buildCaseSummary = (answers: Answers): CaseSummaryItem[] => [
  {
    label: 'Authorization',
    value: answerAsString(answers.A1) || 'Not provided',
    tone: answers.A1 ? 'default' : 'warning',
  },
  {
    label: 'Authorization ID',
    value: answerAsString(answers.A1b) || 'Not provided',
    tone: !answers.A1b ? 'warning' : 'default',
  },
  {
    label: 'Authorized baseline',
    value: answerAsString(answers.A1c) || 'Not provided',
    tone: !answers.A1c ? 'warning' : 'default',
  },
  {
    label: 'Change',
    value: answerAsString(answers.B2) || answerAsString(answers.B1) || 'Not classified',
    tone: answers.B2 || answers.B1 ? 'info' : 'default',
  },
  {
    label: 'PCCP',
    value:
      answers.A2 === Answer.Yes
        ? 'Authorized PCCP on file'
        : answers.A2 === Answer.No
          ? 'No authorized PCCP'
          : 'Not specified',
    tone: answers.A2 === Answer.Yes ? 'success' : 'default',
  },
];

export const buildAssessmentName = (answers: Answers): string => {
  const authorization = answerAsString(answers.A1);
  const authorizationId = answerAsString(answers.A1b);
  const change = answerAsString(answers.B2) || answerAsString(answers.B1);

  if (authorizationId && change) return `${authorizationId} - ${change}`;
  if (authorization && change) return `${authorization} - ${change}`;
  if (authorizationId) return `Assessment - ${authorizationId}`;
  if (change) return `Assessment - ${change}`;
  if (authorization) return `Assessment - ${authorization}`;
  return 'Assessment draft';
};
