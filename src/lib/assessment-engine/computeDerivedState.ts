import { Answer, AuthPathway, Answers } from './types';

export const computeDerivedState = (answers: Answers) => {
  return {
    hasGenAI: (answers.A6 || []).some((m: string) => m.includes("LLM") || m.includes("Foundation") || m.includes("Generative")),
    isCatIntendedUse: answers.B1 === "Intended Use / Indications for Use",
    hasPCCP: answers.A2 === Answer.Yes,
    isPMA: answers.A1 === AuthPathway.PMA,
    isDeNovo: answers.A1 === AuthPathway.DeNovo,
  };
};
