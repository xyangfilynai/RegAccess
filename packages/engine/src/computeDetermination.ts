import { Answer, AuthPathway, Pathway, Answers, answerIsOneOf } from './types';
import { CATEGORY_POST_MARKET, CHANGE_MONITORING_THRESHOLD_PREFIX } from './changeTaxonomy';
import { parseNumericAnswer } from './utils';

type PathwayValue = (typeof Pathway)[keyof typeof Pathway];

interface DeterminationFacts {
  isPMA: boolean;
  isNonPMA: boolean;
  isDeNovo: boolean;
  is510k: boolean;
  hasPCCP: boolean;
  isIntendedUseChange: boolean;
  isIntendedUseUncertain: boolean;
  intendedUseAnsweredNo: boolean;
  isCyberOnly: boolean;
  isBugFix: boolean;
  deNovoDeviceTypeFitFailed: boolean;
  deNovoDeviceTypeFitUncertain: boolean;
  baselineIncomplete: boolean;
  c3No: boolean;
  c4No: boolean;
  c5No: boolean;
  c6No: boolean;
  allUSSignificanceAnswersNo: boolean;
  baseSignificant: boolean;
  hasUncertainSignificance: boolean;
  allSignificanceNo: boolean;
  hasChangesSinceLastSub: boolean;
  cumulativeEscalation: boolean;
  seNotSupportable: boolean;
  seUncertain: boolean;
  needsCumulativeSEField: boolean;
  cumulativeDriftUnresolved: boolean;
  significanceIncomplete: boolean;
  hasGenAIGuardrailChange: boolean;
  hasFoundationModelChange: boolean;
  hasPromptChange: boolean;
  hasRAGChange: boolean;
  hasPromptOrRAGChange: boolean;
  introducedNewDemographicPopulation: boolean;
  cybersecurityExemptionUncertain: boolean;
  restoreToSpecExemptionUncertain: boolean;
  monitoringThresholdChange: boolean;
  biasMitigationChanged: boolean;
  genAIHighImpactChange: boolean;
  pmaSafetyEffectivenessNo: boolean;
  pmaSafetyEffectivenessUncertain: boolean;
  pmaLabelingChange: boolean;
  pmaManufacturingChange: boolean;
  isSignificant: boolean;
  pmaThresholdFieldsAnswered: boolean;
  pmaIncomplete: boolean;
  pmaRequiresSupplement: boolean;
  p3Applicable: boolean;
  p4Applicable: boolean;
  p5Applicable: boolean;
  pccpScopeVerified: boolean;
  pccpScopeFailed: boolean;
  pccpIncomplete: boolean;
}

interface RuleTrace {
  id: string;
  description: string;
}

interface DecisionTrace {
  pathwayRule: RuleTrace;
  consistencyRules: RuleTrace[];
  pccpRecommendationRule: RuleTrace;
}

interface PCCPRecommendation {
  shouldRecommend: true;
}

export interface DeterminationResult {
  pathway: PathwayValue;
  isDocOnly: boolean;
  isLetterToFile: boolean;
  isPMAAnnualReport: boolean;
  isPCCPImpl: boolean;
  isNewSub: boolean;
  isIncomplete: boolean;
  isIntendedUseChange: boolean;
  isIntendedUseUncertain: boolean;
  isCyberOnly: boolean;
  isBugFix: boolean;
  isSignificant: boolean;
  baseSignificant: boolean;
  allSignificanceNo: boolean;
  significanceIncomplete: boolean;
  hasUncertainSignificance: boolean;
  cumulativeEscalation: boolean;
  seNotSupportable: boolean;
  seUncertain: boolean;
  genAIHighImpactChange: boolean;
  consistencyIssues: string[];
  deNovoDeviceTypeFitFailed: boolean;
  baselineIncomplete: boolean;
  pmaRequiresSupplement: boolean;
  pmaIncomplete: boolean;
  cumulativeDriftUnresolved: boolean;
  pccpScopeVerified: boolean;
  pccpScopeFailed: boolean;
  pccpIncomplete: boolean;
  pccpRecommendation: PCCPRecommendation | null;
  decisionTrace: DecisionTrace;
}

type RuleCondition<Facts> =
  | { all: RuleCondition<Facts>[] }
  | { any: RuleCondition<Facts>[] }
  | { not: RuleCondition<Facts> }
  | { fact: keyof Facts; equals: unknown };

interface DeclarativeRule<Facts, Outcome> {
  id: string;
  description: string;
  when: RuleCondition<Facts>;
  outcome: Outcome;
}

interface IssueRule<Facts> {
  id: string;
  description: string;
  when: RuleCondition<Facts>;
  message: string;
}

