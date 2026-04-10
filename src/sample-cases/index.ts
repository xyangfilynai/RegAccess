export { SAMPLE_CASES } from './cases';
export type { SampleCaseDefinition, AuthPathwayValue, PathwayValue } from './types';

import { SAMPLE_CASES } from './cases';

export const SAMPLE_CASES_BY_ID = Object.fromEntries(SAMPLE_CASES.map((sampleCase) => [sampleCase.id, sampleCase]));
