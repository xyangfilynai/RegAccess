import {
  Answer,
  AuthPathway,
  Pathway,
  changeTaxonomy,
  isAnsweredValue,
  type Answers,
  type Block,
  type DeterminationResult,
  type Question,
} from './assessment-engine';
import { ruleReasoningLibrary } from './content';

export interface CaseSpecificReasoning {
  ruleKey: string | null;
  primaryReason: string;
  narrative: string[];
  decisionPath: string[];
  verificationTitle: string | null;
  verificationSteps: string[];
  counterTitle: string | null;
  counterConsiderations: string[];
  sources: string[];
}

interface SelectedChangeContext {
  category: string | null;
  typeName: string;
  description: string | null;
  pccpNote: string | null;
}

const pushUnique = (items: string[], value: string | null | undefined) => {
  if (!value) return;
  const normalized = value.trim();
  if (!normalized || items.includes(normalized)) return;
  items.push(normalized);
};

const addSources = (sources: string[], raw: string | null | undefined) => {
  if (!raw) return;
  raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => pushUnique(sources, part));
};

const truncate = (value: string | null | undefined, max = 340): string | null => {
  if (!value) return null;
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return null;
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trimEnd()}...`;
};

const getAuthorizationDescriptor = (answers: Answers): string => {
  if (answers.A1 === AuthPathway.FiveOneZeroK) return 'a 510(k)-cleared device';
  if (answers.A1 === AuthPathway.DeNovo) return 'a De Novo-authorized device';
  if (answers.A1 === AuthPathway.PMA) return 'a PMA-approved device';
  return 'the device under assessment';
};

const getChangeLabel = (answers: Answers): string => {
  return (answers.B2 as string) || (answers.B1 as string) || 'the change under assessment';
};

const getPCCPStatusText = (answers: Answers): string => {
  if (answers.A2 === Answer.Yes) return 'An authorized PCCP is on file.';
  if (answers.A2 === Answer.No) return 'No authorized PCCP is on file.';
  return 'PCCP status is not yet confirmed.';
};

const getSubmittedCaseSentence = (answers: Answers): string | null => {
  const excerpt = truncate(answers.B4 as string | undefined);
  return excerpt ? `Case-specific facts taken from the submitted change description: ${excerpt}` : null;
};

const joinWithAnd = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const getMissingCriticalQuestions = (
  answers: Answers,
  blocks: Block[],
  getQuestionsForBlock: (blockId: string) => Question[],
): string[] => {
  const missing: string[] = [];
  blocks.forEach((block) => {
    if (block.id === 'review') return;
    getQuestionsForBlock(block.id).forEach((question) => {
      if (question.sectionDivider || question.skip || !question.pathwayCritical) return;
      if (isAnsweredValue(answers[question.id])) return;
      pushUnique(missing, question.q || question.label || question.id);
    });
  });
  return missing;
};

const getSelectedChangeContext = (answers: Answers): SelectedChangeContext | null => {
  const category = typeof answers.B1 === 'string' && answers.B1.trim() ? answers.B1.trim() : null;
  const typeName = typeof answers.B2 === 'string' && answers.B2.trim() ? answers.B2.trim() : null;
  if (!category && !typeName) return null;

  const categoryConfig = category ? changeTaxonomy[category] : null;
  const typeConfig = typeName
    ? categoryConfig?.types?.find((type: { name: string }) => type.name === typeName)
    : null;

  return {
    category,
    typeName: typeName || category || 'the reported change',
    description: typeConfig?.desc || null,
    pccpNote: typeConfig?.pccpNote || null,
  };
};

const getReasoningSectionTitles = (
  pathway: string,
): { verificationTitle: string | null; counterTitle: string | null } => {
  if (pathway === Pathway.AssessmentIncomplete) {
    return {
      verificationTitle: 'What Would Resolve This Case',
      counterTitle: 'What Would Still Keep This Case Open',
    };
  }
  if (pathway === Pathway.ImplementPCCP) {
    return {
      verificationTitle: 'What Must Be Confirmed Before Implementation',
      counterTitle: 'What Would Break PCCP Eligibility',
    };
  }
  if (pathway === Pathway.LetterToFile || pathway === Pathway.PMAAnnualReport) {
    return {
      verificationTitle: 'What Evidence Supports Staying On This Route',
      counterTitle: 'What Would Escalate This Case',
    };
  }
  return {
    verificationTitle: 'What Evidence Confirms This Route',
    counterTitle: 'What Would Need To Change To Avoid This Route',
  };
};

const getAnswerResolutionVerb = (answer: unknown): string => (
  answer === Answer.Uncertain ? 'Resolve' : 'Support'
);

const getChangeSpecificVerificationStep = (
  changeContext: SelectedChangeContext | null,
): string | null => {
  if (!changeContext) return null;

  switch (changeContext.typeName) {
    case 'Layer addition / removal':
      return 'For the reported "Layer addition / removal" change, document exactly which layers were added or removed, where they sit in the model, and whether they change feature extraction, post-processing, thresholding, guardrails, monitoring, or clinician-facing behavior.';
    case 'Additional data — new clinical sites':
      return 'For the reported "Additional data — new clinical sites" change, document the new sites, acquisition systems, protocols, subgroup mix, and whether the added data stays within the authorized population and operating conditions.';
    case 'Additional data — expanded demographics':
      return 'For the reported "Additional data — expanded demographics" change, document the exact demographic expansion, the authorized population boundary, and whether the modified device remains inside that boundary.';
    case 'Decision threshold adjustment':
      return 'For the reported "Decision threshold adjustment" change, document the exact before/after threshold, the clinical rationale for the shift, and the resulting sensitivity/specificity tradeoff at the cleared operating point.';
    case 'Base / foundation model swap':
      return 'For the reported "Base / foundation model swap" change, document the exact before/after model identifiers, provider/version changes, and the validation used to show whether clinical behavior remained within the authorized boundary.';
    case 'Prompt / instruction template change':
      return 'For the reported "Prompt / instruction template change" change, document the exact controlled prompt changes, output constraints, and regression testing used to show whether clinical behavior stayed within scope.';
    case 'RAG knowledge base update':
      return 'For the reported "RAG knowledge base update" change, document the new sources, coverage boundaries, and retrieval validation used to show whether the device behavior stayed within the authorized clinical scope.';
    case 'Guardrail / safety filter modification':
      return 'For the reported "Guardrail / safety filter modification" change, document exactly which guardrails changed, what unsafe outputs or workflows they control, and whether the change strengthens, weakens, or replaces an existing risk control.';
    case 'Monitoring threshold change':
      return 'For the reported "Monitoring threshold change" change, document the exact before/after threshold, the signals affected, and whether the revised threshold weakens, delays, or narrows detection of emerging safety or performance issues.';
    default:
      break;
  }

  switch (changeContext.category) {
    case 'Training Data':
      return `For the reported "${changeContext.typeName}" change, document dataset provenance, subgroup composition, and whether the modified training set remains within the authorized population, sites, and acquisition conditions.`;
    case 'Model Architecture':
      return `For the reported "${changeContext.typeName}" change, document the exact before/after architecture and whether the modification changes any component that affects risk controls, post-processing, or clinician-facing outputs.`;
    case 'Preprocessing & Feature Engineering':
      return `For the reported "${changeContext.typeName}" change, document the exact before/after preprocessing or feature pipeline and where the modified logic changes the inputs seen by the cleared decision path.`;
    case 'Clinical Output & Decision Thresholds':
      return `For the reported "${changeContext.typeName}" change, document the exact before/after operating point or output behavior and the resulting effect on sensitivity, specificity, alerting, or clinician interpretation.`;
    case 'Intended Use / Indications for Use':
      return `For the reported "${changeContext.typeName}" change, document the exact authorized IFU language and the exact post-change claim, population, setting, or output scope being compared.`;
    case 'Deployment & Infrastructure':
      return `For the reported "${changeContext.typeName}" change, document the before/after deployment environment, software stack, and any numerical, latency, or integration effects that could change device behavior.`;
    case 'Continuous Learning / Periodic Retraining':
      return `For the reported "${changeContext.typeName}" change, document the retraining trigger, data eligibility, training procedure, acceptance criteria, and rollback/monitoring controls actually used for this update.`;
    case 'Labeling & Clinical User Interface':
      return `For the reported "${changeContext.typeName}" change, document the exact before/after clinician-facing behavior and whether the presentation change affects interpretation, workflow, or user reliance.`;
    case 'Foundation Model / Generative AI':
      return `For the reported "${changeContext.typeName}" change, document the exact before/after model or prompt configuration, the governed inputs/outputs, and the validation used to show whether clinical behavior remained within the authorized boundary.`;
    case 'Post-Market Surveillance':
      return `For the reported "${changeContext.typeName}" change, document the before/after monitoring logic and whether any safety-signal detection or escalation threshold became weaker, delayed, or narrower.`;
    case 'Cybersecurity':
      return `For the reported "${changeContext.typeName}" change, document the exact software components touched and the analysis showing whether any inference, preprocessing, latency, or clinical workflow behavior changed.`;
    default:
      return null;
  }
};

const getQuestionSpecificVerificationStep = (
  questionId: 'C3' | 'C4' | 'C5' | 'C6',
  answer: unknown,
  changeLabel: string,
): string => {
  const prefix = `${getAnswerResolutionVerb(answer)} ${questionId}`;
  switch (questionId) {
    case 'C3':
      return `${prefix} with a hazard-by-hazard analysis showing whether "${changeLabel}" creates a new or modified cause of harm with patient-injury potential, including subgroup and edge-case behavior.`;
    case 'C4':
      return `${prefix} with risk analysis showing whether "${changeLabel}" creates a hazardous situation not present in the current authorized design.`;
    case 'C5':
      return `${prefix} by mapping the before/after design for "${changeLabel}" to every risk control tied to significant harm and stating whether each control is unchanged, strengthened, weakened, or replaced.`;
    case 'C6':
      return `${prefix} with pre/post validation for "${changeLabel}" at the cleared operating point, including subgroup-, site-, modality-, or environment-specific analyses relevant to the change.`;
  }
};

const getRouteChangeConditionForQuestion = (
  questionId: 'C3' | 'C4' | 'C5' | 'C6',
  changeLabel: string,
  pathway: string,
): string => {
  switch (questionId) {
    case 'C3':
      return `This case could move off ${pathway} only if the record supports revising C3 to No with evidence that "${changeLabel}" does not create a new or modified cause of harm with patient-injury potential.`;
    case 'C4':
      return `This case could move off ${pathway} only if the record supports revising C4 to No with evidence that "${changeLabel}" does not introduce a new hazardous situation.`;
    case 'C5':
      return `This case could move off ${pathway} only if the record supports revising C5 to No with evidence that "${changeLabel}" does not materially change any risk control tied to significant harm.`;
    case 'C6':
      return `This case could move off ${pathway} only if the record supports revising C6 to No with evidence that "${changeLabel}" does not materially change clinical performance at the cleared operating point or in affected subgroups/contexts.`;
  }
};

const getRuleKey = (determination: DeterminationResult): string | null => {
  if (determination.isIntendedUseChange) return 'SCREEN-01-Yes';
  if (determination.isIntendedUseUncertain) return 'SCREEN-01-Uncertain';
  if (determination.pathway === Pathway.PMASupplementRequired) return 'PMA-Supplement';
  if (determination.pathway === Pathway.PMAAnnualReport) return 'PMA-AnnualReport';
  if (determination.deNovoDeviceTypeFitFailed) return 'DENOVO-FIT-FAILED';
  if (determination.isCyberOnly) return 'SCREEN-02-Yes';
  if (determination.isBugFix) return 'SCREEN-03-Yes';
  if (determination.pccpScopeVerified) return 'PCCP-Verified';
  if (determination.pccpScopeFailed) return 'PCCP-Failed';
  if (determination.isSignificant) return 'RISK-01-Yes';
  if (determination.pathway === Pathway.LetterToFile) return 'LTF-NonSignificant';
  return null;
};

export function buildCaseSpecificReasoning(
  answers: Answers,
  determination: DeterminationResult,
  blocks: Block[],
  getQuestionsForBlock: (blockId: string) => Question[],
): CaseSpecificReasoning {
  const ruleKey = getRuleKey(determination);
  const ruleReasoning = ruleKey ? ruleReasoningLibrary[ruleKey] : null;
  const sources: string[] = [];
  const narrative: string[] = [];
  const decisionPath: string[] = [];
  const sectionTitles = getReasoningSectionTitles(determination.pathway);
  const verificationSteps: string[] = [];
  const counterConsiderations: string[] = [];

  addSources(sources, ruleReasoning?.source);

  const authDescriptor = getAuthorizationDescriptor(answers);
  const changeLabel = getChangeLabel(answers);
  const changeContext = getSelectedChangeContext(answers);
  const baselineText = answers.A1c
    ? `against authorized baseline "${answers.A1c as string}"`
    : 'against the authorized baseline';
  const authIdText = answers.A1b ? ` (${answers.A1b as string})` : '';
  const caseDescriptionSentence = getSubmittedCaseSentence(answers);
  const missingCriticalQuestions = getMissingCriticalQuestions(answers, blocks, getQuestionsForBlock);

  narrative.push(
    `This assessment concerns ${authDescriptor}${authIdText}, evaluated ${baselineText}, for a change classified as "${changeLabel}". ${getPCCPStatusText(answers)}`,
  );

  if (determination.pathway === Pathway.AssessmentIncomplete) {
    const blockers: string[] = [];

    if (determination.isIntendedUseUncertain) {
      blockers.push('question B3 was answered Uncertain, so the record does not establish whether the change stays within the authorized intended use');
      addSources(sources, '21 CFR 807.81(a)(3); FDA-PCCP-2025 §V');
      pushUnique(
        verificationSteps,
        'Resolve intended-use uncertainty by comparing the authorized Indications for Use statement word-for-word against the post-change device description. If internal review cannot close the gap, use an FDA Pre-Submission (Q-Sub).',
      );
      pushUnique(
        counterConsiderations,
        "Do not force B3 to 'No' just to continue the workflow. Intended-use uncertainty is a threshold issue and can invalidate every downstream conclusion.",
      );
    }

    if (determination.baselineIncomplete) {
      blockers.push('the authorized baseline is incomplete because the authorization identifier, baseline version, or authorized IFU statement is missing');
      addSources(sources, 'FDA-SW-510K-2017; FDA-PCCP-2025 §V');
      pushUnique(
        verificationSteps,
        'Complete the authorization identifier, authorized baseline version, and authorized IFU fields before relying on any pathway conclusion.',
      );
    }

    if (determination.pmaIncomplete) {
      blockers.push('the PMA safety/effectiveness question has not been answered');
      addSources(sources, '21 CFR 814.39(a)');
      pushUnique(
        verificationSteps,
        'Answer the PMA safety/effectiveness question using pre/post evidence tied to the approved device and the proposed change.',
      );
    }

    if (determination.pccpIncomplete) {
      blockers.push('PCCP scope verification is incomplete, so the case cannot be closed under the authorized PCCP path');
      addSources(sources, 'FDA-PCCP-2025 §V–VIII');
      pushUnique(
        verificationSteps,
        'Complete the PCCP scope questions (P1-P5) and confirm change type fit, modification boundaries, validation protocol, monitoring, and cumulative impact.',
      );
    }

    if (determination.significanceIncomplete && missingCriticalQuestions.length > 0) {
      blockers.push(
        `one or more pathway-critical questions are still unanswered: ${joinWithAnd(
          missingCriticalQuestions.map((question) => `"${question}"`),
        )}`,
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-Q4');
      pushUnique(
        verificationSteps,
        'Answer every visible pathway-critical question before treating the U.S. significance assessment as complete.',
      );
    }

    if (determination.hasUncertainSignificance) {
      blockers.push("one or more U.S. significance questions were answered 'Uncertain', so the record does not yet support a final close-out");
      addSources(sources, 'FDA-SW-510K-2017 Q3-Q4');
      pushUnique(
        verificationSteps,
        "Convert each 'Uncertain' significance answer into a documented Yes or No using validation evidence, risk analysis, and clinical/regulatory review.",
      );
      pushUnique(
        counterConsiderations,
        "Under RegAccess's internal conservative policy, unresolved significance uncertainty cannot be treated as a documentation-only conclusion.",
      );
    }

    if (determination.seUncertain) {
      blockers.push('substantial equivalence supportability remains uncertain after the cumulative-change review');
      addSources(sources, '21 CFR 807.87; 21 CFR 807.92');
      pushUnique(
        verificationSteps,
        'Reassess the modified device against the predicate and document why substantial equivalence remains supportable or why a new strategy is needed.',
      );
    }

    narrative.push(
      blockers.length > 0
        ? `The route remains Assessment Incomplete because ${joinWithAnd(blockers)}. On the current record, the assessment does not yet support a reliable final pathway recommendation.`
        : 'The route remains Assessment Incomplete because one or more pathway-critical issues are still unresolved.',
    );

    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push(...blockers.map((blocker) => blocker.charAt(0).toUpperCase() + blocker.slice(1) + '.'));
  } else if (determination.isIntendedUseChange) {
    narrative.push(
      `The route is ${determination.pathway} because question B3 was answered Yes, meaning the proposed change was assessed as affecting the authorized intended use or indications for use. That threshold issue overrides the lower-level exemption, significance, and PCCP implementation branches.`,
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push('B3 was answered Yes, so the case was treated as an intended-use / indications change.');
    decisionPath.push(`Result: ${determination.pathway}.`);
    addSources(sources, '21 CFR 807.81(a)(3); FDA-PCCP-2025 §V');
    pushUnique(
      verificationSteps,
      'Compare the authorized IFU statement and post-change device description word-for-word to document exactly what changed in clinical purpose, population, setting, or outputs.',
    );
    pushUnique(
      counterConsiderations,
      'If reviewers believe the change is still within the original intended use, the record must identify the exact authorized language that supports that position.',
    );
  } else if (determination.isIntendedUseUncertain) {
    narrative.push(
      "The route is Assessment Incomplete because question B3 was answered Uncertain. The current record does not establish whether the proposed change remains within the authorized intended use, so no downstream pathway conclusion is reliable yet.",
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push('B3 was answered Uncertain, so the intended-use threshold question is unresolved.');
    decisionPath.push('Result: Assessment Incomplete until intended-use impact is resolved.');
    addSources(sources, '21 CFR 807.81(a)(3); FDA-PCCP-2025 §V');
    pushUnique(
      verificationSteps,
      'Resolve intended-use uncertainty with senior RA/clinical review or an FDA Pre-Submission before relying on any submission or documentation-only conclusion.',
    );
    pushUnique(
      counterConsiderations,
      'A borderline intended-use question cannot be neutralized by relying on downstream risk questions. Intended use is the threshold decision point.',
    );
  } else if (determination.pathway === Pathway.NewSubmission) {
    const triggerNarratives: string[] = [];
    const triggerDecisionSteps: string[] = [];

    decisionPath.push('B3 was answered No, so the case proceeded through the 510(k)/De Novo software-change significance framework.');
    addSources(sources, '21 CFR 807.81(a)(3)');

    if (answers.C1 === Answer.No && answers.C2 === Answer.No) {
      decisionPath.push('C1 = No and C2 = No, so neither the cybersecurity exemption nor the restore-to-specification exemption supports a documentation-only route.');
      addSources(sources, 'FDA-SW-510K-2017 Q1; FDA-SW-510K-2017 Q2');
    }

    if (answers.C3 === Answer.Yes) {
      triggerNarratives.push(
        'question C3 was answered Yes, so the assessment affirmatively identifies a new or modified cause of harm with patient-injury potential',
      );
      triggerDecisionSteps.push(
        'Risk significance screen (C3): Yes. The record identifies a new or modified cause of harm with patient-injury potential.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3; ISO 14971:2019');
    } else if (answers.C3 === Answer.Uncertain) {
      triggerNarratives.push(
        'question C3 was answered Uncertain, so the assessment did not rule out a new or modified cause of harm with patient-injury potential',
      );
      triggerDecisionSteps.push(
        'Risk significance screen (C3): Uncertain. The record does not rule out a new or modified cause of harm with patient-injury potential.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3; ISO 14971:2019');
    }

    if (answers.C4 === Answer.Yes) {
      triggerNarratives.push('question C4 was answered Yes, so the case introduces an entirely new hazardous situation');
      triggerDecisionSteps.push(
        'Hazardous-situation screen (C4): Yes. The change introduces a new hazardous situation not previously covered by the record.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-HazSit; ISO 14971:2019');
    } else if (answers.C4 === Answer.Uncertain) {
      triggerNarratives.push('question C4 was answered Uncertain, so the record does not rule out a new hazardous situation');
      triggerDecisionSteps.push(
        'Hazardous-situation screen (C4): Uncertain. The record does not rule out a new hazardous situation.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-HazSit; ISO 14971:2019');
    }

    if (answers.C5 === Answer.Yes) {
      triggerNarratives.push(
        'question C5 was answered Yes, so the change affects a risk control for a hazardous situation with significant harm potential',
      );
      triggerDecisionSteps.push(
        'Risk-control screen (C5): Yes. The change touches a control tied to a hazardous situation with significant harm potential.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-RC; ISO 14971:2019');
    } else if (answers.C5 === Answer.Uncertain) {
      triggerNarratives.push('question C5 was answered Uncertain, so the record does not rule out a material risk-control change');
      triggerDecisionSteps.push(
        'Risk-control screen (C5): Uncertain. The record does not rule out a material change to an existing risk control.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-RC; ISO 14971:2019');
    }

    if (answers.C6 === Answer.Yes) {
      triggerNarratives.push('question C6 was answered Yes, so the assessment affirmatively identifies a clinically meaningful performance impact');
      triggerDecisionSteps.push(
        'Clinical performance screen (C6): Yes. The record identifies a clinically meaningful performance impact.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q4');
    } else if (answers.C6 === Answer.Uncertain) {
      triggerNarratives.push('question C6 was answered Uncertain, so the record does not rule out clinically meaningful performance impact');
      triggerDecisionSteps.push(
        'Clinical performance screen (C6): Uncertain. The record does not rule out clinically meaningful performance impact.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q4');
    }

    if (determination.deNovoDeviceTypeFitFailed) {
      triggerNarratives.push('the device no longer clearly fits the De Novo device type / special controls');
      triggerDecisionSteps.push(
        'De Novo fit check: failed. The modified device no longer clearly fits the authorized device type or special controls.',
      );
      addSources(sources, '21 CFR Part 860');
    }

    if (determination.seNotSupportable) {
      triggerNarratives.push('substantial equivalence was not supportable after the cumulative-change review');
      triggerDecisionSteps.push(
        'Cumulative substantial-equivalence review: not supportable. The modified device can no longer be justified against the predicate on the current record.',
      );
      addSources(sources, '21 CFR 807.87; 21 CFR 807.92');
    }

    if (determination.seUncertain) {
      triggerNarratives.push('substantial equivalence remains uncertain after the cumulative-change review');
      triggerDecisionSteps.push(
        'Cumulative substantial-equivalence review: uncertain. The current record does not yet show that substantial equivalence remains supportable.',
      );
      addSources(sources, '21 CFR 807.87; 21 CFR 807.92');
    }

    if (triggerDecisionSteps.length > 0) {
      decisionPath.push(...triggerDecisionSteps);
    }

    if (answers.A2 === Answer.No) {
      decisionPath.push('A2 = No, so there is no authorized PCCP path available for the current change.');
    } else if (determination.pccpScopeFailed) {
      decisionPath.push('An authorized PCCP exists, but the scope-verification answers do not support implementing this change under that PCCP.');
      addSources(sources, 'FDA-PCCP-2025 §V–VI');
    }

    narrative.push(
      `A documentation-only conclusion is not supportable on the current record. ${triggerNarratives.length > 0 ? `${joinWithAnd(triggerNarratives)}. ` : ''}${answers.A2 === Answer.No ? 'Because no authorized PCCP exists, there is also no pre-authorized implementation path for this case. ' : ''}That combination supports ${determination.pathway}.`,
    );

    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push(`Result: ${determination.pathway}.`);

    pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
    if (answers.B4) {
      pushUnique(
        verificationSteps,
        `Tie the route-driving answer(s) for "${changeLabel}" to the specific before/after observations described in the submitted change description, rather than relying only on the change classification.`,
      );
    }
    if ([Answer.Yes, Answer.Uncertain].includes(answers.C3)) {
      pushUnique(verificationSteps, getQuestionSpecificVerificationStep('C3', answers.C3, changeLabel));
    }
    if ([Answer.Yes, Answer.Uncertain].includes(answers.C4)) {
      pushUnique(verificationSteps, getQuestionSpecificVerificationStep('C4', answers.C4, changeLabel));
    }
    if ([Answer.Yes, Answer.Uncertain].includes(answers.C5)) {
      pushUnique(verificationSteps, getQuestionSpecificVerificationStep('C5', answers.C5, changeLabel));
    }
    if ([Answer.Yes, Answer.Uncertain].includes(answers.C6)) {
      pushUnique(verificationSteps, getQuestionSpecificVerificationStep('C6', answers.C6, changeLabel));
    }
    if ([Answer.Yes, Answer.Uncertain].includes(answers.E3) || answers.E1 === Answer.Uncertain || answers.E4 === Answer.No) {
      pushUnique(
        verificationSteps,
        `Update the subgroup and bias evidence package for "${changeLabel}" so the populations, environments, and protected groups affected by this case are explicitly covered.`,
      );
      addSources(sources, 'FDA-LIFECYCLE-2025 §IV.B');
    }

    if ([Answer.Yes, Answer.Uncertain].includes(answers.C3)) {
      pushUnique(counterConsiderations, getRouteChangeConditionForQuestion('C3', changeLabel, determination.pathway));
    }
    if ([Answer.Yes, Answer.Uncertain].includes(answers.C4)) {
      pushUnique(counterConsiderations, getRouteChangeConditionForQuestion('C4', changeLabel, determination.pathway));
    }
    if ([Answer.Yes, Answer.Uncertain].includes(answers.C5)) {
      pushUnique(counterConsiderations, getRouteChangeConditionForQuestion('C5', changeLabel, determination.pathway));
    }
    if ([Answer.Yes, Answer.Uncertain].includes(answers.C6)) {
      pushUnique(counterConsiderations, getRouteChangeConditionForQuestion('C6', changeLabel, determination.pathway));
    }
    if (determination.seNotSupportable) {
      pushUnique(
        counterConsiderations,
        `This case could move off ${determination.pathway} only if substantial equivalence can be re-established against the predicate on the current cumulative-change record.`,
      );
    }
    if (determination.seUncertain) {
      pushUnique(
        counterConsiderations,
        `This case could move off ${determination.pathway} only if the cumulative-change review supports a definitive substantial-equivalence conclusion rather than leaving it unresolved.`,
      );
    }
    if (determination.deNovoDeviceTypeFitFailed) {
      pushUnique(
        counterConsiderations,
        `This case could move off ${determination.pathway} only if the modified device can still be shown to fit the existing De Novo device type and special controls.`,
      );
    }
  } else if (determination.pathway === Pathway.LetterToFile) {
    if (determination.isCyberOnly) {
      narrative.push(
        'The route is Letter to File because C1 was answered Yes and the change was assessed as solely strengthening cybersecurity with no intended-use change and no claimed performance or functional impact.',
      );
      decisionPath.push('B3 was answered No, so the case stayed within the software-change framework.');
      decisionPath.push('C1 was answered Yes, so the cybersecurity exemption is the basis for the documentation-only route.');
      addSources(sources, 'FDA-SW-510K-2017 Q1; FDA-CYBER-2026');
      pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
      pushUnique(
        verificationSteps,
        'Retain the evidence showing zero functional or clinical-performance impact from the cybersecurity update.',
      );
      pushUnique(
        counterConsiderations,
        `This case would leave ${determination.pathway} if the cybersecurity update changes any model behavior, preprocessing, dependency behavior, latency profile, or clinician-facing workflow instead of only strengthening security controls.`,
      );
    } else if (determination.isBugFix) {
      narrative.push(
        'The route is Letter to File because C2 was answered Yes and the change was assessed as restoring the device to a known, documented, previously authorized specification.',
      );
      decisionPath.push('B3 was answered No, so the case stayed within the software-change framework.');
      decisionPath.push('C2 was answered Yes, so the restore-to-specification exemption is the basis for the documentation-only route.');
      addSources(sources, 'FDA-SW-510K-2017 Q2');
      pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
      pushUnique(
        verificationSteps,
        'Retain the version-controlled evidence showing the change restores the device to the previously authorized configuration.',
      );
      pushUnique(
        counterConsiderations,
        `This case would leave ${determination.pathway} if the target restored state cannot be shown to match a previously authorized configuration exactly.`,
      );
    } else {
      narrative.push(
        'The route is Letter to File because B3 was answered No, the case did not qualify for a documentation-only exemption path, and the significance branch still came back all No: the current record does not identify a new cause of harm, a new hazardous situation, a material risk-control change, or a clinically meaningful performance impact.',
      );
      decisionPath.push('B3 was answered No, so the case proceeded through the 510(k)/De Novo significance framework.');
      if (answers.C1 === Answer.No && answers.C2 === Answer.No) {
        decisionPath.push('C1 = No and C2 = No, so the route is not based on an exemption shortcut.');
      }
      decisionPath.push('C3-C6 were all answered No, so the case did not trigger a new submission on the current record.');
      addSources(sources, 'FDA-SW-510K-2017 Q3; FDA-SW-510K-2017 Q4');
      pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
      pushUnique(
        verificationSteps,
        `Retain the case-specific evidence for "${changeLabel}" behind each No answer, especially the analyses showing no new harm pathway, no new hazardous situation, no material risk-control change, and no meaningful clinical-performance impact.`,
      );
      if (answers.B4) {
        pushUnique(
          verificationSteps,
          `Show why the specific facts described in the submitted change description do not require any of C3, C4, C5, or C6 to move away from No.`,
        );
      }
      pushUnique(
        counterConsiderations,
        `This case would leave ${determination.pathway} if additional review of "${changeLabel}" requires any of C3, C4, C5, or C6 to change from No to Yes or Uncertain.`,
      );
    }

    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push(`Result: ${determination.pathway}.`);
  } else if (determination.pathway === Pathway.ImplementPCCP) {
    const pccpSteps: string[] = [];

    if (determination.isSignificant || determination.pmaRequiresSupplement) {
      pccpSteps.push('the underlying change would otherwise require a new submission or PMA supplement');
    }
    pccpSteps.push('A2 was answered Yes, confirming an authorized PCCP is on file');
    pccpSteps.push('the PCCP scope questions were answered Yes through every applicable gate');
    addSources(sources, 'FDA-PCCP-2025 §V–VIII');

    narrative.push(
      `The route is Implement Under Authorized PCCP because ${joinWithAnd(pccpSteps)}. On the current record, the change remains inside the already authorized PCCP boundaries rather than requiring a stand-alone submission for this implementation.`,
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);

    decisionPath.push(
      determination.isSignificant || determination.pmaRequiresSupplement
        ? 'The underlying change would otherwise require regulatory handling beyond routine documentation.'
        : 'The change was still checked against the PCCP boundaries before implementation.',
    );
    decisionPath.push('A2 = Yes, so an authorized PCCP is available.');
    decisionPath.push('P1-P5 were satisfied as applicable, so the current change remains within authorized PCCP scope.');
    decisionPath.push(`Result: ${determination.pathway}.`);

    pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
    pushUnique(
      verificationSteps,
      'Execute the authorized PCCP validation protocol exactly as approved, including every acceptance criterion and any subgroup/performance checks tied to this change type.',
    );
    if (changeContext?.pccpNote) {
      pushUnique(
        verificationSteps,
        `For "${changeContext.typeName}", confirm that the authorized PCCP explicitly covers the expected boundary condition: ${changeContext.pccpNote}`,
      );
    }
    pushUnique(
      verificationSteps,
      answers.A1 === AuthPathway.PMA
        ? 'Document implementation for the PMA Annual Report and confirm any PCCP-linked labeling or monitoring obligations are closed.'
        : 'Document implementation under the QMS and confirm any PCCP-linked monitoring or labeling obligations are closed.',
    );
    pushUnique(
      counterConsiderations,
      `This case would leave ${determination.pathway} if the actual "${changeLabel}" exceeds the authorized change type, boundary conditions, validation protocol, or cumulative limits in the PCCP.`,
    );
  } else if (determination.pathway === Pathway.PMASupplementRequired) {
    const pmaDrivers: string[] = [];
    if (answers.C_PMA1 === Answer.Yes) {
      pmaDrivers.push('C_PMA1 was answered Yes, so the assessment affirmatively identifies a change affecting safety or effectiveness');
    } else if (answers.C_PMA1 === Answer.Uncertain) {
      pmaDrivers.push('C_PMA1 was answered Uncertain, so the assessment did not rule out a safety or effectiveness impact');
    }
    if (answers.C_PMA2 === Answer.Yes) {
      pmaDrivers.push('C_PMA2 was answered Yes, so device labeling is affected');
    }
    if (answers.C_PMA3 === Answer.Yes) {
      pmaDrivers.push('C_PMA3 was answered Yes, so the manufacturing process or facility is affected');
    }
    if (answers.C_PMA4) {
      pmaDrivers.push(`the anticipated PMA route was identified as "${answers.C_PMA4 as string}"`);
    }

    narrative.push(
      `This is a PMA-approved device, so the threshold is whether the change could affect safety or effectiveness. ${pmaDrivers.length > 0 ? `${joinWithAnd(pmaDrivers)}. ` : ''}On the current record, that supports ${determination.pathway} rather than annual-report-only handling.`,
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);

    decisionPath.push('The device is PMA-approved, so the assessment applied the PMA safety/effectiveness threshold rather than the 510(k) significance framework.');
    decisionPath.push(...pmaDrivers.map((driver) => `${driver.charAt(0).toUpperCase() + driver.slice(1)}.`));
    decisionPath.push(`Result: ${determination.pathway}.`);

    addSources(sources, '21 CFR 814.39(a)');
    if (answers.C_PMA2 === Answer.Yes) addSources(sources, '21 CFR 814.39(a); 21 CFR 814.39(b)');
    if (answers.C_PMA3 === Answer.Yes) addSources(sources, '21 CFR 814.39(a); 21 CFR 814.39(f)');

    pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
    pushUnique(
      verificationSteps,
      `Document exactly how "${changeLabel}" affects safety or effectiveness and align that evidence to the anticipated PMA supplement category.`,
    );
    if (answers.C_PMA4) {
      pushUnique(
        verificationSteps,
        `Confirm that the planned supplement package truly fits the selected PMA route: "${answers.C_PMA4 as string}".`,
      );
    }
    pushUnique(
      counterConsiderations,
      `This case could move down from ${determination.pathway} only if the record supports revising C_PMA1 to No with evidence that "${changeLabel}" does not affect safety or effectiveness.`,
    );
    pushUnique(
      counterConsiderations,
      'Do not apply the 510(k) significance framework here. For PMA devices, unresolved safety/effectiveness impact is itself enough to keep the case in supplement review.',
    );
  } else if (determination.pathway === Pathway.PMAAnnualReport) {
    narrative.push(
      'This is a PMA-approved device, and C_PMA1 was answered No, meaning the current record does not identify a safety or effectiveness impact from the proposed change. That keeps the case in PMA annual-report / Letter-to-File handling rather than a PMA supplement.',
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);

    decisionPath.push('The device is PMA-approved, so the assessment used the PMA safety/effectiveness threshold.');
    decisionPath.push('C_PMA1 was answered No, so the current record does not support a PMA supplement trigger.');
    decisionPath.push(`Result: ${determination.pathway}.`);

    addSources(sources, '21 CFR 814.39(b); 21 CFR 814.84');
    pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
    pushUnique(
      verificationSteps,
      `Retain the evidence supporting the No answer to C_PMA1 and document why "${changeLabel}" does not affect safety or effectiveness.`,
    );
    pushUnique(
      counterConsiderations,
      `This case would leave ${determination.pathway} if additional review shows that "${changeLabel}" affects safety, effectiveness, labeling, or qualifying manufacturing methods more than currently documented.`,
    );
  }

  if (answers.B4 && !caseDescriptionSentence) {
    narrative.push(`Submitted case description considered in this assessment: ${answers.B4 as string}`);
  }

  const primaryReason = narrative.join(' ');

  return {
    ruleKey,
    primaryReason,
    narrative,
    decisionPath,
    verificationTitle: verificationSteps.length > 0 ? sectionTitles.verificationTitle : null,
    verificationSteps,
    counterTitle: counterConsiderations.length > 0 ? sectionTitles.counterTitle : null,
    counterConsiderations,
    sources,
  };
}
