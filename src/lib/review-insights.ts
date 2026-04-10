import { Answer, type Answers, type DeterminationResult } from './assessment-engine';
import type { EvidenceGap, GapSeverity } from './evidence-gaps';
import { joinWithAnd, getChangeLabel, getSelectedChangeContext } from './change-utils';
import { parseSources } from './utils';

export interface ReviewInsightItem {
  id: string;
  title: string;
  meta: string;
  whyThisMatters: string;
  actionLabel: string;
  actionText: string;
  sourceRefs: string[];
}

export interface EvidenceGapInsightItem extends ReviewInsightItem {
  category: string;
  severity: GapSeverity;
}

const getAnswerLabel = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'not answered';
  return String(value);
};

const getSeverityLabel = (severity: GapSeverity): string => {
  if (severity === 'critical') return 'Blocks reliance';
  if (severity === 'important') return 'Needs support before reliance';
  return 'Advisory';
};

const getSourceClassLabel = (sourceClass: string): string =>
  sourceClass
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getPathwayMeta = (determination: DeterminationResult): string =>
  determination.pathway ? `Current pathway: ${determination.pathway}` : 'Current pathway pending';

const significanceQuestionDetails: Record<string, { label: string; short: string }> = {
  C3: {
    label: 'whether the change creates a new or modified cause of harm',
    short: 'new or modified cause of harm',
  },
  C4: {
    label: 'whether the change introduces a new hazardous situation',
    short: 'new hazardous situation',
  },
  C5: {
    label: 'whether the change materially alters a risk control tied to significant harm',
    short: 'material risk-control change',
  },
  C6: {
    label: 'whether the change materially affects clinical performance',
    short: 'clinical performance impact',
  },
};

const getUncertainSignificanceQuestions = (answers: Answers): string[] =>
  ['C3', 'C4', 'C5', 'C6'].filter((id) => answers[id] === Answer.Uncertain);

const describeSignificanceUncertainty = (answers: Answers): string => {
  const uncertain = getUncertainSignificanceQuestions(answers);
  if (uncertain.length === 0) return 'one or more key risk or performance fields remain unresolved';
  return joinWithAnd(uncertain.map((id) => significanceQuestionDetails[id].label));
};

const getUncertainSignificanceTitle = (answers: Answers): string => {
  const uncertain = getUncertainSignificanceQuestions(answers);
  if (uncertain.length === 1) {
    return `Unresolved: ${significanceQuestionDetails[uncertain[0]].label}`;
  }
  if (uncertain.length > 1) {
    return 'Multiple risk and performance fields are still unresolved';
  }
  return 'A key risk or performance field is still unresolved';
};

const getSignificanceEvidenceNeed = (answers: Answers): string => {
  const uncertain = getUncertainSignificanceQuestions(answers);
  const evidence = uncertain
    .map((id) => {
      switch (id) {
        case 'C3':
          return 'Show whether the change creates a new cause of harm or materially changes an existing harm pathway, with the affected hazards named explicitly.';
        case 'C4':
          return 'Map the change to the hazardous situations in the risk-management file and show whether any new exposure scenario is introduced.';
        case 'C5':
          return 'Identify every threshold, guardrail, override, monitoring rule, or mitigation touched by this change and document whether any control tied to significant harm changed in design or effectiveness.';
        case 'C6':
          return 'Provide pre/post clinical performance evidence, including site-, subgroup-, modality-, or workflow-specific analyses that match the modified use conditions.';
        default:
          return null;
      }
    })
    .filter(Boolean);

  if (evidence.length === 0) {
    return 'Resolve the remaining risk or performance field with risk analysis and validation evidence specific to this change.';
  }

  return evidence.join(' ');
};