const all = <Facts>(...conditions: RuleCondition<Facts>[]): RuleCondition<Facts> => ({ all: conditions });
const anyOf = <Facts>(...conditions: RuleCondition<Facts>[]): RuleCondition<Facts> => ({ any: conditions });
const eq = <Facts, Key extends keyof Facts>(fact: Key, equals: Facts[Key]): RuleCondition<Facts> => ({
  fact,
  equals,
});

const matchesCondition = <Facts extends object>(facts: Facts, condition: RuleCondition<Facts>): boolean => {
  if ('all' in condition) return condition.all.every((child) => matchesCondition(facts, child));
  if ('any' in condition) return condition.any.some((child) => matchesCondition(facts, child));
  if ('not' in condition) return !matchesCondition(facts, condition.not);
  return Object.is(facts[condition.fact], condition.equals);
};

const selectFirstMatchingRule = <Facts extends object, Outcome>(
  facts: Facts,
  rules: DeclarativeRule<Facts, Outcome>[],
): DeclarativeRule<Facts, Outcome> => {
  const matchedRule = rules.find((rule) => matchesCondition(facts, rule.when));
  if (!matchedRule) {
    // Unreachable: the final pathway rule uses an unconditional all() match as a
    // catch-all fallback, so at least one rule will always match. This throw exists
    // only as a defensive safeguard in case rules are inadvertently reordered.
    throw new Error('No declarative determination rule matched the current fact set.');
  }
  return matchedRule;
};

const collectTriggeredRules = <Facts extends object>(facts: Facts, rules: IssueRule<Facts>[]): IssueRule<Facts>[] =>
  rules.filter((rule) => matchesCondition(facts, rule.when));

