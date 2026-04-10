import { AuthPathway, Pathway, type Answers } from '../lib/assessment-engine';

export type AuthPathwayValue = (typeof AuthPathway)[keyof typeof AuthPathway];
export type PathwayValue = (typeof Pathway)[keyof typeof Pathway];

export interface SampleCaseDefinition {
  id: string;
  title: string;
  authPathway: AuthPathwayValue;
  shortScenario: string;
  keyAmbiguity: string;
  tags: string[];
  expectedPathway: PathwayValue;
  expectedPccpRecommendation: boolean;
  visibleQuestionIds: string[];
  answers: Answers;
}
