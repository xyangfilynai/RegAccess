import { Answer, changeTaxonomy, type Answers } from './assessment-engine';
import type { EvidenceGap, GapSeverity } from './evidence-gaps';

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

const splitSources = (source: string | null | undefined): string[] =>
  (source || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);

const joinWithAnd = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const truncate = (value: string | null | undefined, max = 180): string | null => {
  if (!value) return null;
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return null;
  return compact.length <= max ? compact : `${compact.slice(0, max).trimEnd()}...`;
};

const getChangeLabel = (answers: Answers): string =>
  (answers.B2 as string) || (answers.B1 as string) || 'the reported change';

const getCaseExcerpt = (answers: Answers): string | null => truncate(answers.B4 as string | undefined);

const getAnswerLabel = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'not answered';
  return String(value);
};

const getSelectedChange = (answers: Answers) => {
  const category = answers.B1 as string | undefined;
  const typeName = answers.B2 as string | undefined;
  if (!category && !typeName) return null;
  const typeConfig = category && typeName
    ? changeTaxonomy[category]?.types?.find((item: { name: string }) => item.name === typeName)
    : null;
  return {
    category: category || null,
    typeName: typeName || category || 'the reported change',
    pccpNote: typeConfig?.pccpNote || null,
    description: typeConfig?.desc || null,
  };
};

const getSeverityLabel = (severity: GapSeverity): string => {
  if (severity === 'critical') return 'Reliance blocker';
  if (severity === 'important') return 'Needs support before reliance';
  return 'Advisory';
};

const getSourceClassLabel = (sourceClass: string): string =>
  sourceClass
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getRouteMeta = (determination: any): string =>
  determination?.pathway ? `Current route: ${determination.pathway}` : 'Current route pending';

const significanceQuestionDetails: Record<string, { label: string; short: string }> = {
  C3: {
    label: 'C3 (new or modified cause of harm)',
    short: 'new or modified cause of harm',
  },
  C4: {
    label: 'C4 (new hazardous situation)',
    short: 'new hazardous situation',
  },
  C5: {
    label: 'C5 (risk-control impact)',
    short: 'risk-control impact',
  },
  C6: {
    label: 'C6 (clinical performance impact)',
    short: 'clinical performance impact',
  },
};

const getUncertainSignificanceQuestions = (answers: Answers): string[] =>
  ['C3', 'C4', 'C5', 'C6'].filter((id) => answers[id] === Answer.Uncertain);

const describeSignificanceUncertainty = (answers: Answers): string => {
  const uncertain = getUncertainSignificanceQuestions(answers);
  if (uncertain.length === 0) return 'one or more route-driving significance questions remain unresolved';
  return joinWithAnd(uncertain.map((id) => significanceQuestionDetails[id].label));
};

const getUncertainSignificanceTitle = (answers: Answers, changeLabel: string): string => {
  const uncertain = getUncertainSignificanceQuestions(answers);
  if (uncertain.length === 1) {
    return `${significanceQuestionDetails[uncertain[0]].label} is still unresolved for ${changeLabel}`;
  }
  if (uncertain.length > 1) {
    return `${joinWithAnd(uncertain.map((id) => significanceQuestionDetails[id].label))} remain unresolved for ${changeLabel}`;
  }
  return `A route-driving significance screen is still unresolved for ${changeLabel}`;
};

const getSignificanceEvidenceNeed = (answers: Answers, changeLabel: string): string => {
  const uncertain = getUncertainSignificanceQuestions(answers);
  const evidence = uncertain.map((id) => {
    switch (id) {
      case 'C3':
        return `For C3, show whether ${changeLabel} creates a new cause of harm or materially changes an existing harm pathway, with the affected hazards named explicitly.`;
      case 'C4':
        return `For C4, map ${changeLabel} to the hazardous situations in the risk-management file and show whether any new exposure scenario is introduced.`;
      case 'C5':
        return `For C5, identify every threshold, guardrail, override, monitoring rule, or mitigation touched by ${changeLabel} and document whether any control tied to significant harm changed in design or effectiveness.`;
      case 'C6':
        return `For C6, provide pre/post clinical performance evidence for ${changeLabel}, including site-, subgroup-, modality-, or workflow-specific analyses that match the modified use conditions.`;
      default:
        return null;
    }
  }).filter(Boolean);

  if (evidence.length === 0) {
    return `Resolve the remaining significance screen with case-specific risk analysis and validation evidence for ${changeLabel}.`;
  }

  return evidence.join(' ');
};