const buildDeterminationFacts = (ans: Answers): DeterminationFacts => {
  const isIntendedUseChange = ans.B3 === Answer.Yes;
  const isIntendedUseUncertain = ans.B3 === Answer.Uncertain;
  const intendedUseAnsweredNo = ans.B3 === Answer.No;

  const isPMA = ans.A1 === AuthPathway.PMA;
  const isNonPMA = !isPMA;
  const isDeNovo = ans.A1 === AuthPathway.DeNovo;
  const is510k = ans.A1 === AuthPathway.FiveOneZeroK;
  const hasPCCP = ans.A2 === Answer.Yes;

  const isCyberOnly = isNonPMA && !isIntendedUseChange && !isIntendedUseUncertain && ans.C1 === Answer.Yes;
  const isBugFix = isNonPMA && !isIntendedUseChange && !isIntendedUseUncertain && !isCyberOnly && ans.C2 === Answer.Yes;

  const deNovoDeviceTypeFitFailed =
    isDeNovo &&
    !isIntendedUseChange &&
    !isIntendedUseUncertain &&
    (ans.C0_DN1 === Answer.No || ans.C0_DN2 === Answer.No);
  const deNovoDeviceTypeFitUncertain =
    isDeNovo &&
    !isIntendedUseChange &&
    !isIntendedUseUncertain &&
    (ans.C0_DN1 === Answer.Uncertain || ans.C0_DN2 === Answer.Uncertain);

  const baselineIncomplete = !ans.A1b || !ans.A1c || !ans.A1d;

  const c3No = ans.C3 === Answer.No;
  const c4No = ans.C4 === Answer.No;
  const c5No = ans.C5 === Answer.No;
  const c6No = ans.C6 === Answer.No;
  const allUSSignificanceAnswersNo = c3No && c4No && c5No && c6No;

  const significanceAnswers = [ans.C3, ans.C4, ans.C5, ans.C6];
  const baseSignificant =
    isNonPMA &&
    !isIntendedUseUncertain &&
    (significanceAnswers.includes(Answer.Yes) || significanceAnswers.includes(Answer.Uncertain));
  const hasUncertainSignificance =
    isNonPMA && !isIntendedUseUncertain && significanceAnswers.includes(Answer.Uncertain);
  const allSignificanceNo =
    isNonPMA &&
    !isIntendedUseChange &&
    !isIntendedUseUncertain &&
    !isCyberOnly &&
    !isBugFix &&
    allUSSignificanceAnswersNo;

  const changeCount = parseNumericAnswer(ans.A8);
  const hasChangesSinceLastSub = changeCount !== null && changeCount > 0;
  const cumulativeEscalation =
    isNonPMA && hasChangesSinceLastSub && (ans.C10 === Answer.Yes || ans.C10 === Answer.Uncertain);
  const seNotSupportable = isNonPMA && hasChangesSinceLastSub && ans.C11 === Answer.No;
  const seUncertain = isNonPMA && hasChangesSinceLastSub && ans.C11 === Answer.Uncertain;
  const needsCumulativeSEField =
    isNonPMA &&
    hasChangesSinceLastSub &&
    is510k &&
    !isIntendedUseChange &&
    !isIntendedUseUncertain &&
    !isCyberOnly &&
    !isBugFix &&
    allUSSignificanceAnswersNo &&
    ans.C10 === Answer.Yes &&
    !answerIsOneOf(ans.C11, [Answer.Yes, Answer.No, Answer.Uncertain]);

  const cumulativeDriftUnresolved =
    cumulativeEscalation &&
    allSignificanceNo &&
    !seNotSupportable &&
    (ans.C10 === Answer.Uncertain || !answerIsOneOf(ans.C11, [Answer.Yes, Answer.No]));

  const significanceIncomplete =
    isNonPMA &&
    !isIntendedUseChange &&
    !isIntendedUseUncertain &&
    !isCyberOnly &&
    !isBugFix &&
    ((!baseSignificant && !allSignificanceNo) ||
      deNovoDeviceTypeFitUncertain ||
      seUncertain ||
      needsCumulativeSEField ||
      cumulativeDriftUnresolved);

  const hasGenAIGuardrailChange = ans.D4 === Answer.Yes;
  const hasFoundationModelChange = ans.D1 === Answer.Yes;
  const hasPromptChange = ans.D2 === Answer.Yes;
  const hasRAGChange = ans.D3 === Answer.Yes;
  const hasPromptOrRAGChange = hasPromptChange || hasRAGChange;
  const introducedNewDemographicPopulation = ans.E3 === Answer.Yes;
  const cybersecurityExemptionUncertain = isNonPMA && ans.C1 === Answer.Uncertain;
  const restoreToSpecExemptionUncertain = isNonPMA && ans.C2 === Answer.Uncertain;
  const monitoringThresholdChange =
    ans.B1 === CATEGORY_POST_MARKET &&
    typeof ans.B2 === 'string' &&
    ans.B2.includes(CHANGE_MONITORING_THRESHOLD_PREFIX);
  const biasMitigationChanged = ans.E5 === Answer.Yes;
  const genAIHighImpactChange = hasFoundationModelChange || hasGenAIGuardrailChange;

  const isSignificant = baseSignificant || seNotSupportable;

  const pmaSafetyEffectivenessNo = ans.C_PMA1 === Answer.No;
  const pmaSafetyEffectivenessUncertain = ans.C_PMA1 === Answer.Uncertain;
  const pmaLabelingChange = ans.C_PMA2 === Answer.Yes;
  const pmaManufacturingChange = ans.C_PMA3 === Answer.Yes;
  const pmaThresholdFieldsAnswered =
    isPMA &&
    !isIntendedUseChange &&
    !isIntendedUseUncertain &&
    answerIsOneOf(ans.C_PMA1, [Answer.Yes, Answer.No, Answer.Uncertain]);
  const pmaIncomplete = isPMA && !isIntendedUseChange && !isIntendedUseUncertain && !pmaThresholdFieldsAnswered;
  const pmaRequiresSupplement =
    isPMA && (isIntendedUseChange || ans.C_PMA1 === Answer.Yes || ans.C_PMA1 === Answer.Uncertain);

  const p3Applicable = hasPCCP && ans.P1 === Answer.Yes && ans.P2 === Answer.Yes;
  const p4Applicable = p3Applicable && ans.P3 === Answer.Yes;
  const p5Applicable = p4Applicable && ans.P4 === Answer.Yes;
  const pccpScopeVerified =
    hasPCCP &&
    ans.P1 === Answer.Yes &&
    ans.P2 === Answer.Yes &&
    ans.P3 === Answer.Yes &&
    ans.P4 === Answer.Yes &&
    (!p5Applicable || ans.P5 === Answer.Yes);
  const pccpScopeFailed =
    hasPCCP &&
    !isIntendedUseChange &&
    !isIntendedUseUncertain &&
    (ans.P1 === Answer.No ||
      (ans.P1 === Answer.Yes && ans.P2 === Answer.No) ||
      (p3Applicable && ans.P3 === Answer.No) ||
      (p4Applicable && ans.P4 === Answer.No) ||
      (p5Applicable && ans.P5 === Answer.No));
  const pccpIncomplete =
    hasPCCP &&
    !isIntendedUseChange &&
    !isIntendedUseUncertain &&
    !pccpScopeVerified &&
    !pccpScopeFailed &&
    ((isNonPMA && isSignificant) || (isPMA && !pmaIncomplete && pmaRequiresSupplement));

  return {
    isPMA,
    isNonPMA,
    isDeNovo,
    is510k,
    hasPCCP,
    isIntendedUseChange,
    isIntendedUseUncertain,
    intendedUseAnsweredNo,
    isCyberOnly,
    isBugFix,
    deNovoDeviceTypeFitFailed,
    deNovoDeviceTypeFitUncertain,
    baselineIncomplete,
    c3No,
    c4No,
    c5No,
    c6No,
    allUSSignificanceAnswersNo,
    baseSignificant,
    hasUncertainSignificance,
    allSignificanceNo,
    hasChangesSinceLastSub,
    cumulativeEscalation,
    seNotSupportable,
    seUncertain,
    needsCumulativeSEField,
    cumulativeDriftUnresolved,
    significanceIncomplete,
    hasGenAIGuardrailChange,
    hasFoundationModelChange,
    hasPromptChange,
    hasRAGChange,
    hasPromptOrRAGChange,
    introducedNewDemographicPopulation,
    cybersecurityExemptionUncertain,
    restoreToSpecExemptionUncertain,
    monitoringThresholdChange,
    biasMitigationChanged,
    genAIHighImpactChange,
    pmaSafetyEffectivenessNo,
    pmaSafetyEffectivenessUncertain,
    pmaLabelingChange,
    pmaManufacturingChange,
    isSignificant,
    pmaThresholdFieldsAnswered,
    pmaIncomplete,
    pmaRequiresSupplement,
    p3Applicable,
    p4Applicable,
    p5Applicable,
    pccpScopeVerified,
    pccpScopeFailed,
    pccpIncomplete,
  };
};