const getValidationNeed = (answers: Answers): string => {
  const category = answers.B1 as string | undefined;
  const typeName = answers.B2 as string | undefined;

  if (category === 'Training Data' && typeName === 'Additional data — new clinical sites') {
    return 'Provide pre/post validation by site, scanner/vendor, acquisition protocol, and affected subgroups so the new-site data is not assessed only in aggregate.';
  }
  if (category === 'Training Data' && typeName === 'Additional data — expanded demographics') {
    return 'Provide pre/post validation by each newly introduced demographic group, not only the overall population average.';
  }
  if (category === 'Model Architecture') {
    return 'Provide architecture-to-architecture comparison including failure-mode analysis, edge-case review, and subgroup performance rather than only aggregate metrics.';
  }
  if (category === 'Clinical Output & Decision Thresholds') {
    return 'Provide operating-point validation including sensitivity/specificity tradeoffs, alerting effects, and any downstream clinical workflow impact.';
  }
  return 'Provide pre/post validation at the cleared operating point, including the site-, subgroup-, modality-, or environment-specific analyses that matter for this case.';
};

const getRepresentativenessNeed = (answers: Answers): string => {
  const typeName = answers.B2 as string | undefined;

  if (typeName === 'Additional data — new clinical sites') {
    return 'List each newly added site, including scanner/vendor mix, acquisition protocols, geography, and patient demographics, then show why those additions still represent the authorized population and use conditions.';
  }
  if (typeName === 'Additional data — expanded demographics') {
    return 'Document exactly which demographic groups were added, whether each group is still inside the cleared population boundary, and what compensating controls apply if any group is underrepresented.';
  }
  return 'Document the demographic, site, modality, scanner, and operating-condition coverage for the supporting data, and explain any gaps or compensating controls.';
};

const getSubgroupNeed = (answers: Answers): string => {
  const typeName = answers.B2 as string | undefined;

  if (typeName === 'Additional data — new clinical sites') {
    return 'Provide subgroup performance across the new-site cohorts, including any scanner-, protocol-, age-, sex-, race-, or disease-severity subgroup that could behave differently at those sites.';
  }
  if (typeName === 'Layer addition / removal') {
    return 'Provide subgroup performance showing whether the architectural change shifts errors or confidence for any clinically relevant subgroup, not only the overall validation set.';
  }
  return 'Provide subgroup performance results for the affected populations and settings, and document any disparity, mitigation, or remaining use limitation.';
};

const getIncompleteBaselineFields = (answers: Answers): string[] => {
  const absent: string[] = [];
  if (!answers.A1b) absent.push('authorization identifier');
  if (!answers.A1c) absent.push('authorized baseline version');
  if (!answers.A1d) absent.push('authorized IFU statement');
  return absent;
};

const defaultReviewInsight = (id: string, message: string, sourceRefs: string[] = []): ReviewInsightItem => ({
  id,
  title: 'Review flagged logic conflict before relying on this assessment',
  meta: 'Expert review item',
  whyThisMatters: message,
  actionLabel: 'What to do',
  actionText:
    'Confirm the underlying answers, update the record if any answer is incorrect, or document why the current answer combination is still justified for this case.',
  sourceRefs,
});

