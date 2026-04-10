/**
 * Evidence-gap computation engine.
 * Produces a structured checklist of open items before an assessment can be relied on.
 */

import type { Answers, DeterminationResult } from './assessment-engine';
import { Answer, AuthPathway, answerIsOneOf } from './assessment-engine';
import type { SourceClass } from './source-classification';

export type GapSeverity = 'critical' | 'important' | 'advisory';

export interface EvidenceGap {
  id: string;
  category: string;
  description: string;
  severity: GapSeverity;
  sourceClass: SourceClass;
  source: string;
  remediation: string;
}

export function computeEvidenceGaps(answers: Answers, determination: DeterminationResult): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;

  // --- Baseline / Device Profile gaps ---

  if (!answers.A1) {
    gaps.push({
      id: 'GAP-A1',
      category: 'Device profile',
      description: 'Authorization pathway not specified',
      severity: 'critical',
      sourceClass: 'Regulation',
      source: '21 CFR 807.81(a)(3)',
      remediation: 'Specify the authorization pathway (510(k), De Novo, or PMA) before the assessment can proceed.',
    });
  }

  if (!answers.A1b || !answers.A1c || !answers.A1d) {
    gaps.push({
      id: 'GAP-BASELINE',
      category: 'Device profile',
      description:
        'Authorized baseline incomplete — authorization identifier, baseline version, or authorized IFU statement not provided',
      severity: 'critical',
      sourceClass: 'Internal conservative policy',
      source: 'FDA-SW-510K-2017; FDA-PCCP-2025 §V; internal baseline-comparison policy',
      remediation:
        'Provide the authorization number, cleared/approved version identifier, and the authorized Indications for Use / IFU statement. Without these, the assessment cannot establish what the device is being compared against.',
    });
  }

  // --- Intended Use gaps ---

  if (answers.B3 === Answer.Uncertain) {
    gaps.push({
      id: 'GAP-IFU-UNCERTAIN',
      category: 'Intended Use',
      description: 'Intended use impact is uncertain — this is the highest-risk gap in any change assessment',
      severity: 'critical',
      sourceClass: 'Regulation',
      source: '21 CFR 807.81(a)(3); FDA-PCCP-2025 §V',
      remediation:
        'Compare the clearance letter and IFU statement word-by-word against the post-change device. If unresolvable internally, file a Pre-Submission (Q-Sub) with FDA.',
    });
  }

  if (!answers.B3 && answers.B1) {
    gaps.push({
      id: 'GAP-IFU-INCOMPLETE',
      category: 'Intended Use',
      description: 'Intended use impact not assessed',
      severity: 'critical',
      sourceClass: 'Regulation',
      source: '21 CFR 807.81(a)(3)',
      remediation: 'Answer whether the change affects the intended use before proceeding.',
    });
  }

  // --- Validation / Performance gaps ---

  if (answers.B3 === Answer.No && !isPMA) {
    const sigAnswers = [answers.C3, answers.C4, answers.C5, answers.C6];
    const hasYesOrUncertain = sigAnswers.some((a) => a === Answer.Yes || a === Answer.Uncertain);
    // C3-C6 have cascading skip logic: if an earlier field is Yes, later ones are skipped.
    // Only check "all answered" for fields that are actually visible (not skipped by cascade).
    const yesNoUncertain = [Answer.Yes, Answer.No, Answer.Uncertain] as const;
    const c3Answered = answerIsOneOf(answers.C3, yesNoUncertain);
    const c4Visible = answers.C3 !== Answer.Yes;
    const c5Visible = c4Visible && answers.C4 !== Answer.Yes;
    const c6Visible = c5Visible && answers.C5 !== Answer.Yes;
    const allAnswered =
      c3Answered &&
      (!c4Visible || answerIsOneOf(answers.C4, yesNoUncertain)) &&
      (!c5Visible || answerIsOneOf(answers.C5, yesNoUncertain)) &&
      (!c6Visible || answerIsOneOf(answers.C6, yesNoUncertain));

    if (!allAnswered && !determination.isCyberOnly && !determination.isBugFix) {
      gaps.push({
        id: 'GAP-SIG-INCOMPLETE',
        category: 'Regulatory Significance',
        description: 'Not all visible significance fields have been answered',
        severity: 'critical',
        sourceClass: 'Final guidance',
        source: 'FDA-SW-510K-2017 Q3-Q4',
        remediation:
          'Complete the remaining visible significance fields in the C3–C6 sequence to produce a reliable pathway determination.',
      });
    }

    if (hasYesOrUncertain && answers.C6 !== Answer.No) {
      gaps.push({
        id: 'GAP-VALIDATION',
        category: 'Validation',
        description:
          'Clinical performance impact has not been answered No — pre/post validation evidence is needed to support the significance assessment',
        severity: 'important',
        sourceClass: 'Final guidance',
        source: 'FDA-SW-510K-2017 Q4; FDA-PCCP-2025 §VII',
        remediation:
          'Run a pre/post performance comparison against predefined acceptance criteria at the authorized operating point. Validate subgroup performance independently for each affected demographic or clinical subgroup.',
      });
    }
  }

  // --- Subgroup / Equity gaps ---

  if (answers.E1 === Answer.No || answers.E1 === Answer.Uncertain) {
    gaps.push({
      id: 'GAP-TRAINING-REPR',
      category: 'Bias and equity',
      description: 'Training, validation, or test data may not adequately represent the intended patient population',
      severity: 'important',
      sourceClass: 'Draft guidance',
      source: 'FDA-LIFECYCLE-2025 §IV.B',
      remediation:
        'Assess dataset representativeness against the authorized intended population. Document demographic composition, coverage gaps, and any compensating controls or mitigation plan.',
    });
  }

  if (answers.E2 === Answer.No) {
    gaps.push({
      id: 'GAP-SUBGROUP',
      category: 'Bias and equity',
      description: 'Subgroup performance evidence is not provided or is incomplete for relevant demographic groups',
      severity: 'important',
      sourceClass: 'Draft guidance',
      source: 'FDA-LIFECYCLE-2025 §IV.B',
      remediation:
        'Provide subgroup analysis covering affected demographic groups. Document any performance disparities and mitigation measures.',
    });
  }

  if (answers.E3 === Answer.Yes || answers.E3 === Answer.Uncertain) {
    gaps.push({
      id: 'GAP-POPULATION-SCOPE',
      category: 'Bias and equity',
      description: 'New demographic populations may have been introduced relative to the authorized baseline',
      severity: 'important',
      sourceClass: 'Regulation',
      source: '21 CFR 807.81(a)(3); FDA-LIFECYCLE-2025 §IV.B',
      remediation:
        'Confirm whether the newly introduced population remains within the authorized intended population and update subgroup performance evidence accordingly.',
    });
  }

  if (answers.E4 === Answer.No) {
    gaps.push({
      id: 'GAP-BIAS-ASSESSMENT-UPDATE',
      category: 'Bias and equity',
      description: 'Bias assessment from the original submission has not been updated for the current change',
      severity: 'important',
      sourceClass: 'Draft guidance',
      source: 'FDA-LIFECYCLE-2025 §IV.B',
      remediation:
        'Update the bias and equity assessment to reflect the modified model, data, workflow, and affected populations.',
    });
  }

  if (answers.E5 === Answer.Yes) {
    gaps.push({
      id: 'GAP-BIAS-MITIGATION',
      category: 'Bias and equity',
      description: 'A bias mitigation strategy was changed, weakened, or removed',
      severity: 'important',
      sourceClass: 'Draft guidance',
      source: 'FDA-LIFECYCLE-2025 §IV.B; ISO 14971:2019',
      remediation:
        'Document the specific mitigation change, assess whether the modified mitigation remains effective, determine whether it functions as a risk control under the current risk management file, and provide additional validation or risk analysis as needed.',
    });
  } else if (answers.E5 === Answer.Uncertain) {
    gaps.push({
      id: 'GAP-BIAS-MITIGATION',
      category: 'Bias and equity',
      description: 'It is uncertain whether the bias mitigation strategy was changed, weakened, or removed',
      severity: 'important',
      sourceClass: 'Draft guidance',
      source: 'FDA-LIFECYCLE-2025 §IV.B; ISO 14971:2019',
      remediation:
        'Determine whether any bias mitigation strategy was affected by this change. If so, review whether the modified mitigation remains effective and whether it functions as a risk control.',
    });
  }

  // --- Cumulative Impact gaps ---

  if (determination.cumulativeEscalation) {
    gaps.push({
      id: 'GAP-CUMULATIVE',
      category: 'Cumulative Impact',
      description: 'Cumulative impact/drift not fully assessed — device may have drifted from cleared specification',
      severity: 'important',
      sourceClass: 'Final guidance',
      source: 'FDA-PCCP-2025 §VIII; FDA-SW-510K-2017',
      remediation:
        'Review the running change log. Calculate cumulative impact across all dimensions. Compare against the last authorized baseline.',
    });
  }

  if (determination.seUncertain) {
    gaps.push({
      id: 'GAP-SE-UNCERTAIN',
      category: 'Cumulative Impact',
      description: 'Substantial equivalence supportability is uncertain',
      severity: 'critical',
      sourceClass: 'Regulation',
      source: '21 CFR 807.87; 21 CFR 807.92',
      remediation:
        'Compare the modified device against the predicate device. If SE cannot be demonstrated, a new predicate or De Novo pathway may be needed.',
    });
  }

  // --- PCCP gaps ---

  if (determination.pccpIncomplete) {
    gaps.push({
      id: 'GAP-PCCP-SCOPE',
      category: 'PCCP',
      description: 'PCCP fit not demonstrated — scope verification is incomplete',
      severity: 'critical',
      sourceClass: 'Final guidance',
      source: 'FDA-PCCP-2025 §V–VI',
      remediation:
        'Complete PCCP scope verification fields (P1–P5). Verify change type, boundaries, validation protocol, monitoring, and cumulative impact.',
    });
  }

  if (determination.pccpScopeFailed) {
    gaps.push({
      id: 'GAP-PCCP-FAILED',
      category: 'PCCP',
      description:
        'PCCP scope verification failed — change does not fit within the authorized PCCP boundaries on the current record',
      severity: 'important',
      sourceClass: 'Final guidance',
      source: 'FDA-PCCP-2025 §V',
      remediation:
        'Identify which PCCP gate(s) failed and document the basis. Options include: (1) expanding PCCP scope via a new marketing submission, (2) proceeding through the standard submission pathway, or (3) filing a Pre-Submission (Q-Sub) if the scope boundary is ambiguous.',
    });
  }

  // --- De Novo specific gaps ---

  if (isDeNovo && (answers.C0_DN1 === Answer.Uncertain || answers.C0_DN2 === Answer.Uncertain)) {
    gaps.push({
      id: 'GAP-DENOVO-FIT',
      category: 'De Novo Classification',
      description: 'De Novo device-type fit uncertain — modified device may not fit within classification',
      severity: 'critical',
      sourceClass: 'Regulation',
      source: '21 CFR Part 860 Subpart D',
      remediation:
        'Compare modified device against the De Novo classification order and each special control. File a Pre-Submission with FDA if uncertainty persists.',
    });
  }

  // --- GenAI-specific gaps ---

  if (determination.genAIHighImpactChange) {
    if (answers.D5 !== Answer.Yes) {
      gaps.push({
        id: 'GAP-GENAI-HALLUCINATION',
        category: 'GenAI',
        description: 'Factual-accuracy / hallucination testing not confirmed for GenAI high-impact change',
        severity: 'important',
        sourceClass: 'Internal conservative policy',
        source:
          'FDA-LIFECYCLE-2025 (draft, broader AI safety recommendations); internal GenAI safety evaluation policy',
        remediation:
          'Perform factual-accuracy, unsupported-output, or other unsafe-output testing appropriate for the GenAI component. Document test methodology and results.',
      });
    }

    if (answers.D4 === Answer.Yes) {
      // For PMA devices, check C_PMA1 (safety/effectiveness) instead of C5 (risk control — not shown for PMA)
      const guardrailImpactNotAssessed = isPMA ? answers.C_PMA1 !== Answer.Yes : answers.C5 !== Answer.Yes;
      if (guardrailImpactNotAssessed) {
        gaps.push({
          id: 'GAP-GENAI-GUARDRAIL',
          category: 'GenAI',
          description: 'Guardrail/safety filter change detected but risk control impact may not be fully assessed',
          severity: 'important',
          sourceClass: 'Final guidance',
          source: isPMA ? '21 CFR 814.39; ISO 14971:2019' : 'FDA-SW-510K-2017 Q3; ISO 14971:2019',
          remediation:
            'Review the risk management file for impacts of the guardrail change on all identified hazardous situations.',
        });
      }
    }
  }

  // --- Cybersecurity gaps ---

  // C1 cybersecurity exemption is a 510(k)/De Novo concept — not applicable to PMA devices
  if (!isPMA && answers.C1 === Answer.Uncertain) {
    gaps.push({
      id: 'GAP-CYBER-EXEMPT',
      category: 'Cybersecurity',
      description: 'Cybersecurity applicability not documented — exemption eligibility uncertain',
      severity: 'important',
      sourceClass: 'Final guidance',
      source: 'FDA-SW-510K-2017 Q1; FDA-CYBER-2026',
      remediation:
        'Perform analysis demonstrating the change is solely cybersecurity-related with zero functional impact, or confirm it is not eligible for exemption.',
    });
  }

  // --- PMA-specific gaps ---

  if (isPMA && determination.pmaIncomplete) {
    gaps.push({
      id: 'GAP-PMA-INCOMPLETE',
      category: 'PMA assessment',
      description: 'PMA safety/effectiveness assessment incomplete',
      severity: 'critical',
      sourceClass: 'Regulation',
      source: '21 CFR 814.39',
      remediation:
        'Complete the PMA-specific fields (C_PMA1–C_PMA3) to determine whether a supplement is required. Note: for PMA devices, the threshold is whether the change "could affect" safety or effectiveness — a lower bar than the 510(k) significance framework.',
    });
  }

  // --- Uncertain significance (conservative pathway policy) ---

  if (determination.hasUncertainSignificance) {
    gaps.push({
      id: 'GAP-SIG-UNCERTAIN',
      category: 'Regulatory Significance',
      description: 'One or more significance fields answered "Uncertain" — conservatively treated as significant',
      severity: 'important',
      sourceClass: 'Internal conservative policy',
      source: 'FDA-SW-510K-2017 Q3-Q4',
      remediation:
        'Gather additional evidence or consult with RA/clinical experts to convert "Uncertain" responses to definitive "Yes" or "No" answers.',
    });
  }

  return gaps;
}
