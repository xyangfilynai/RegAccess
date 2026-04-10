import {
  Answer,
  AuthPathway,
  Pathway,
  isAnsweredValue,
  answerIsOneOf,
  type Answers,
} from './types';
import type { AssessmentField, Block } from './getQuestions';
import type { DeterminationResult } from './computeDetermination';
import { ruleReasoningLibrary } from './content';
import { joinWithAnd, getChangeLabel, getSelectedChangeContext, type SelectedChangeContext } from './change-utils';
import { parseSources, pushUnique } from './utils';

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

const addSources = (sources: string[], raw: string | null | undefined) => {
  for (const part of parseSources(raw)) {
    pushUnique(sources, part);
  }
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

const getPCCPStatusText = (answers: Answers): string => {
  if (answers.A2 === Answer.Yes) return 'An authorized PCCP is on file.';
  if (answers.A2 === Answer.No) return 'No authorized PCCP is on file.';
  return 'PCCP status is not specified.';
};

const getSubmittedCaseSentence = (answers: Answers): string | null => {
  const excerpt = truncate(answers.B4 as string | undefined);
  return excerpt ? `From the submitted change description: ${excerpt}` : null;
};

const getIncompleteCriticalFields = (
  answers: Answers,
  blocks: Block[],
  getFieldsForBlock: (blockId: string) => AssessmentField[],
): string[] => {
  const incomplete: string[] = [];
  blocks.forEach((block) => {
    if (block.id === 'review') return;
    getFieldsForBlock(block.id).forEach((item) => {
      if (item.sectionDivider || item.skip || !item.pathwayCritical) return;
      if (isAnsweredValue(answers[item.id])) return;
      pushUnique(incomplete, item.q || item.label || item.id);
    });
  });
  return incomplete;
};

const getReasoningSectionTitles = (
  pathway: string,
): { verificationTitle: string | null; counterTitle: string | null } => {
  if (pathway === Pathway.AssessmentIncomplete) {
    return {
      verificationTitle: 'What would resolve this',
      counterTitle: 'What would still keep this open',
    };
  }
  if (pathway === Pathway.ImplementPCCP) {
    return {
      verificationTitle: 'What must be confirmed before implementation',
      counterTitle: 'What would move this out of the PCCP pathway',
    };
  }
  if (pathway === Pathway.LetterToFile || pathway === Pathway.PMAAnnualReport) {
    return {
      verificationTitle: 'What supports staying on this pathway',
      counterTitle: 'What would change this pathway',
    };
  }
  return {
    verificationTitle: 'What supports this pathway',
    counterTitle: 'What would change this pathway',
  };
};

const getAnswerResolutionVerb = (answer: unknown): string =>
  answer === Answer.Uncertain ? 'Resolve whether' : 'Support the conclusion that';

const getChangeSpecificVerificationStep = (changeContext: SelectedChangeContext | null): string | null => {
  if (!changeContext) return null;

  switch (changeContext.typeName) {
    case 'Layer addition / removal':
      return 'Document exactly which layers were added or removed, where they sit in the model, and whether they change feature extraction, post-processing, thresholding, guardrails, monitoring, or clinician-facing behavior.';
    case 'Additional data — new clinical sites':
      return 'Document the new sites, acquisition systems, protocols, subgroup mix, and whether the added data stays within the authorized population and operating conditions.';
    case 'Additional data — expanded demographics':
      return 'Document the exact demographic expansion, the authorized population boundary, and whether the modified device remains inside that boundary.';
    case 'Decision threshold adjustment':
      return 'Document the exact before/after threshold, the clinical rationale for the shift, and the resulting sensitivity/specificity tradeoff at the cleared operating point.';
    case 'Base / foundation model swap':
      return 'Document the exact before/after model identifiers, provider/version changes, and the validation used to show whether clinical behavior remained within the authorized boundary.';
    case 'Prompt / instruction template change':
      return 'Document the exact controlled prompt changes, output constraints, and regression testing used to show whether clinical behavior stayed within scope.';
    case 'RAG knowledge base update':
      return 'Document the new sources, coverage boundaries, and retrieval validation used to show whether the device behavior stayed within the authorized clinical scope.';
    case 'Guardrail / safety filter modification':
      return 'Document exactly which guardrails changed, what unsafe outputs or workflows they control, and whether the change strengthens, weakens, or replaces an existing risk control.';
    case 'Monitoring threshold change':
      return 'Document the exact before/after threshold, the signals affected, and whether the revised threshold weakens, delays, or narrows detection of emerging safety or performance issues.';
    default:
      break;
  }

  switch (changeContext.category) {
    case 'Training Data':
      return 'Document dataset provenance, subgroup composition, and whether the modified training set remains within the authorized population, sites, and acquisition conditions.';
    case 'Model Architecture':
      return 'Document the exact before/after architecture and whether the modification changes any component that affects risk controls, post-processing, or clinician-facing outputs.';
    case 'Preprocessing & Feature Engineering':
      return 'Document the exact before/after preprocessing or feature pipeline and where the modified logic changes the inputs seen by the cleared decision path.';
    case 'Clinical Output & Decision Thresholds':
      return 'Document the exact before/after operating point or output behavior and the resulting effect on sensitivity, specificity, alerting, or clinician interpretation.';
    case 'Intended Use / Indications for Use':
      return 'Document the exact authorized IFU language and the exact post-change claim, population, setting, or output scope being compared.';
    case 'Deployment & Infrastructure':
      return 'Document the before/after deployment environment, software stack, and any numerical, latency, or integration effects that could change device behavior.';
    case 'Continuous Learning / Periodic Retraining':
      return 'Document the retraining trigger, data eligibility, training procedure, acceptance criteria, and rollback/monitoring controls actually used for this update.';
    case 'Labeling & Clinical User Interface':
      return 'Document the exact before/after clinician-facing behavior and whether the presentation change affects interpretation, workflow, or user reliance.';
    case 'Foundation Model / Generative AI':
      return 'Document the exact before/after model or prompt configuration, the governed inputs/outputs, and the validation used to show whether clinical behavior remained within the authorized boundary.';
    case 'Post-Market Surveillance':
      return 'Document the before/after monitoring logic and whether any safety-signal detection or escalation threshold became weaker, delayed, or narrower.';
    case 'Cybersecurity':
      return 'Document the exact software components touched and the analysis showing whether any inference, preprocessing, latency, or clinical workflow behavior changed.';
    default:
      return null;
  }
};

const getQuestionSpecificVerificationStep = (questionId: 'C3' | 'C4' | 'C5' | 'C6', answer: unknown): string => {
  const prefix = getAnswerResolutionVerb(answer);
  switch (questionId) {
    case 'C3':
      return `${prefix} this change creates a new or modified cause of harm with patient-injury potential. Include a hazard-by-hazard analysis, including subgroup and edge-case behavior.`;
    case 'C4':
      return `${prefix} this change introduces a hazardous situation not present in the current authorized design. Include the supporting risk analysis.`;
    case 'C5':
      return `${prefix} this change materially changes a risk control tied to significant harm. Map the before/after design to each affected control and state whether it is unchanged, strengthened, weakened, or replaced.`;
    case 'C6':
      return `${prefix} this change materially affects clinical performance. Provide pre/post validation at the cleared operating point, including subgroup-, site-, modality-, or environment-specific analyses relevant to the change.`;
  }
};

const getPathwayChangeConditionForQuestion = (questionId: 'C3' | 'C4' | 'C5' | 'C6', _pathway: string): string => {
  switch (questionId) {
    case 'C3':
      return `This pathway could change only if the record supports concluding that the proposed change does not create a new or modified cause of harm with patient-injury potential.`;
    case 'C4':
      return `This pathway could change only if the record supports concluding that the proposed change does not introduce a new hazardous situation.`;
    case 'C5':
      return `This pathway could change only if the record supports concluding that the proposed change does not materially change any risk control tied to significant harm.`;
    case 'C6':
      return `This pathway could change only if the record supports concluding that the proposed change does not materially change clinical performance at the cleared operating point or in affected subgroups or use contexts.`;
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
  getFieldsForBlock: (blockId: string) => AssessmentField[],
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
  const changeLabel = getChangeLabel(answers, 'the change under assessment');
  const changeContext = getSelectedChangeContext(answers);
  const baselineText = answers.A1c
    ? `against authorized baseline "${answers.A1c as string}"`
    : 'against the authorized baseline';
  const authIdText = answers.A1b ? ` (${answers.A1b as string})` : '';
  const caseDescriptionSentence = getSubmittedCaseSentence(answers);
  const incompleteCriticalFields = getIncompleteCriticalFields(answers, blocks, getFieldsForBlock);

  narrative.push(
    `This assessment concerns ${authDescriptor}${authIdText}, evaluated ${baselineText}, for a change classified as "${changeLabel}". ${getPCCPStatusText(answers)}`,
  );

  if (determination.pathway === Pathway.AssessmentIncomplete) {
    const blockers: string[] = [];

    if (determination.isIntendedUseUncertain) {
      blockers.push(
        'the record does not establish whether the change stays within the authorized intended use or indications for use',
      );
      addSources(sources, '21 CFR 807.81(a)(3); FDA-PCCP-2025 §V');
      pushUnique(
        verificationSteps,
        'Resolve intended-use uncertainty by comparing the authorized Indications for Use statement word-for-word against the post-change device description. If internal review cannot close the gap, use an FDA Pre-Submission (Q-Sub).',
      );
      pushUnique(
        counterConsiderations,
        'Do not assume the change stays within the current intended use just to continue the workflow. Intended-use uncertainty is a threshold issue and can invalidate every downstream conclusion.',
      );
    }

    if (determination.baselineIncomplete) {
      blockers.push(
        'the authorized baseline is incomplete because the authorization identifier, baseline version, or authorized IFU statement is not provided',
      );
      addSources(sources, 'FDA-SW-510K-2017; FDA-PCCP-2025 §V');
      pushUnique(
        verificationSteps,
        'Complete the authorization identifier, authorized baseline version, and authorized IFU fields before relying on any pathway conclusion.',
      );
    }

    if (determination.pmaIncomplete) {
      blockers.push('the PMA safety-and-effectiveness review has not been completed');
      addSources(sources, '21 CFR 814.39(a)');
      pushUnique(
        verificationSteps,
        'Complete the PMA safety-and-effectiveness review using pre/post evidence tied to the approved device and the proposed change.',
      );
    }

    if (determination.pccpIncomplete) {
      blockers.push(
        'the PCCP scope review is incomplete, so the case cannot be closed under the authorized PCCP pathway',
      );
      addSources(sources, 'FDA-PCCP-2025 §V–VIII');
      pushUnique(
        verificationSteps,
        'Complete the PCCP scope review and confirm change type fit, modification boundaries, validation protocol, monitoring, and cumulative impact.',
      );
    }

    if (determination.significanceIncomplete && incompleteCriticalFields.length > 0) {
      blockers.push(
        `one or more pathway-critical fields are still unanswered: ${joinWithAnd(
          incompleteCriticalFields.map((fieldLabel) => `"${fieldLabel}"`),
        )}`,
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-Q4');
      pushUnique(
        verificationSteps,
        'Complete every visible pathway-critical field before treating the U.S. significance assessment as complete.',
      );
    }

    if (determination.hasUncertainSignificance) {
      blockers.push(
        "one or more U.S. significance fields were answered 'Uncertain', so the record does not yet support a final close-out",
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-Q4');
      pushUnique(
        verificationSteps,
        "Convert each 'Uncertain' significance answer into a documented Yes or No using validation evidence, risk analysis, and clinical/regulatory review.",
      );
      pushUnique(
        counterConsiderations,
        'Unresolved significance uncertainty should not be treated as support for a documentation-only pathway.',
      );
    }

    if (determination.seUncertain) {
      blockers.push('it is still unclear whether substantial equivalence holds after the cumulative-change review');
      addSources(sources, '21 CFR 807.87; 21 CFR 807.92');
      pushUnique(
        verificationSteps,
        'Reassess the modified device against the predicate and document whether substantial equivalence still holds or whether a new strategy is needed.',
      );
    }

    narrative.push(
      blockers.length > 0
        ? `The pathway remains Assessment Incomplete because ${joinWithAnd(blockers)}. On the current record, the assessment does not yet support a reliable final pathway recommendation.`
        : 'The pathway remains Assessment Incomplete because one or more pathway-critical issues are still unresolved.',
    );

    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push(...blockers.map((blocker) => blocker.charAt(0).toUpperCase() + blocker.slice(1) + '.'));
  } else if (determination.isIntendedUseChange) {
    narrative.push(
      `The assessed pathway is ${determination.pathway} because the change was assessed as affecting the authorized intended use or indications for use. This threshold issue must be addressed before any exemption, significance, or PCCP logic can apply.`,
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push(
      'The change was assessed as affecting the intended use or indications for use, so the case was treated as an intended-use change.',
    );
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
      'The assessed pathway is Assessment Incomplete because the current record does not establish whether the proposed change remains within the authorized intended use or indications for use, so no downstream pathway conclusion is reliable yet.',
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push('The intended-use threshold is unresolved, so the pathway cannot be finalized.');
    decisionPath.push('Result: Assessment Incomplete until intended-use impact is resolved.');
    addSources(sources, '21 CFR 807.81(a)(3); FDA-PCCP-2025 §V');
    pushUnique(
      verificationSteps,
      'Resolve intended-use uncertainty with senior RA/clinical review or an FDA Pre-Submission before relying on any submission or documentation-only pathway.',
    );
    pushUnique(
      counterConsiderations,
      'A borderline intended-use answer should not be overridden by downstream risk fields alone. Intended use is the threshold decision point and requires independent resolution.',
    );
  } else if (determination.pathway === Pathway.NewSubmission) {
    const triggerNarratives: string[] = [];
    const triggerDecisionSteps: string[] = [];

    decisionPath.push(
      'The change was assessed as staying within the existing intended use and indications for use, so the case proceeded through the 510(k)/De Novo software-change significance framework.',
    );
    addSources(sources, '21 CFR 807.81(a)(3)');

    if (answers.C1 === Answer.No && answers.C2 === Answer.No) {
      decisionPath.push(
        'The change did not qualify for either the cybersecurity-only exemption or the restore-to-specification exemption.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q1; FDA-SW-510K-2017 Q2');
    }

    if (answers.C3 === Answer.Yes) {
      triggerNarratives.push('the record identifies a new or modified cause of harm with patient-injury potential');
      triggerDecisionSteps.push(
        'New or modified cause of harm: Yes. The record identifies a new or modified cause of harm with patient-injury potential.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3; ISO 14971:2019');
    } else if (answers.C3 === Answer.Uncertain) {
      triggerNarratives.push(
        'the record does not rule out a new or modified cause of harm with patient-injury potential',
      );
      triggerDecisionSteps.push(
        'New or modified cause of harm: Uncertain. The record does not rule out a new or modified cause of harm with patient-injury potential.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3; ISO 14971:2019');
    }

    if (answers.C4 === Answer.Yes) {
      triggerNarratives.push('the case introduces a new hazardous situation');
      triggerDecisionSteps.push(
        'New hazardous situation: Yes. The change introduces a hazardous situation not previously covered by the record.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-HazSit; ISO 14971:2019');
    } else if (answers.C4 === Answer.Uncertain) {
      triggerNarratives.push('the record does not rule out a new hazardous situation');
      triggerDecisionSteps.push(
        'New hazardous situation: Uncertain. The record does not rule out a new hazardous situation.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-HazSit; ISO 14971:2019');
    }

    if (answers.C5 === Answer.Yes) {
      triggerNarratives.push(
        'the change affects a risk control for a hazardous situation with significant harm potential',
      );
      triggerDecisionSteps.push(
        'Risk-control impact: Yes. The change touches a control tied to a hazardous situation with significant harm potential.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-RC; ISO 14971:2019');
    } else if (answers.C5 === Answer.Uncertain) {
      triggerNarratives.push('the record does not rule out a material risk-control change');
      triggerDecisionSteps.push(
        'Risk-control impact: Uncertain. The record does not rule out a material change to an existing risk control.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3-RC; ISO 14971:2019');
    }

    if (answers.C6 === Answer.Yes) {
      triggerNarratives.push('the record identifies a clinically meaningful performance impact');
      triggerDecisionSteps.push(
        'Clinical performance impact: Yes. The record identifies a clinically meaningful performance impact.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q4');
    } else if (answers.C6 === Answer.Uncertain) {
      triggerNarratives.push('the record does not rule out a clinically meaningful performance impact');
      triggerDecisionSteps.push(
        'Clinical performance impact: Uncertain. The record does not rule out a clinically meaningful performance impact.',
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
      triggerNarratives.push('substantial equivalence could not be supported after the cumulative-change review');
      triggerDecisionSteps.push(
        'Cumulative substantial-equivalence review: not supported. The modified device can no longer be justified against the predicate on the current record.',
      );
      addSources(sources, '21 CFR 807.87; 21 CFR 807.92');
    }

    if (determination.seUncertain) {
      triggerNarratives.push('substantial equivalence remains uncertain after the cumulative-change review');
      triggerDecisionSteps.push(
        'Cumulative substantial-equivalence review: uncertain. The current record does not yet show that substantial equivalence still holds.',
      );
      addSources(sources, '21 CFR 807.87; 21 CFR 807.92');
    }

    if (triggerDecisionSteps.length > 0) {
      decisionPath.push(...triggerDecisionSteps);
    }

    if (answers.A2 === Answer.No) {
      decisionPath.push(
        'No authorized PCCP is on file, so there is no pre-authorized PCCP path available for this change.',
      );
    } else if (determination.pccpScopeFailed) {
      decisionPath.push(
        'An authorized PCCP exists, but the current scope review does not support implementing this change under that PCCP.',
      );
      addSources(sources, 'FDA-PCCP-2025 §V–VI');
    }

    narrative.push(
      `The current record does not support a documentation-only pathway. ${triggerNarratives.length > 0 ? `${joinWithAnd(triggerNarratives)}. ` : ''}${answers.A2 === Answer.No ? 'Because no authorized PCCP exists, there is no pre-authorized PCCP pathway for this change. ' : ''}That combination supports ${determination.pathway}.`,
    );

    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push(`Result: ${determination.pathway}.`);

    pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
    if (answers.B4) {
      pushUnique(
        verificationSteps,
        'Tie each answer that drove the pathway to the specific before/after observations described in the submitted change description, rather than relying only on the change classification.',
      );
    }
    if (answerIsOneOf(answers.C3, [Answer.Yes, Answer.Uncertain])) {
      pushUnique(verificationSteps, getQuestionSpecificVerificationStep('C3', answers.C3));
    }
    if (answerIsOneOf(answers.C4, [Answer.Yes, Answer.Uncertain])) {
      pushUnique(verificationSteps, getQuestionSpecificVerificationStep('C4', answers.C4));
    }
    if (answerIsOneOf(answers.C5, [Answer.Yes, Answer.Uncertain])) {
      pushUnique(verificationSteps, getQuestionSpecificVerificationStep('C5', answers.C5));
    }
    if (answerIsOneOf(answers.C6, [Answer.Yes, Answer.Uncertain])) {
      pushUnique(verificationSteps, getQuestionSpecificVerificationStep('C6', answers.C6));
    }
    if (
      answerIsOneOf(answers.E3, [Answer.Yes, Answer.Uncertain]) ||
      answers.E1 === Answer.Uncertain ||
      answers.E4 === Answer.No
    ) {
      pushUnique(
        verificationSteps,
        'Update the subgroup and bias evidence package so the populations, environments, and protected groups affected by this change are explicitly covered.',
      );
      addSources(sources, 'FDA-LIFECYCLE-2025 §IV.B');
    }

    if (answerIsOneOf(answers.C3, [Answer.Yes, Answer.Uncertain])) {
      pushUnique(counterConsiderations, getPathwayChangeConditionForQuestion('C3', determination.pathway));
    }
    if (answerIsOneOf(answers.C4, [Answer.Yes, Answer.Uncertain])) {
      pushUnique(counterConsiderations, getPathwayChangeConditionForQuestion('C4', determination.pathway));
    }
    if (answerIsOneOf(answers.C5, [Answer.Yes, Answer.Uncertain])) {
      pushUnique(counterConsiderations, getPathwayChangeConditionForQuestion('C5', determination.pathway));
    }
    if (answerIsOneOf(answers.C6, [Answer.Yes, Answer.Uncertain])) {
      pushUnique(counterConsiderations, getPathwayChangeConditionForQuestion('C6', determination.pathway));
    }
    if (determination.seNotSupportable) {
      pushUnique(
        counterConsiderations,
        `This pathway could change only if substantial equivalence can be re-established against the predicate on the current cumulative-change record.`,
      );
    }
    if (determination.seUncertain) {
      pushUnique(
        counterConsiderations,
        `This pathway could change only if the cumulative-change review supports a definitive substantial-equivalence conclusion rather than leaving it unresolved.`,
      );
    }
    if (determination.deNovoDeviceTypeFitFailed) {
      pushUnique(
        counterConsiderations,
        `This pathway could change only if the modified device can still be shown to fit the existing De Novo device type and special controls.`,
      );
    }
  } else if (determination.pathway === Pathway.LetterToFile) {
    if (determination.isCyberOnly) {
      narrative.push(
        'The assessed pathway is Letter to File because the change was assessed as a cybersecurity-only update with no intended-use change and no claimed performance or functional impact. This pathway is contingent on affirmative demonstration that the update has zero functional or clinical-performance impact.',
      );
      decisionPath.push('The change was assessed as staying within the existing intended use and indications for use.');
      decisionPath.push('The change qualifies for the cybersecurity-only documentation pathway.');
      addSources(sources, 'FDA-SW-510K-2017 Q1; FDA-CYBER-2026');
      pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
      pushUnique(
        verificationSteps,
        'Retain the evidence showing zero functional or clinical-performance impact from the cybersecurity update.',
      );
      pushUnique(
        counterConsiderations,
        `This pathway would change if the cybersecurity update changes any model behavior, preprocessing, dependency behavior, latency profile, or clinician-facing workflow instead of only strengthening security controls.`,
      );
    } else if (determination.isBugFix) {
      narrative.push(
        'The assessed pathway is Letter to File because the change was assessed as restoring the device to a known, documented, previously authorized specification. This pathway is contingent on evidence that the target state matches the previously authorized configuration exactly.',
      );
      decisionPath.push('The change was assessed as staying within the existing intended use and indications for use.');
      decisionPath.push('The change qualifies for the restore-to-specification documentation pathway.');
      addSources(sources, 'FDA-SW-510K-2017 Q2');
      pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
      pushUnique(
        verificationSteps,
        'Retain the version-controlled evidence showing the change restores the device to the previously authorized configuration.',
      );
      pushUnique(
        counterConsiderations,
        `This pathway would change if the target restored state cannot be shown to match a previously authorized configuration exactly.`,
      );
    } else {
      narrative.push(
        'The assessed pathway is Letter to File because the change was assessed as staying within the existing intended use and indications for use, it did not qualify for a documentation-only exemption, and the risk and performance review resulted in all No answers: the current record does not identify a new cause of harm, a new hazardous situation, a material risk-control change, or a clinically meaningful performance impact.',
      );
      decisionPath.push(
        'The change was assessed as staying within the existing intended use and indications for use, so the case proceeded through the 510(k)/De Novo significance framework.',
      );
      if (answers.C1 === Answer.No && answers.C2 === Answer.No) {
        decisionPath.push('The pathway is not based on a cybersecurity-only or restore-to-specification exemption.');
      }
      decisionPath.push(
        'The core risk and performance reviews did not trigger a new submission on the current record.',
      );
      addSources(sources, 'FDA-SW-510K-2017 Q3; FDA-SW-510K-2017 Q4');
      pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
      pushUnique(
        verificationSteps,
        'Retain the evidence behind each No answer, especially the analyses showing no new harm pathway, no new hazardous situation, no material risk-control change, and no meaningful clinical-performance impact.',
      );
      if (answers.B4) {
        pushUnique(
          verificationSteps,
          `Show why the specific facts described in the submitted change description do not require any of the core risk or performance conclusions to move away from No.`,
        );
      }
      pushUnique(
        counterConsiderations,
        `This pathway would change if additional review requires any of the core risk or performance conclusions to move from No to Yes or Uncertain.`,
      );
    }

    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);
    decisionPath.push(`Result: ${determination.pathway}.`);
  } else if (determination.pathway === Pathway.ImplementPCCP) {
    const pccpSteps: string[] = [];

    if (determination.isSignificant || determination.pmaRequiresSupplement) {
      pccpSteps.push('the underlying change would otherwise require a new submission or PMA supplement');
    }
    pccpSteps.push('an authorized PCCP is on file');
    pccpSteps.push('the PCCP scope review was satisfied through every applicable gate');
    addSources(sources, 'FDA-PCCP-2025 §V–VIII');

    narrative.push(
      `The assessed pathway is Implement Under Authorized PCCP because ${joinWithAnd(pccpSteps)}. On the current record, the change remains inside the already authorized PCCP boundaries rather than requiring a stand-alone submission for this implementation.`,
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);

    decisionPath.push(
      determination.isSignificant || determination.pmaRequiresSupplement
        ? 'The underlying change would otherwise require regulatory handling beyond routine documentation.'
        : 'The change was still checked against the PCCP boundaries before implementation.',
    );
    decisionPath.push('An authorized PCCP is available.');
    decisionPath.push(
      'The PCCP scope review was satisfied across the applicable gates, so the current change remains within authorized PCCP scope.',
    );
    decisionPath.push(`Result: ${determination.pathway}.`);

    pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
    pushUnique(
      verificationSteps,
      'Execute the authorized PCCP validation protocol exactly as approved, including every acceptance criterion and any subgroup/performance checks tied to this change type.',
    );
    if (changeContext?.pccpNote) {
      pushUnique(
        verificationSteps,
        `Confirm that the authorized PCCP explicitly covers the expected boundary condition for this change type: ${changeContext.pccpNote}`,
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
      `This pathway would change if the actual modification exceeds the authorized change type, boundary conditions, validation protocol, or cumulative limits in the PCCP.`,
    );
  } else if (determination.pathway === Pathway.PMASupplementRequired) {
    const pmaDrivers: string[] = [];
    if (answers.C_PMA1 === Answer.Yes) {
      pmaDrivers.push('the safety-and-effectiveness review indicates the change affects safety or effectiveness');
    } else if (answers.C_PMA1 === Answer.Uncertain) {
      pmaDrivers.push('the safety-and-effectiveness review does not rule out a safety or effectiveness impact');
    }
    if (answers.C_PMA2 === Answer.Yes) {
      pmaDrivers.push('the record indicates device labeling is affected');
    }
    if (answers.C_PMA3 === Answer.Yes) {
      pmaDrivers.push('the record indicates the manufacturing process or facility is affected');
    }
    if (answers.C_PMA4) {
      pmaDrivers.push(`the planned PMA supplement type was identified as "${answers.C_PMA4 as string}"`);
    }

    narrative.push(
      `This is a PMA-approved device, so the threshold is whether the change could affect safety or effectiveness. ${pmaDrivers.length > 0 ? `${joinWithAnd(pmaDrivers)}. ` : ''}On the current record, that supports ${determination.pathway} rather than annual-report-only handling.`,
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);

    decisionPath.push(
      'The device is PMA-approved, so the assessment applied the PMA safety/effectiveness threshold rather than the 510(k) significance framework.',
    );
    decisionPath.push(...pmaDrivers.map((driver) => `${driver.charAt(0).toUpperCase() + driver.slice(1)}.`));
    decisionPath.push(`Result: ${determination.pathway}.`);

    addSources(sources, '21 CFR 814.39(a)');
    if (answers.C_PMA2 === Answer.Yes) addSources(sources, '21 CFR 814.39(a); 21 CFR 814.39(b)');
    if (answers.C_PMA3 === Answer.Yes) addSources(sources, '21 CFR 814.39(a); 21 CFR 814.39(f)');

    pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
    pushUnique(
      verificationSteps,
      'Document exactly how this change affects safety or effectiveness and align that evidence to the anticipated PMA supplement category.',
    );
    if (answers.C_PMA4) {
      pushUnique(
        verificationSteps,
        `Confirm that the planned supplement package fits the selected PMA supplement type: "${answers.C_PMA4 as string}".`,
      );
    }
    pushUnique(
      counterConsiderations,
      `This pathway could change only if the record supports concluding that the proposed change does not affect safety or effectiveness.`,
    );
    pushUnique(
      counterConsiderations,
      'Do not apply the 510(k) significance framework here. For PMA devices, unresolved safety/effectiveness impact is itself enough to keep the case in supplement review.',
    );
  } else if (determination.pathway === Pathway.PMAAnnualReport) {
    narrative.push(
      'This is a PMA-approved device, and the safety-and-effectiveness review was answered No, meaning the current record does not identify a safety or effectiveness impact from the proposed change. On the current record, that supports PMA annual-report / Letter-to-File handling rather than a PMA supplement.',
    );
    if (caseDescriptionSentence) narrative.push(caseDescriptionSentence);

    decisionPath.push('The device is PMA-approved, so the assessment used the PMA safety/effectiveness threshold.');
    decisionPath.push(
      'The safety-and-effectiveness review was answered No, so the current record does not support a PMA supplement trigger.',
    );
    decisionPath.push(`Result: ${determination.pathway}.`);

    addSources(sources, '21 CFR 814.39(b); 21 CFR 814.84');
    pushUnique(verificationSteps, getChangeSpecificVerificationStep(changeContext));
    pushUnique(
      verificationSteps,
      'Retain the evidence supporting the conclusion that this change does not affect safety or effectiveness.',
    );
    pushUnique(
      counterConsiderations,
      `This pathway would change if additional review shows that the proposed change affects safety, effectiveness, labeling, or qualifying manufacturing methods more than currently documented.`,
    );
  }

  if (answers.B4 && !caseDescriptionSentence) {
    narrative.push(`Change description considered: ${answers.B4 as string}`);
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