const getValidationNeed = (answers: Answers, changeLabel: string): string => {
  const category = answers.B1 as string | undefined;
  const typeName = answers.B2 as string | undefined;

  if (category === 'Training Data' && typeName === 'Additional data — new clinical sites') {
    return `Provide pre/post validation for ${changeLabel} by site, scanner/vendor, acquisition protocol, and affected subgroups so the new-site data is not assessed only in aggregate.`;
  }
  if (category === 'Training Data' && typeName === 'Additional data — expanded demographics') {
    return `Provide pre/post validation for ${changeLabel} by each newly introduced demographic group, not only the overall population average.`;
  }
  if (category === 'Model Architecture') {
    return `Provide architecture-to-architecture comparison for ${changeLabel}, including failure-mode analysis, edge-case review, and subgroup performance rather than only aggregate metrics.`;
  }
  if (category === 'Clinical Output & Decision Thresholds') {
    return `Provide operating-point validation for ${changeLabel}, including sensitivity/specificity tradeoffs, alerting effects, and any downstream clinical workflow impact.`;
  }
  return `Provide pre/post validation for ${changeLabel} at the cleared operating point, including the site-, subgroup-, modality-, or environment-specific analyses that matter for this case.`;
};

const getRepresentativenessNeed = (answers: Answers, changeLabel: string): string => {
  const typeName = answers.B2 as string | undefined;

  if (typeName === 'Additional data — new clinical sites') {
    return `List each newly added site for ${changeLabel}, including scanner/vendor mix, acquisition protocols, geography, and patient demographics, then show why those additions still represent the authorized population and use conditions.`;
  }
  if (typeName === 'Additional data — expanded demographics') {
    return `Document exactly which demographic groups were added for ${changeLabel}, whether each group is still inside the cleared population boundary, and what compensating controls apply if any group is underrepresented.`;
  }
  return `Document the demographic, site, modality, scanner, and operating-condition coverage for the data used to support ${changeLabel}, and explain any gaps or compensating controls.`;
};

const getSubgroupNeed = (answers: Answers, changeLabel: string): string => {
  const typeName = answers.B2 as string | undefined;

  if (typeName === 'Additional data — new clinical sites') {
    return `Provide subgroup performance for ${changeLabel} across the new-site cohorts, including any scanner-, protocol-, age-, sex-, race-, or disease-severity subgroup that could behave differently at those sites.`;
  }
  if (typeName === 'Layer addition / removal') {
    return `Provide subgroup performance showing whether the architectural change in ${changeLabel} shifts errors or confidence for any clinically relevant subgroup, not only the overall validation set.`;
  }
  return `Provide subgroup performance results for the populations and settings affected by ${changeLabel}, and document any disparity, mitigation, or remaining use limitation.`;
};

const getMissingBaselineFields = (answers: Answers): string[] => {
  const missing: string[] = [];
  if (!answers.A1b) missing.push('authorization identifier');
  if (!answers.A1c) missing.push('authorized baseline version');
  if (!answers.A1d) missing.push('authorized IFU statement');
  return missing;
};

const defaultReviewInsight = (
  id: string,
  message: string,
  sourceRefs: string[] = [],
): ReviewInsightItem => ({
  id,
  title: 'Review flagged logic conflict before relying on this assessment',
  meta: 'Expert review item',
  whyThisMatters: message,
  actionLabel: 'What to do',
  actionText:
    'Confirm the underlying answers, update the record if any answer is incorrect, or document why the current answer combination is still justified for this case.',
  sourceRefs,
});

