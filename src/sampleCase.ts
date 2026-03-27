import { DEFAULT_SAMPLE_CASE_ID, SAMPLE_CASES, SAMPLE_CASES_BY_ID } from './sample-cases';

export {
  DEFAULT_SAMPLE_CASE_ID,
  SAMPLE_CASES,
  SAMPLE_CASES_BY_ID,
} from './sample-cases';

export type { SampleCaseDefinition } from './sample-cases';

export const SAMPLE_CASE = { ...SAMPLE_CASES_BY_ID[DEFAULT_SAMPLE_CASE_ID].answers };