export function buildExpertReviewItems(answers: Answers, determination: DeterminationResult): ReviewInsightItem[] {
  const changeLabel = getChangeLabel(answers);
  const pathwayMeta = getPathwayMeta(determination);
  const ruleIds: string[] = determination.decisionTrace.consistencyRules.map((rule) => rule.id);
  const sourceByRuleId: Record<string, string[]> = {
    'nonpma-unresolved-significance-uncertainty-policy': ['FDA-SW-510K-2017 Q3-Q4'],
    'pma-unresolved-safety-effectiveness-uncertainty-policy': ['21 CFR 814.39(a)'],
    'baseline-incomplete': ['FDA-SW-510K-2017', 'FDA-PCCP-2025 §V'],
    'intended-use-uncertain': ['21 CFR 807.81(a)(3)', 'FDA-PCCP-2025 §V', 'FDA Q-Sub'],
    'cybersecurity-exemption-uncertain': ['FDA-SW-510K-2017 Q1', 'FDA-CYBER-2026'],
    'restore-to-spec-uncertain': ['FDA-SW-510K-2017 Q2'],
    'demographic-expansion-with-b3-no': ['21 CFR 807.81(a)(3)', 'FDA-LIFECYCLE-2025 §IV.B'],
    'cumulative-drift-conflicts-with-nonsignificant-us-assessment': ['FDA-PCCP-2025 §VIII', 'FDA-SW-510K-2017'],
    'denovo-fit-failed-with-all-significance-no': ['21 CFR Part 860 Subpart D'],
    'denovo-fit-uncertain': ['21 CFR Part 860 Subpart D'],
    'nonpma-genai-guardrail-c5-conflict': ['FDA-SW-510K-2017 Q3', 'ISO 14971:2019'],
    'pma-genai-guardrail-cpma1-conflict': ['21 CFR 814.39(a)', 'ISO 14971:2019'],
    'nonpma-foundation-model-all-significance-no': ['FDA-SW-510K-2017 Q3-Q4'],
    'pma-foundation-model-cpma1-conflict': ['21 CFR 814.39(a)'],
    'nonpma-prompt-rag-all-significance-no': ['FDA-SW-510K-2017 Q3-Q4'],
    'pma-prompt-rag-cpma1-conflict': ['21 CFR 814.39(a)'],
    'nonpma-monitoring-threshold-c5-conflict': ['FDA-SW-510K-2017 Q3', 'ISO 14971:2019'],
    'pma-monitoring-threshold-cpma1-conflict': ['21 CFR 814.39(a)'],
    'pma-labeling-change-with-cpma1-no': ['21 CFR 814.39(a)', '21 CFR 814.39(b)'],
    'pma-manufacturing-change-with-cpma1-no': ['21 CFR 814.39(a)', '21 CFR 814.39(f)'],
    'nonpma-bias-mitigation-c5-conflict': ['FDA-LIFECYCLE-2025 §IV.B', 'ISO 14971:2019'],
    'pma-bias-mitigation-cpma1-conflict': ['FDA-LIFECYCLE-2025 §IV.B', '21 CFR 814.39(a)'],
  };

  const built = ruleIds.map((id): ReviewInsightItem => {
    switch (id) {
      case 'nonpma-unresolved-significance-uncertainty-policy': {
        const uncertainSummary = describeSignificanceUncertainty(answers);
        return {
          id,
          title: getUncertainSignificanceTitle(answers),
          meta: `Internal decision rule · ${pathwayMeta}`,
          whyThisMatters: `${uncertainSummary} were answered Uncertain. On the current record, the assessment therefore stays on the more conservative ${determination.pathway} output until those answers are resolved.`,
          actionLabel: 'Evidence needed to close this',
          actionText: getSignificanceEvidenceNeed(answers),
          sourceRefs: sourceByRuleId[id],
        };
      }
      case 'pma-unresolved-safety-effectiveness-uncertainty-policy':
        return {
          id,
          title: 'Whether the change affects safety or effectiveness is still unresolved',
          meta: `Internal decision rule · ${pathwayMeta}`,
          whyThisMatters:
            'The safety-and-effectiveness review was marked Uncertain, so the record does not yet show whether the PMA-approved device is affected in safety or effectiveness terms.',
          actionLabel: 'Evidence needed to close this',
          actionText:
            'Document whether this change affects safety or effectiveness using pre/post evidence tied to the approved device, the approved labeling, and the specific modified design elements.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'baseline-incomplete': {
        const baselineNotProvided = getIncompleteBaselineFields(answers);
        return {
          id,
          title: 'Define the authorized baseline before relying on this assessment',
          meta: `Reliability gate · ${pathwayMeta}`,
          whyThisMatters: `The record does not include ${joinWithAnd(baselineNotProvided)}. Without a complete authorized baseline, the assessment cannot show exactly what the proposed change is being compared against.`,
          actionLabel: 'What to provide',
          actionText:
            'Enter the authorization identifier, the cleared/approved baseline version, and the authorized IFU statement before using this assessment in any regulatory discussion.',
          sourceRefs: sourceByRuleId[id],
        };
      }
      case 'intended-use-uncertain':
        return {
          id,
          title: 'Whether the change affects the intended use or indications for use is still unresolved',
          meta: `Threshold issue · ${pathwayMeta}`,
          whyThisMatters:
            'The intended-use review was marked Uncertain, so the current record does not establish whether this change stays inside the authorized intended use. Resolve that before treating significance or PCCP conclusions as reliable.',
          actionLabel: 'Evidence needed to close this',
          actionText:
            'Compare the authorized IFU word-for-word against the post-change device description, clinical claims, population, and use setting. If internal review cannot close the gap, use an FDA Pre-Submission.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'cybersecurity-exemption-uncertain':
        return {
          id,
          title: 'Whether this is a cybersecurity-only update is still unresolved',
          meta: `Final guidance · ${pathwayMeta}`,
          whyThisMatters:
            'The cybersecurity-only review was marked Uncertain, so the record does not yet show whether this change is purely cybersecurity-related with zero functional impact.',
          actionLabel: 'Evidence needed to close this',
          actionText:
            'Document whether the change is solely cybersecurity-related, show that it does not affect device behavior or ML inference outputs, and stop treating the exemption as available unless that record is complete.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'restore-to-spec-uncertain':
        return {
          id,
          title: 'Whether this change only restores a previously authorized configuration is still unresolved',
          meta: `Final guidance · ${pathwayMeta}`,
          whyThisMatters:
            'The restore-to-specification review was marked Uncertain, so the record does not yet show whether this change truly restores the device to a previously authorized configuration.',
          actionLabel: 'Evidence needed to close this',
          actionText:
            'Identify the exact authorized target state, show that the proposed fix restores the device to that state, and document that no additional functional or ML behavior changes are introduced.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'demographic-expansion-with-b3-no':
        return {
          id,
          title: 'Reconcile population expansion with the intended-use answer',
          meta: `Regulatory consistency check · ${pathwayMeta}`,
          whyThisMatters:
            'The record indicates that new demographic populations may be involved, while the intended-use review says the change stays within the current scope. That combination only holds if the change stays within the originally authorized population.',
          actionLabel: 'What to confirm',
          actionText:
            'Compare the introduced population against the cleared/approved population boundary and document why the change does or does not expand clinical scope.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'cumulative-drift-conflicts-with-nonsignificant-us-assessment':
        return {
          id,
          title: 'Reconcile cumulative drift with the current non-significant answers',
          meta: `Cumulative change review · ${pathwayMeta}`,
          whyThisMatters:
            'The running change log suggests cumulative drift, but the current U.S. significance branch otherwise reads as non-significant. That combination weakens confidence in the present pathway.',
          actionLabel: 'What to review',
          actionText:
            'Reassess the current device against the last authorized baseline and document whether the cumulative change set still supports the current pathway.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'denovo-fit-failed-with-all-significance-no':
      case 'denovo-fit-uncertain':
        return {
          id,
          title: 'Resolve De Novo device-type fit before relying on the current pathway',
          meta: `Device-type fit check · ${pathwayMeta}`,
          whyThisMatters:
            'The current record does not clearly show that the modified device still fits the De Novo device type and special controls after this change. That threshold issue takes priority over a routine significance close-out.',
          actionLabel: 'What to review',
          actionText:
            'Compare the modified device against the De Novo classification order and each special control. If the fit remains uncertain, use an FDA Pre-Submission.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'nonpma-genai-guardrail-c5-conflict':
      case 'nonpma-bias-mitigation-c5-conflict':
      case 'nonpma-monitoring-threshold-c5-conflict':
        return {
          id,
          title: 'Reconcile risk-control impact with the recorded change',
          meta: `Risk-control consistency check · ${pathwayMeta}`,
          whyThisMatters:
            'The current answer set says the reported change does not affect risk-control significance, but the change description suggests it may touch an existing control or mitigation.',
          actionLabel: 'Evidence needed to close this',
          actionText:
            'Review whether the modified feature functions as a risk control tied to significant harm, and document the pre/post control design, effectiveness, and affected hazards before finalizing the risk-control assessment.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'pma-genai-guardrail-cpma1-conflict':
      case 'pma-foundation-model-cpma1-conflict':
      case 'pma-prompt-rag-cpma1-conflict':
      case 'pma-monitoring-threshold-cpma1-conflict':
      case 'pma-labeling-change-with-cpma1-no':
      case 'pma-manufacturing-change-with-cpma1-no':
      case 'pma-bias-mitigation-cpma1-conflict':
        return {
          id,
          title: 'Reconcile safety/effectiveness impact with the recorded change',
          meta: `PMA consistency check · ${pathwayMeta}`,
          whyThisMatters:
            'The current answer set says the change does not affect safety or effectiveness, but the reported modification is the kind of change that can affect PMA review obligations.',
          actionLabel: 'Evidence needed to close this',
          actionText:
            'Review the change against the PMA safety/effectiveness threshold and either document why it truly has no safety/effectiveness impact or update the PMA answer set accordingly.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'nonpma-foundation-model-all-significance-no':
      case 'nonpma-prompt-rag-all-significance-no':
        return {
          id,
          title: 'Reconcile the AI/ML change description with the non-significant answer set',
          meta: `AI/ML consistency check · ${pathwayMeta}`,
          whyThisMatters:
            'The reported modification is normally expected to affect risk, performance, or scope review more than the current all-No significance branch suggests.',
          actionLabel: 'What to review',
          actionText:
            'Re-run the significance fields against the actual change record and document why each answer remains No, or update the answers if the change is more consequential than first recorded.',
          sourceRefs: sourceByRuleId[id],
        };
      default:
        return defaultReviewInsight(
          id,
          determination.consistencyIssues.find((message) => message.includes(changeLabel)) ||
            determination.consistencyIssues[0] ||
            'The current record contains a flagged issue that should be reviewed before reliance.',
          sourceByRuleId[id] || [],
        );
    }
  });

  if (built.length > 0) return built;

  return determination.consistencyIssues.map((message, index) => defaultReviewInsight(`consistency-${index}`, message));
}

export function buildEvidenceGapInsightItems(
  answers: Answers,
  determination: DeterminationResult,
  gaps: EvidenceGap[],
): EvidenceGapInsightItem[] {
  const changeContext = getSelectedChangeContext(answers);
  const uncertainSignificance = describeSignificanceUncertainty(answers);

  return gaps.map((gap) => {
    const baseMeta = `${gap.category} · ${getSeverityLabel(gap.severity)} · ${getSourceClassLabel(gap.sourceClass)} · ${getPathwayMeta(determination)}`;
    const defaultItem: EvidenceGapInsightItem = {
      id: gap.id,
      category: gap.category,
      severity: gap.severity,
      title: gap.description,
      meta: baseMeta,
      whyThisMatters:
        'This item is still open, so the current record does not yet fully support reliance on the assessment result.',
      actionLabel: 'What to provide',
      actionText: gap.remediation,
      sourceRefs: parseSources(gap.source),
    };

    switch (gap.id) {
      case 'GAP-TRAINING-REPR':
        return {
          ...defaultItem,
          title: 'The supporting data is not yet shown to represent the cleared population',
          whyThisMatters: `The dataset representativeness review was answered ${getAnswerLabel(answers.E1)}, so the current record does not show whether the training, validation, or test data represents the authorized patient population and operating conditions.`,
          actionText: getRepresentativenessNeed(answers),
        };
      case 'GAP-SUBGROUP':
        return {
          ...defaultItem,
          title: 'Subgroup performance is not yet shown for the affected populations',
          whyThisMatters:
            'The subgroup-performance review was answered No, so the record does not show whether the modified device performs acceptably across the relevant demographic groups or operating subgroups.',
          actionText: getSubgroupNeed(answers),
        };
      case 'GAP-SIG-UNCERTAIN':
        return {
          ...defaultItem,
          title: getUncertainSignificanceTitle(answers),
          whyThisMatters: `${uncertainSignificance} remain unresolved, so the assessment stays on the more conservative output until those fields are converted to documented Yes or No conclusions.`,
          actionLabel: 'Evidence needed to close this',
          actionText: getSignificanceEvidenceNeed(answers),
        };
      case 'GAP-VALIDATION':
        return {
          ...defaultItem,
          title: 'Validation evidence is not yet documented for this change',
          whyThisMatters:
            'The current answer pattern indicates that clinical performance impact has not been clearly ruled out.',
          actionText: getValidationNeed(answers),
        };
      case 'GAP-BASELINE': {
        const baselineNotProvided = getIncompleteBaselineFields(answers);
        return {
          ...defaultItem,
          title: 'The authorized baseline is still incomplete',
          whyThisMatters: `The record does not include ${joinWithAnd(baselineNotProvided)}, so the assessment cannot show exactly what the proposed change is being compared against.`,
          actionText:
            'Provide the authorization number, authorized baseline version, and authorized IFU statement before relying on any pathway conclusion.',
        };
      }
      case 'GAP-IFU-UNCERTAIN':
        return {
          ...defaultItem,
          title: 'Whether the change affects the intended use or indications for use is still unresolved',
          whyThisMatters:
            'The intended-use review was marked Uncertain, so the current record does not establish whether this change stays inside the authorized intended use.',
          actionText:
            'Compare the authorized IFU against the post-change device description word-for-word. If internal review cannot close the gap, prepare an FDA Pre-Submission.',
        };
      case 'GAP-IFU-INCOMPLETE':
        return {
          ...defaultItem,
          title: 'The intended-use assessment has not been completed',
          whyThisMatters:
            'The assessment cannot proceed credibly without a clear conclusion on whether this change affects the intended use or indications for use.',
          actionText:
            'Answer whether the change affects intended use before relying on any downstream significance or PCCP conclusion.',
        };
      case 'GAP-SIG-INCOMPLETE':
        return {
          ...defaultItem,
          title: 'One or more risk or performance reviews are still incomplete',
          whyThisMatters:
            'The non-PMA significance branch is not fully answered, so the current pathway cannot be treated as fully supported.',
          actionText:
            'Complete the remaining visible risk and performance reviews and document the evidence behind each answer.',
        };
      case 'GAP-POPULATION-SCOPE':
        return {
          ...defaultItem,
          title: 'The record suggests population expansion, but the authorized boundary is not yet reconciled',
          whyThisMatters: `The population-expansion review was answered ${getAnswerLabel(answers.E3)}, so the current record suggests this change may involve populations not clearly covered by the authorized baseline.`,
          actionText:
            'Document exactly which populations were introduced by this change, whether each group remains inside the authorized scope, and what subgroup evidence supports that conclusion.',
        };
      case 'GAP-BIAS-ASSESSMENT-UPDATE':
        return {
          ...defaultItem,
          title: 'The bias and equity review has not been updated for this change',
          whyThisMatters:
            'The update to the bias and equity review was answered No, so the record still relies on the original submission-era bias analysis even though the current change modifies the device record.',
          actionText:
            'Update the bias and equity assessment specifically for this change, naming the affected populations, environments, failure modes, and mitigations rather than relying on the original submission narrative.',
        };
      case 'GAP-BIAS-MITIGATION':
        return {
          ...defaultItem,
          title: 'The modified bias mitigation is not yet shown to remain effective',
          whyThisMatters: `The bias-mitigation review was answered ${getAnswerLabel(answers.E5)}, so the record indicates that a bias mitigation may have changed, weakened, or been removed as part of this change.`,
          actionText:
            'Document exactly what changed in the mitigation, whether it functions as a risk control, and what validation or risk analysis shows it remains effective for the affected populations.',
        };
      case 'GAP-CUMULATIVE':
        return {
          ...defaultItem,
          title: 'Cumulative drift since the last authorized baseline is still open',
          whyThisMatters:
            'The current record indicates cumulative drift relative to the last authorized baseline, so this change cannot be assessed in isolation.',
          actionText:
            'Review the cumulative change log against the last authorized baseline and document whether the full change set, not just this discrete change, still supports the present pathway.',
        };
      case 'GAP-SE-UNCERTAIN':
        return {
          ...defaultItem,
          title: `Predicate fit / substantial equivalence is still unresolved for the cumulative record`,
          whyThisMatters:
            'The cumulative-change review still does not show whether substantial equivalence holds after this change.',
          actionText:
            'Compare the current modified device against the predicate on the full cumulative-change record and document whether substantial equivalence still holds after all accumulated changes.',
        };
      case 'GAP-PCCP-SCOPE':
        return {
          ...defaultItem,
          title: `This change has not yet been shown to fit inside the authorized PCCP`,
          whyThisMatters:
            'An authorized PCCP may exist, but the current scope review is incomplete, so the assessment cannot show that this change fits inside the authorized PCCP boundaries.',
          actionText: `Complete the PCCP scope review and document the specific fit for this change${changeContext?.pccpNote ? `, including this expected boundary condition: ${changeContext.pccpNote}` : ''}.`,
        };
      case 'GAP-PCCP-FAILED':
        return {
          ...defaultItem,
          title: `This change falls outside the authorized PCCP as currently recorded`,
          whyThisMatters:
            'The current PCCP scope review indicates that this change is outside at least one authorized PCCP gate or boundary.',
          actionText:
            'Identify which PCCP gate failed, document why it failed, and decide whether the correct next step is a standard submission or a future PCCP expansion request.',
        };
      case 'GAP-DENOVO-FIT':
        return {
          ...defaultItem,
          title: 'De Novo device-type fit is still unresolved',
          whyThisMatters:
            'The current record does not clearly show that the modified device still fits the De Novo device type and special controls after this change.',
          actionText:
            'Compare the modified device against the De Novo classification order and each special control, and use an FDA Pre-Submission if fit remains uncertain.',
        };
      case 'GAP-GENAI-HALLUCINATION':
        return {
          ...defaultItem,
          title: 'GenAI factual-accuracy / unsafe-output testing is not yet documented',
          whyThisMatters: `The case includes a GenAI high-impact change, but the record does not yet show factual-accuracy or other unsafe-output testing appropriate for the modified behavior.`,
          actionText:
            'Provide the GenAI factual-accuracy or other unsafe-output test plan, results, and pass/fail criteria specific to the modified configuration.',
        };
      case 'GAP-GENAI-GUARDRAIL':
        return {
          ...defaultItem,
          title: 'The guardrail or safety-filter change is not yet tied to a completed risk assessment',
          whyThisMatters: `The record shows a guardrail or safety-filter modification, but the effect of that change on hazardous situations or PMA safety/effectiveness has not been fully closed.`,
          actionText:
            'Show how the guardrail change affects each relevant hazardous situation or PMA safety/effectiveness field, and document the resulting control effectiveness.',
        };
      case 'GAP-CYBER-EXEMPT':
        return {
          ...defaultItem,
          title: 'Cybersecurity-only treatment is still not supported',
          whyThisMatters:
            'The cybersecurity-only review was marked Uncertain, so the record does not yet show whether this is a pure cybersecurity change with zero functional impact.',
          actionText:
            'Document either that the change is solely cybersecurity-related with zero device-behavior impact, or that it should not be treated as exemption-eligible.',
        };
      case 'GAP-PMA-INCOMPLETE':
        return {
          ...defaultItem,
          title: 'The PMA safety/effectiveness review is still incomplete',
          whyThisMatters:
            'The PMA-specific review is not fully answered, so the current record does not yet show whether this change requires supplement handling.',
          actionText:
            'Complete the PMA-specific assessment and document whether the change affects safety or effectiveness, labeling, or qualifying manufacturing methods.',
        };
      default:
        return defaultItem;
    }
  });
}
