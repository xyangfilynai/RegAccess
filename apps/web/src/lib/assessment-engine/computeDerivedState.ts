import { Answer, AuthPathway, Answers, answerAsArray } from './types';
import { CATEGORY_INTENDED_USE } from './changeTaxonomy';

export const computeDerivedState = (answers: Answers) => {
  return {
    hasGenAI: answerAsArray(answers.A6).some(
      (m) => m.includes('LLM') || m.includes('Foundation') || m.includes('Generative'),
    ),
    isCatIntendedUse: answers.B1 === CATEGORY_INTENDED_USE,
    hasPCCP: answers.A2 === Answer.Yes,
    isPMA: answers.A1 === AuthPathway.PMA,
    isDeNovo: answers.A1 === AuthPathway.DeNovo,
  };
};