const consistencyIssueRules: IssueRule<DeterminationFacts>[] = [
  {
    id: 'nonpma-genai-guardrail-c5-conflict',
    description: 'GenAI guardrail changes should not bypass the non-PMA risk-control significance screen.',
    when: all(eq('isNonPMA', true), eq('hasGenAIGuardrailChange', true), eq('c5No', true)),
    message:
      'A GenAI guardrail / safety filter change was marked YES, but the risk-control significance field (C5) was marked NO. Reassess C5 before relying on the determination.',
  },
  {
    id: 'pma-genai-guardrail-cpma1-conflict',
    description: 'GenAI guardrail changes for PMA devices should not bypass the safety/effectiveness screen.',
    when: all(eq('isPMA', true), eq('hasGenAIGuardrailChange', true), eq('pmaSafetyEffectivenessNo', true)),
    message:
      'A GenAI guardrail / safety filter change was marked YES, but the PMA safety/effectiveness field (C_PMA1) was marked NO. Guardrail changes directly affect risk controls — reassess C_PMA1 before relying on the determination.',
  },
  {
    id: 'nonpma-foundation-model-all-significance-no',
    description: 'Foundation-model changes should not look non-significant across every U.S. significance field.',
    when: all(eq('isNonPMA', true), eq('hasFoundationModelChange', true), eq('allUSSignificanceAnswersNo', true)),
    message:
      'A foundation/base model change was marked non-significant across all U.S. significance fields (C3–C6). This is unusual and should be re-reviewed against performance, risk, and intended-use baselines.',
  },
  {
    id: 'pma-foundation-model-cpma1-conflict',
    description: 'Foundation-model changes for PMA devices should not bypass the safety/effectiveness screen.',
    when: all(eq('isPMA', true), eq('hasFoundationModelChange', true), eq('pmaSafetyEffectivenessNo', true)),
    message:
      'A foundation/base model change was reported, but the PMA safety/effectiveness field (C_PMA1) was marked NO. Base model swaps typically affect safety or effectiveness — reassess C_PMA1 before relying on the determination.',
  },
  {
    id: 'nonpma-prompt-rag-all-significance-no',
    description: 'Prompt or RAG changes should be reconciled against the non-PMA significance screens.',
    when: all(eq('isNonPMA', true), eq('hasPromptOrRAGChange', true), eq('allUSSignificanceAnswersNo', true)),
    message:
      'A prompt or RAG knowledge-base change was marked non-significant across all U.S. significance fields (C3–C6). Confirm the clinical behavior, risk-control, and performance rationale before closing as Letter to File.',
  },
  {
    id: 'pma-prompt-rag-cpma1-conflict',
    description: 'Prompt or RAG changes for PMA devices should be reconciled against the safety/effectiveness screen.',
    when: all(eq('isPMA', true), eq('hasPromptOrRAGChange', true), eq('pmaSafetyEffectivenessNo', true)),
    message:
      'A prompt or RAG knowledge-base change was reported, but the PMA safety/effectiveness field (C_PMA1) was marked NO. Prompt and RAG changes can alter clinical behavior — reassess C_PMA1 before relying on the determination.',
  },
  {
    id: 'demographic-expansion-with-b3-no',
    description: 'New demographic populations should be reconciled against the intended-use answer.',
    when: all(eq('introducedNewDemographicPopulation', true), eq('intendedUseAnsweredNo', true)),
    message:
      'New demographic populations were introduced while intended-use impact was marked NO. Confirm that this does not expand the authorized population or effective clinical scope.',
  },
  {
    id: 'cumulative-drift-conflicts-with-nonsignificant-us-assessment',
    description:
      'Cumulative drift warnings should surface when they conflict with an otherwise non-significant U.S. assessment.',
    when: all(eq('cumulativeEscalation', true), eq('allSignificanceNo', true)),
    message:
      'Cumulative drift / substantial-equivalence answers conflict with an otherwise non-significant U.S. assessment. Reassess against the last authorized baseline before finalizing.',
  },
  {
    id: 'denovo-fit-failed-with-all-significance-no',
    description: 'Failed De Novo device-type fit should override a non-significant significance branch.',
    when: all(eq('deNovoDeviceTypeFitFailed', true), eq('allSignificanceNo', true)),
    message:
      'The modified device may no longer fit the De Novo device type / special controls, but all U.S. significance fields were marked non-significant. Device-type fit takes priority — consider an FDA Pre-Submission before treating Letter to File as sufficient.',
  },
  {
    id: 'denovo-fit-uncertain',
    description: 'Uncertain De Novo device-type fit requires explicit escalation.',
    when: eq('deNovoDeviceTypeFitUncertain', true),
    message:
      'The modified device’s continued fit with the De Novo device type / special controls is uncertain. Resolve this with expert review or an FDA Pre-Submission before relying on a documentation-only pathway.',
  },
  {
    id: 'intended-use-uncertain',
    description: 'Intended-use uncertainty is a threshold issue and must always be surfaced.',
    when: eq('isIntendedUseUncertain', true),
    message:
      'Intended use impact is marked Uncertain. This uncertainty must be resolved through RA/clinical expert review or an FDA Pre-Submission (Q-Sub) before relying on any pathway determination. Do not treat this assessment as a final regulatory conclusion.',
  },
  {
    id: 'cybersecurity-exemption-uncertain',
    description: 'Uncertain cybersecurity exemption eligibility requires a warning.',
    when: eq('cybersecurityExemptionUncertain', true),
    message:
      'Cybersecurity exemption eligibility is uncertain. The exemption requires affirmative demonstration that the change is solely to strengthen cybersecurity with zero functional impact. Because this could not be confirmed, the assessment continues to the full significance evaluation. Resolve the uncertainty before claiming exemption in any regulatory documentation.',
  },
  {
    id: 'restore-to-spec-uncertain',
    description: 'Uncertain restore-to-specification eligibility requires a warning.',
    when: eq('restoreToSpecExemptionUncertain', true),
    message:
      'Restore-to-specification exemption eligibility is uncertain. The exemption requires affirmative demonstration that the change restores the device to a known, documented, cleared state. Because this could not be confirmed, the assessment continues to the full significance evaluation.',
  },
  {
    id: 'nonpma-monitoring-threshold-c5-conflict',
    description: 'Monitoring-threshold changes should not bypass the non-PMA risk-control significance screen.',
    when: all(eq('isNonPMA', true), eq('monitoringThresholdChange', true), eq('c5No', true)),
    message:
      'A monitoring threshold change was reported with no risk-control impact. If the change weakens monitoring sensitivity, it may affect an existing risk control measure. Reassess C5.',
  },
  {
    id: 'pma-monitoring-threshold-cpma1-conflict',
    description: 'Monitoring-threshold changes for PMA devices should not bypass the safety/effectiveness screen.',
    when: all(eq('isPMA', true), eq('monitoringThresholdChange', true), eq('pmaSafetyEffectivenessNo', true)),
    message:
      'A monitoring threshold change was reported, but the PMA safety/effectiveness field (C_PMA1) was marked NO. If the change weakens monitoring sensitivity, it may affect safety or effectiveness. Reassess C_PMA1.',
  },
  {
    id: 'baseline-incomplete',
    description: 'Incomplete baseline fields undermine determination reliability.',
    when: eq('baselineIncomplete', true),
    message:
      'One or more baseline fields (authorization identifier, baseline version, or authorized IFU statement) are not provided. The determination may be unreliable without a defined authorized baseline for comparison. Flagged for expert judgment.',
  },
  {
    id: 'nonpma-unresolved-significance-uncertainty-policy',
    description: 'Unresolved non-PMA significance uncertainty triggers the internal conservative-policy warning.',
    when: all(
      eq('hasUncertainSignificance', true),
      eq('baseSignificant', true),
      eq('isIntendedUseChange', false),
      eq('isIntendedUseUncertain', false),
    ),
    message:
      "One or more significance fields were answered 'Uncertain.' ChangePath applies an internal conservative policy that treats unresolved significance uncertainty as requiring a marketing submission — this is not a direct regulatory requirement but a risk-based escalation. Resolve the uncertainty through evidence, expert review, or FDA Pre-Submission before treating the pathway as final.",
  },
  {
    id: 'pma-unresolved-safety-effectiveness-uncertainty-policy',
    description: 'Unresolved PMA safety/effectiveness uncertainty triggers the internal conservative-policy warning.',
    when: all(eq('isPMA', true), eq('pmaSafetyEffectivenessUncertain', true)),
    message:
      "The PMA safety/effectiveness field was answered 'Uncertain.' ChangePath applies an internal conservative policy that treats unresolved PMA uncertainty as requiring a supplement — not a direct regulatory mandate. Resolve the uncertainty before treating the pathway as final.",
  },
  {
    id: 'pma-labeling-change-with-cpma1-no',
    description: 'Labeling changes for PMA devices should be reconciled against a No safety/effectiveness answer.',
    when: all(eq('isPMA', true), eq('pmaLabelingChange', true), eq('pmaSafetyEffectivenessNo', true)),
    message:
      'A PMA labeling change was reported while safety/effectiveness impact was marked NO. Confirm the labeling change is purely editorial or otherwise does not affect safety or effectiveness; otherwise a PMA supplement may still be required under 21 CFR 814.39(a).',
  },
  {
    id: 'pma-manufacturing-change-with-cpma1-no',
    description:
      'Manufacturing/facility changes for PMA devices should be reconciled against a No safety/effectiveness answer.',
    when: all(eq('isPMA', true), eq('pmaManufacturingChange', true), eq('pmaSafetyEffectivenessNo', true)),
    message:
      'A PMA manufacturing or facility change was reported while safety/effectiveness impact was marked NO. Confirm the change is periodic-reportable under 21 CFR 814.39(b) or eligible for a 30-day notice under 21 CFR 814.39(f); otherwise a PMA supplement may still be required.',
  },
  {
    id: 'nonpma-bias-mitigation-c5-conflict',
    description: 'Bias-mitigation changes should not bypass the non-PMA risk-control significance screen.',
    when: all(eq('isNonPMA', true), eq('biasMitigationChanged', true), eq('c5No', true)),
    message:
      'A bias mitigation strategy was changed or removed, but the risk-control significance field (C5) was marked NO. If the mitigation functions as a safety or performance control, reassess C5.',
  },
  {
    id: 'pma-bias-mitigation-cpma1-conflict',
    description: 'Bias-mitigation changes for PMA devices should not bypass the safety/effectiveness screen.',
    when: all(eq('isPMA', true), eq('biasMitigationChanged', true), eq('pmaSafetyEffectivenessNo', true)),
    message:
      'A bias mitigation strategy was changed or removed, but the PMA safety/effectiveness field (C_PMA1) was marked NO. If the mitigation affects safety, effectiveness, or clinically relevant performance across populations, reassess C_PMA1.',
  },
];

