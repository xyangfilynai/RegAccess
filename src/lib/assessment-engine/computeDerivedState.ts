import { Answer, AuthPathway, Answers, answerAsArray } from './types';

export const computeDerivedState = (answers: Answers) => {
  return {
    hasGenAI: answerAsArray(answers.A6).some((m) => m.includes("LLM") || m.includes("Foundation") || m.includes("Generative")),
    isCatIntendedUse: answers.B1 === "Intended Use / Indications for Use",
    hasPCCP: answers.A2 === Answer.Yes,
    isPMA: answers.A1 === AuthPathway.PMA,
    isDeNovo: answers.A1 === AuthPathway.DeNovo,
  };
};