export function buildExpertReviewItems(answers: Answers, determination: any): ReviewInsightItem[] {
  const changeLabel = getChangeLabel(answers);
  const caseExcerpt = getCaseExcerpt(answers);
  const changeContext = getSelectedChange(answers);
  const routeMeta = getRouteMeta(determination);
  const ruleIds: string[] = determination?.decisionTrace?.consistencyRules?.map((rule: { id: string }) => rule.id) || [];
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
          title: getUncertainSignificanceTitle(answers, changeLabel),
          meta: `Internal conservative policy · ${routeMeta}`,
          whyThisMatters: `${uncertainSummary} were answered Uncertain for ${changeLabel}. On the current record, RegAccess therefore keeps the case on the more conservative ${determination.pathway} path until those answers are resolved.${caseExcerpt ? ` Case excerpt: ${caseExcerpt}` : changeContext?.description ? ` Change context: ${changeContext.description}` : ''}`,
          actionLabel: 'Evidence needed to close this',
          actionText: getSignificanceEvidenceNeed(answers, changeLabel),
          sourceRefs: sourceByRuleId[id],
        };
      }
      case 'pma-unresolved-safety-effectiveness-uncertainty-policy':
        return {
          id,
          title: `C_PMA1 (safety or effectiveness impact) is still unresolved for ${changeLabel}`,
          meta: `Internal conservative policy · ${routeMeta}`,
          whyThisMatters: `C_PMA1 was answered Uncertain for ${changeLabel}, so the record does not yet show whether the PMA-approved device is affected in safety or effectiveness terms.`,
          actionLabel: 'Evidence needed to close this',
          actionText: `Document whether ${changeLabel} changes safety or effectiveness using pre/post evidence tied to the approved device, the approved labeling, and the specific modified design elements.`,
          sourceRefs: sourceByRuleId[id],
        };
      case 'baseline-incomplete': {
        const missing = getMissingBaselineFields(answers);
        return {
          id,
          title: 'Define the authorized baseline before relying on this assessment',
          meta: `Reliability gate · ${routeMeta}`,
          whyThisMatters: `The record is missing ${joinWithAnd(missing)}. Without a complete authorized baseline, RegAccess cannot show exactly what "${changeLabel}" is being compared against.`,
          actionLabel: 'What to provide',
          actionText: 'Enter the authorization identifier, the cleared/approved baseline version, and the authorized IFU statement before using this assessment in any regulatory discussion.',
          sourceRefs: sourceByRuleId[id],
        };
      }
      case 'intended-use-uncertain':
        return {
          id,
          title: `B3 (intended-use impact) is still unresolved for ${changeLabel}`,
          meta: `Threshold issue · ${routeMeta}`,
          whyThisMatters: `B3 was answered Uncertain, so the current record does not establish whether "${changeLabel}" stays inside the authorized intended use. That question overrides every lower-level significance and PCCP branch.`,
          actionLabel: 'Evidence needed to close this',
          actionText: 'Compare the authorized IFU word-for-word against the post-change device description, clinical claims, population, and use setting. If internal review cannot close the gap, use an FDA Pre-Submission.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'cybersecurity-exemption-uncertain':
        return {
          id,
          title: `C1 (cybersecurity-only exemption) is still unresolved for ${changeLabel}`,
          meta: `Final guidance · ${routeMeta}`,
          whyThisMatters: `C1 was answered Uncertain, so the record does not yet show whether "${changeLabel}" is purely cybersecurity-related with zero functional impact.`,
          actionLabel: 'Evidence needed to close this',
          actionText: 'Document whether the change is solely cybersecurity-related, show that it does not affect device behavior or ML inference outputs, and stop treating the exemption as available unless that record is complete.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'restore-to-spec-uncertain':
        return {
          id,
          title: `C2 (restore-to-specification exemption) is still unresolved for ${changeLabel}`,
          meta: `Final guidance · ${routeMeta}`,
          whyThisMatters: `C2 was answered Uncertain, so the record does not yet show whether "${changeLabel}" truly restores the device to a previously authorized configuration.`,
          actionLabel: 'Evidence needed to close this',
          actionText: 'Identify the exact authorized target state, show that the proposed fix restores the device to that state, and document that no additional functional or ML behavior changes are introduced.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'demographic-expansion-with-b3-no':
        return {
          id,
          title: 'Reconcile population expansion with the intended-use answer',
          meta: `Regulatory consistency check · ${routeMeta}`,
          whyThisMatters: `The record indicates that new demographic populations may be involved, while B3 was answered No. That combination can be credible only if "${changeLabel}" stays within the originally authorized population.`,
          actionLabel: 'What to confirm',
          actionText: 'Compare the introduced population against the cleared/approved population boundary and document why the change does or does not expand clinical scope.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'cumulative-drift-conflicts-with-nonsignificant-us-assessment':
        return {
          id,
          title: 'Reconcile cumulative drift with the current non-significant answers',
          meta: `Cumulative change review · ${routeMeta}`,
          whyThisMatters: `The running change log suggests cumulative drift, but the current U.S. significance branch otherwise reads as non-significant. That combination weakens confidence in the present route for "${changeLabel}".`,
          actionLabel: 'What to review',
          actionText: 'Reassess the current device against the last authorized baseline and document whether the cumulative change set still supports the current route.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'denovo-fit-failed-with-all-significance-no':
      case 'denovo-fit-uncertain':
        return {
          id,
          title: 'Resolve De Novo device-type fit before relying on the current route',
          meta: `Device-type fit check · ${routeMeta}`,
          whyThisMatters: `The current record does not clearly show that the modified device still fits the De Novo device type and special controls after "${changeLabel}". That threshold issue takes priority over a routine significance close-out.`,
          actionLabel: 'What to review',
          actionText: 'Compare the modified device against the De Novo classification order and each special control. If the fit remains uncertain, use an FDA Pre-Submission.',
          sourceRefs: sourceByRuleId[id],
        };
      case 'nonpma-genai-guardrail-c5-conflict':
      case 'nonpma-bias-mitigation-c5-conflict':
      case 'nonpma-monitoring-threshold-c5-conflict':
        return {
          id,
          title: `Reconcile C5 (risk-control impact) with the recorded ${changeLabel} change`,
          meta: `Risk-control consistency check · ${routeMeta}`,
          whyThisMatters: `The current answer set says the reported change does not affect risk-control significance, but the change description suggests that "${changeLabel}" may touch an existing control or mitigation.`,
          actionLabel: 'Evidence needed to close this',
          actionText: `Review whether the modified feature in ${changeLabel} functions as a risk control tied to significant harm, and document the pre/post control design, effectiveness, and affected hazards before finalizing C5.`,
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
          title: `Reconcile C_PMA1 with the recorded ${changeLabel} change`,
          meta: `PMA consistency check · ${routeMeta}`,
          whyThisMatters: `The current answer set says the change does not affect safety or effectiveness, but the reported "${changeLabel}" modification is the kind of change that can affect PMA review obligations.`,
          actionLabel: 'Evidence needed to close this',
          actionText: `Review ${changeLabel} against C_PMA1 and either document why the change truly has no safety/effectiveness impact or update the PMA answer set accordingly.`,
          sourceRefs: sourceByRuleId[id],
        };
      case 'nonpma-foundation-model-all-significance-no':
      case 'nonpma-prompt-rag-all-significance-no':
        return {
          id,
          title: 'Reconcile the AI/ML change description with the non-significant answer set',
          meta: `AI/ML consistency check · ${routeMeta}`,
          whyThisMatters: `The reported "${changeLabel}" modification is normally expected to affect risk, performance, or scope review more than the current all-No significance branch suggests.`,
          actionLabel: 'What to review',
          actionText: 'Re-run the significance questions against the actual change record and document why each answer remains No, or update the answers if the change is more consequential than first recorded.',
          sourceRefs: sourceByRuleId[id],
        };
      default:
        return defaultReviewInsight(
          id,
          determination?.consistencyIssues?.find((message: string) => message.includes(changeLabel)) ||
            determination?.consistencyIssues?.[0] ||
            'The current record contains a flagged issue that should be reviewed before reliance.',
          sourceByRuleId[id] || [],
        );
    }
  });

  if (built.length > 0) return built;

  return (determination?.consistencyIssues || []).map((message: string, index: number) =>
    defaultReviewInsight(`consistency-${index}`, message),
  );
}

export function buildEvidenceGapInsightItems(
  answers: Answers,
  determination: any,
  gaps: EvidenceGap[],
): EvidenceGapInsightItem[] {
  const changeLabel = getChangeLabel(answers);
  const changeContext = getSelectedChange(answers);
  const caseExcerpt = getCaseExcerpt(answers);
  const uncertainSignificance = describeSignificanceUncertainty(answers);

  return gaps.map((gap) => {
    const baseMeta = `${gap.category} · ${getSeverityLabel(gap.severity)} · ${getSourceClassLabel(gap.sourceClass)} · ${getRouteMeta(determination)}`;
    const defaultItem: EvidenceGapInsightItem = {
      id: gap.id,
      category: gap.category,
      severity: gap.severity,
      title: gap.description,
      meta: baseMeta,
      whyThisMatters: `This item is still open for "${changeLabel}", so the current record does not yet fully support reliance on the assessment result.`,
      actionLabel: 'What to provide',
      actionText: gap.remediation,
      sourceRefs: splitSources(gap.source),
    };

    switch (gap.id) {
      case 'GAP-TRAINING-REPR':
        return {
          ...defaultItem,
          title: `The data supporting ${changeLabel} is not yet shown to represent the cleared population`,
          whyThisMatters: `E1 was answered ${getAnswerLabel(answers.E1)}, so the current record does not show whether the training, validation, or test data supporting ${changeLabel} represents the authorized patient population and operating conditions.${caseExcerpt ? ` Case excerpt: ${caseExcerpt}` : changeContext?.description ? ` Change context: ${changeContext.description}` : ''}`,
          actionText: getRepresentativenessNeed(answers, changeLabel),
        };
      case 'GAP-SUBGROUP':
        return {
          ...defaultItem,
          title: `Subgroup performance is not yet shown for the populations affected by ${changeLabel}`,
          whyThisMatters: `E2 was answered No, so the record does not show whether ${changeLabel} performs acceptably across the relevant demographic groups or operating subgroups.`,
          actionText: getSubgroupNeed(answers, changeLabel),
        };
      case 'GAP-SIG-UNCERTAIN':
        return {
          ...defaultItem,
          title: getUncertainSignificanceTitle(answers, changeLabel),
          whyThisMatters: `${uncertainSignificance} remain Uncertain for ${changeLabel}, so RegAccess keeps the pathway conservative until those answers are converted to documented Yes or No conclusions.`,
          actionLabel: 'Evidence needed to close this',
          actionText: getSignificanceEvidenceNeed(answers, changeLabel),
        };
      case 'GAP-VALIDATION':
        return {
          ...defaultItem,
          title: `Case-specific validation is still missing for ${changeLabel}`,
          whyThisMatters: `The current answer pattern indicates that clinical performance impact has not been clearly ruled out for ${changeLabel}.`,
          actionText: getValidationNeed(answers, changeLabel),
        };
      case 'GAP-BASELINE': {
        const missing = getMissingBaselineFields(answers);
        return {
          ...defaultItem,
          title: 'The authorized baseline is still incomplete',
          whyThisMatters: `The record is missing ${joinWithAnd(missing)}, so the assessment cannot show exactly what "${changeLabel}" is being compared against.`,
          actionText: 'Provide the authorization number, authorized baseline version, and authorized IFU statement before relying on any route conclusion.',
        };
      }
      case 'GAP-IFU-UNCERTAIN':
        return {
          ...defaultItem,
          title: `B3 (intended-use impact) is still unresolved for ${changeLabel}`,
          whyThisMatters: `B3 was answered Uncertain, so the current record does not establish whether "${changeLabel}" stays inside the authorized intended use.`,
          actionText: 'Compare the authorized IFU against the post-change device description word-for-word. If internal review cannot close the gap, prepare an FDA Pre-Submission.',
        };
      case 'GAP-IFU-MISSING':
        return {
          ...defaultItem,
          title: `B3 (intended-use impact) has not been answered for ${changeLabel}`,
          whyThisMatters: `The assessment cannot proceed credibly without an explicit B3 answer for "${changeLabel}".`,
          actionText: 'Answer whether the change affects intended use before relying on any downstream significance or PCCP conclusion.',
        };
      case 'GAP-SIG-INCOMPLETE':
        return {
          ...defaultItem,
          title: `One or more 510(k)/De Novo significance screens are still incomplete for ${changeLabel}`,
          whyThisMatters: `The non-PMA significance branch is not fully answered for "${changeLabel}", so the current route cannot be treated as fully supported.`,
          actionText: 'Complete the visible significance screens (C3-C6) and document the evidence behind each answer.',
        };
      case 'GAP-POPULATION-SCOPE':
        return {
          ...defaultItem,
          title: `The record suggests population expansion for ${changeLabel}, but the authorized boundary is not yet reconciled`,
          whyThisMatters: `E3 was answered ${getAnswerLabel(answers.E3)}, so the current record suggests that ${changeLabel} may involve populations not clearly covered by the authorized baseline.`,
          actionText: 'Document exactly which populations were introduced by this change, whether each group remains inside the authorized scope, and what subgroup evidence supports that conclusion.',
        };
      case 'GAP-BIAS-ASSESSMENT-UPDATE':
        return {
          ...defaultItem,
          title: `The bias and equity review has not been updated for ${changeLabel}`,
          whyThisMatters: `E4 was answered No, so the record still relies on the original submission-era bias analysis even though ${changeLabel} changes the current device record.`,
          actionText: 'Update the bias and equity assessment specifically for this change, naming the affected populations, environments, failure modes, and mitigations rather than relying on the original submission narrative.',
        };
      case 'GAP-BIAS-MITIGATION':
        return {
          ...defaultItem,
          title: `The modified bias mitigation in ${changeLabel} is not yet shown to remain effective`,
          whyThisMatters: `E5 was answered ${getAnswerLabel(answers.E5)}, so the record indicates that a bias mitigation may have changed, weakened, or been removed as part of ${changeLabel}.`,
          actionText: 'Document exactly what changed in the mitigation, whether it functions as a risk control, and what validation or risk analysis shows it remains effective for the affected populations.',
        };
      case 'GAP-CUMULATIVE':
        return {
          ...defaultItem,
          title: `Cumulative drift since the last authorized baseline is still open for ${changeLabel}`,
          whyThisMatters: `The current record indicates cumulative drift relative to the last authorized baseline, so ${changeLabel} cannot be assessed in isolation.`,
          actionText: 'Review the cumulative change log against the last authorized baseline and document whether the full change set, not just this discrete change, still supports the present route.',
        };
      case 'GAP-SE-UNCERTAIN':
        return {
          ...defaultItem,
          title: `Predicate fit / substantial equivalence is still unresolved for the cumulative record`,
          whyThisMatters: `The cumulative-change review still does not show whether substantial equivalence remains supportable after ${changeLabel}.`,
          actionText: 'Compare the current modified device against the predicate on the full cumulative-change record and document whether substantial equivalence remains supportable after all accumulated changes.',
        };
      case 'GAP-PCCP-SCOPE':
        return {
          ...defaultItem,
          title: `This change has not yet been shown to fit inside the authorized PCCP`,
          whyThisMatters: `An authorized PCCP may exist, but the current scope review is incomplete, so RegAccess cannot show that ${changeLabel} fits inside the authorized PCCP boundaries.`,
          actionText: `Complete the PCCP scope gates and document the specific fit for "${changeLabel}"${changeContext?.pccpNote ? `, including this expected boundary condition: ${changeContext.pccpNote}` : ''}.`,
        };
      case 'GAP-PCCP-FAILED':
        return {
          ...defaultItem,
          title: `This change falls outside the authorized PCCP as currently recorded`,
          whyThisMatters: `The current PCCP scope review indicates that ${changeLabel} is outside at least one authorized PCCP gate or boundary.`,
          actionText: 'Identify which PCCP gate failed, document why it failed, and decide whether the correct next step is a standard submission or a future PCCP expansion request.',
        };
      case 'GAP-DENOVO-FIT':
        return {
          ...defaultItem,
          title: `De Novo device-type fit is still unresolved for ${changeLabel}`,
          whyThisMatters: `The current record does not clearly show that the modified device still fits the De Novo device type and special controls after ${changeLabel}.`,
          actionText: 'Compare the modified device against the De Novo classification order and each special control, and use an FDA Pre-Submission if fit remains uncertain.',
        };
      case 'GAP-GENAI-HALLUCINATION':
        return {
          ...defaultItem,
          title: `GenAI factual-accuracy / hallucination testing is still missing for ${changeLabel}`,
          whyThisMatters: `The case includes a GenAI high-impact change, but the record does not yet show hallucination/factual-accuracy testing appropriate for the modified behavior.`,
          actionText: 'Provide the GenAI hallucination or factual-accuracy test plan, results, and pass/fail criteria specific to the modified configuration.',
        };
      case 'GAP-GENAI-GUARDRAIL':
        return {
          ...defaultItem,
          title: `The guardrail or safety-filter change in ${changeLabel} is not yet tied to a completed risk assessment`,
          whyThisMatters: `The record shows a guardrail or safety-filter modification, but the effect of that change on hazardous situations or PMA safety/effectiveness has not been fully closed.`,
          actionText: 'Show how the guardrail change affects each relevant hazardous situation or PMA safety/effectiveness question, and document the resulting control effectiveness.',
        };
      case 'GAP-CYBER-EXEMPT':
        return {
          ...defaultItem,
          title: `Cybersecurity-only treatment is still not supported for ${changeLabel}`,
          whyThisMatters: `C1 was answered Uncertain, so the record does not yet show whether ${changeLabel} is a pure cybersecurity change with zero functional impact.`,
          actionText: 'Document either that the change is solely cybersecurity-related with zero device-behavior impact, or that it should not be treated as exemption-eligible.',
        };
      case 'GAP-PMA-INCOMPLETE':
        return {
          ...defaultItem,
          title: `The PMA safety/effectiveness review is still incomplete for ${changeLabel}`,
          whyThisMatters: `The PMA-specific review is not fully answered, so the current record does not yet show whether ${changeLabel} requires supplement handling.`,
          actionText: 'Complete the PMA-specific assessment and document whether the change affects safety or effectiveness, labeling, or qualifying manufacturing methods.',
        };
      default:
        return defaultItem;
    }
  });
}