const pathwayRules: DeclarativeRule<DeterminationFacts, PathwayValue>[] = [
  {
    id: 'pma-intended-use-change-baseline-incomplete',
    description:
      'A PMA intended-use change cannot map to a supplement pathway until the authorized baseline is complete.',
    when: all(eq('isPMA', true), eq('isIntendedUseChange', true), eq('baselineIncomplete', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'pma-intended-use-change',
    description: 'A PMA intended-use change supports PMA Supplement Required.',
    when: all(eq('isPMA', true), eq('isIntendedUseChange', true)),
    outcome: Pathway.PMASupplementRequired,
  },
  {
    id: 'pma-intended-use-uncertain',
    description: 'A PMA case with unresolved intended-use impact remains incomplete.',
    when: all(eq('isPMA', true), eq('isIntendedUseUncertain', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'pma-baseline-incomplete',
    description: 'A PMA case with incomplete authorized-baseline fields remains incomplete.',
    when: all(eq('isPMA', true), eq('baselineIncomplete', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'pma-safety-effectiveness-field-incomplete',
    description: 'A PMA case without the core safety/effectiveness answer remains incomplete.',
    when: all(eq('isPMA', true), eq('pmaIncomplete', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'pma-authorized-pccp-verified',
    description:
      'A PMA supplement-triggering change can be implemented under an authorized PCCP when scope verification is complete.',
    when: all(eq('isPMA', true), eq('hasPCCP', true), eq('pccpScopeVerified', true), eq('pmaRequiresSupplement', true)),
    outcome: Pathway.ImplementPCCP,
  },
  {
    id: 'pma-authorized-pccp-incomplete',
    description: 'A PMA supplement-triggering change with partial PCCP scope review remains incomplete.',
    when: all(eq('isPMA', true), eq('hasPCCP', true), eq('pccpIncomplete', true), eq('pmaRequiresSupplement', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'pma-supplement-required',
    description:
      'A PMA change where the record indicates or does not rule out a safety/effectiveness impact supports PMA Supplement Required. Note: treating C_PMA1 = Uncertain as requiring a supplement is an internal conservative policy, not a direct regulatory mandate.',
    when: all(eq('isPMA', true), eq('pmaRequiresSupplement', true)),
    outcome: Pathway.PMASupplementRequired,
  },
  {
    id: 'pma-annual-report',
    description: 'A fully evaluated non-supplement PMA change remains on the annual-report / Letter-to-File path.',
    when: eq('isPMA', true),
    outcome: Pathway.PMAAnnualReport,
  },
  {
    id: 'nonpma-intended-use-change-baseline-incomplete',
    description:
      'A non-PMA intended-use change cannot map to a new submission pathway until the authorized baseline is complete.',
    when: all(eq('isNonPMA', true), eq('isIntendedUseChange', true), eq('baselineIncomplete', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'nonpma-intended-use-change',
    description: 'A non-PMA intended-use change supports New Submission Required.',
    when: all(eq('isNonPMA', true), eq('isIntendedUseChange', true)),
    outcome: Pathway.NewSubmission,
  },
  {
    id: 'nonpma-intended-use-uncertain',
    description: 'A non-PMA case with unresolved intended-use impact remains incomplete.',
    when: all(eq('isNonPMA', true), eq('isIntendedUseUncertain', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'nonpma-baseline-incomplete',
    description: 'A non-PMA case with incomplete authorized-baseline fields remains incomplete.',
    when: all(eq('isNonPMA', true), eq('baselineIncomplete', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'nonpma-denovo-fit-failed',
    description:
      'A failed De Novo device-type fit (the modified device no longer fits the authorized device type or special controls) supports New Submission. This overrides the significance assessment because the device may require reclassification. Consider a Pre-Submission (Q-Sub) if the fit boundary is ambiguous.',
    when: all(eq('isNonPMA', true), eq('deNovoDeviceTypeFitFailed', true)),
    outcome: Pathway.NewSubmission,
  },
  {
    id: 'nonpma-cybersecurity-exemption',
    description:
      'A change assessed as cybersecurity-only (C1 = Yes, no intended-use change) supports a Letter to File pathway, contingent on affirmative demonstration that the change has zero functional or clinical-performance impact.',
    when: all(eq('isNonPMA', true), eq('isCyberOnly', true)),
    outcome: Pathway.LetterToFile,
  },
  {
    id: 'nonpma-restore-to-spec-exemption',
    description:
      'A change assessed as restoring to a known, documented, previously authorized specification (C2 = Yes) supports a Letter to File pathway, contingent on evidence that the target state matches the previously authorized configuration.',
    when: all(eq('isNonPMA', true), eq('isBugFix', true)),
    outcome: Pathway.LetterToFile,
  },
  {
    id: 'nonpma-significance-incomplete',
    description: 'An unresolved non-PMA significance branch remains incomplete.',
    when: all(eq('isNonPMA', true), eq('significanceIncomplete', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'nonpma-significant-authorized-pccp-verified',
    description:
      'A significant non-PMA change can be implemented under an authorized PCCP when scope verification is complete.',
    when: all(eq('isNonPMA', true), eq('isSignificant', true), eq('hasPCCP', true), eq('pccpScopeVerified', true)),
    outcome: Pathway.ImplementPCCP,
  },
  {
    id: 'nonpma-significant-authorized-pccp-incomplete',
    description: 'A significant non-PMA change with partial PCCP scope review remains incomplete.',
    when: all(eq('isNonPMA', true), eq('isSignificant', true), eq('hasPCCP', true), eq('pccpIncomplete', true)),
    outcome: Pathway.AssessmentIncomplete,
  },
  {
    id: 'nonpma-significant-new-submission',
    description: 'A significant non-PMA change without an authorized PCCP pathway supports New Submission Required.',
    when: all(eq('isNonPMA', true), eq('isSignificant', true)),
    outcome: Pathway.NewSubmission,
  },
  {
    id: 'nonpma-all-significance-no',
    description: 'A fully evaluated non-significant non-PMA change supports Letter to File.',
    when: all(eq('isNonPMA', true), eq('allSignificanceNo', true)),
    outcome: Pathway.LetterToFile,
  },
  // ⚠ FALLBACK — must remain the last rule in this array.
  // `all()` matches unconditionally, so any rule added after this one is unreachable.
  {
    id: 'fallback-assessment-incomplete',
    description: 'Fallback pathway when no other declarative rule is satisfied.',
    when: all(),
    outcome: Pathway.AssessmentIncomplete,
  },
];

interface PCCPRecommendationContext {
  hasPCCP: boolean;
  isDocOnly: boolean;
  isPCCPImpl: boolean;
  isIncomplete: boolean;
  isNewSub: boolean;
}

const pccpRecommendationRules: DeclarativeRule<PCCPRecommendationContext, PCCPRecommendation | null>[] = [
  {
    id: 'suppress-pccp-recommendation',
    description: 'Do not recommend PCCP when one already exists or the current pathway is not a new-submission path.',
    when: anyOf(
      eq('hasPCCP', true),
      eq('isDocOnly', true),
      eq('isPCCPImpl', true),
      eq('isIncomplete', true),
      eq('isNewSub', false),
    ),
    outcome: null,
  },
  {
    id: 'recommend-pccp-for-next-submission',
    description:
      'Recommend evaluating PCCP in the upcoming submission when no PCCP is authorized and the case already maps to a new submission.',
    when: all(),
    outcome: { shouldRecommend: true },
  },
];

export const computeDetermination = (ans: Answers): DeterminationResult => {
  // Step 1: Derive a stable set of normalized facts from raw answers.
  const facts = buildDeterminationFacts(ans);

  // Step 2: Evaluate declarative consistency-warning rules.
  const matchedConsistencyRules = collectTriggeredRules(facts, consistencyIssueRules);
  const consistencyIssues = matchedConsistencyRules.map((rule) => rule.message);

  // Step 3: Evaluate ordered declarative pathway rules.
  const matchedPathwayRule = selectFirstMatchingRule(facts, pathwayRules);
  const pathway = matchedPathwayRule.outcome;

  const isLetterToFile = pathway === Pathway.LetterToFile;
  const isPMAAnnualReport = pathway === Pathway.PMAAnnualReport;
  const isDocOnly = isLetterToFile || isPMAAnnualReport;
  const isPCCPImpl = pathway === Pathway.ImplementPCCP;
  const isNewSub = pathway === Pathway.NewSubmission || pathway === Pathway.PMASupplementRequired;
  const isIncomplete = pathway === Pathway.AssessmentIncomplete;

  // Step 4: Apply declarative recommendation rules that depend on the final pathway.
  const recommendationContext: PCCPRecommendationContext = {
    hasPCCP: facts.hasPCCP,
    isDocOnly,
    isPCCPImpl,
    isIncomplete,
    isNewSub,
  };
  const matchedRecommendationRule = selectFirstMatchingRule(recommendationContext, pccpRecommendationRules);

  return {
    pathway,
    isDocOnly,
    isLetterToFile,
    isPMAAnnualReport,
    isPCCPImpl,
    isNewSub,
    isIncomplete,
    isIntendedUseChange: facts.isIntendedUseChange,
    isIntendedUseUncertain: facts.isIntendedUseUncertain,
    isCyberOnly: facts.isCyberOnly,
    isBugFix: facts.isBugFix,
    isSignificant: facts.isSignificant,
    baseSignificant: facts.baseSignificant,
    allSignificanceNo: facts.allSignificanceNo,
    significanceIncomplete: facts.significanceIncomplete,
    hasUncertainSignificance: facts.hasUncertainSignificance,
    cumulativeEscalation: facts.cumulativeEscalation,
    seNotSupportable: facts.seNotSupportable,
    seUncertain: facts.seUncertain,
    genAIHighImpactChange: facts.genAIHighImpactChange,
    consistencyIssues,
    deNovoDeviceTypeFitFailed: facts.deNovoDeviceTypeFitFailed,
    baselineIncomplete: facts.baselineIncomplete,
    pmaRequiresSupplement: facts.pmaRequiresSupplement,
    pmaIncomplete: facts.pmaIncomplete,
    cumulativeDriftUnresolved: facts.cumulativeDriftUnresolved,
    pccpScopeVerified: facts.pccpScopeVerified,
    pccpScopeFailed: facts.pccpScopeFailed,
    pccpIncomplete: facts.pccpIncomplete,
    pccpRecommendation: matchedRecommendationRule.outcome,
    decisionTrace: {
      pathwayRule: {
        id: matchedPathwayRule.id,
        description: matchedPathwayRule.description,
      },
      consistencyRules: matchedConsistencyRules.map((rule) => ({
        id: rule.id,
        description: rule.description,
      })),
      pccpRecommendationRule: {
        id: matchedRecommendationRule.id,
        description: matchedRecommendationRule.description,
      },
    },
  };
};
