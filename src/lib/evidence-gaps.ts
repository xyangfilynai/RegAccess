/**
 * Evidence-gap computation engine.
 * Produces a structured checklist of what's missing before an assessment can be relied on.
 */

import type { Answers } from './assessment-engine';
import { Answer, AuthPathway } from './assessment-engine';

export type GapSeverity = 'critical' | 'important' | 'advisory';

export type SourceClass =
  | 'Regulation'
  | 'Final guidance'
  | 'Draft guidance'
  | 'Internal conservative policy'
  | 'Best practice';

export interface EvidenceGap {
  id: string;
  category: string;
  description: string;
  severity: GapSeverity;
  sourceClass: SourceClass;
  source: string;
  remediation: string;
}

export function computeEvidenceGaps(answers: Answers, determination: any): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;

  // --- Baseline / Device Profile gaps ---

  if (!answers.A1) {
    gaps.push({
      id: 'GAP-A1',
      category: 'Device Profile',
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
      category: 'Device Profile',
      description: 'Authorized baseline incomplete — missing authorization identifier, baseline version, or authorized IFU statement',
      severity: 'critical',
      sourceClass: 'Final guidance',
      source: 'FDA-SW-510K-2017; FDA-PCCP-2025 §V',
      remediation: 'Provide the authorization number, cleared/approved version identifier, and the authorized Indications for Use / IFU statement. Without these, the assessment cannot establish what the device is being compared against.',
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
      remediation: 'Compare the clearance letter and IFU statement word-by-word against the post-change device. If unresolvable internally, file a Pre-Submission (Q-Sub) with FDA.',
    });
  }

  if (!answers.B3 && answers.B1) {
    gaps.push({
      id: 'GAP-IFU-MISSING',
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
    const hasYesOrUncertain = sigAnswers.some(a => a === Answer.Yes || a === Answer.Uncertain);
    const allAnswered = sigAnswers.every(a => [Answer.Yes, Answer.No, Answer.Uncertain].includes(a));

    if (!allAnswered && !determination.isCyberOnly && !determination.isBugFix) {
      gaps.push({
        id: 'GAP-SIG-INCOMPLETE',
        category: 'Regulatory Significance',
        description: 'Not all significance questions have been answered',
        severity: 'critical',
        sourceClass: 'Final guidance',
        source: 'FDA-SW-510K-2017 Q3-Q4',
        remediation: 'Complete all four significance questions (C3–C6) to produce a reliable pathway determination.',
      });
    }

    if (hasYesOrUncertain && answers.C6 !== Answer.No) {
      gaps.push({
        id: 'GAP-VALIDATION',
        category: 'Validation',
        description: 'Validation scope may be incomplete — clinical performance impact not ruled out',
        severity: 'important',
        sourceClass: 'Final guidance',
        source: 'FDA-SW-510K-2017 Q4; FDA-PCCP-2025 §VII',
        remediation: 'Run pre/post performance comparison against predefined acceptance criteria. Validate subgroup performance independently.',
      });
    }
  }

  // --- Subgroup / Equity gaps ---

  if (answers.E1 === Answer.Yes || answers.E3 === Answer.Yes) {
    gaps.push({
      id: 'GAP-SUBGROUP',
      category: 'Bias & Equity',
      description: 'Subgroup/population performance evidence may be missing — equity impact indicated',
      severity: 'important',
      sourceClass: 'Draft guidance',
      source: 'FDA-LIFECYCLE-2025 §IV.B',
      remediation: 'Provide subgroup analysis covering affected demographic groups. Document any performance disparities and mitigation measures.',
    });
  }

  if (answers.E2 === Answer.Yes || answers.E2 === Answer.Uncertain) {
    gaps.push({
      id: 'GAP-TRAINING-REPR',
      category: 'Bias & Equity',
      description: 'Training data representativeness concern — may not adequately represent affected populations',
      severity: 'important',
      sourceClass: 'Draft guidance',
      source: 'FDA-LIFECYCLE-2025 §IV.B',
      remediation: 'Assess training data demographic composition against the authorized intended population. Document any gaps and compensating measures.',
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
      remediation: 'Review the running change log. Calculate cumulative impact across all dimensions. Compare against the last authorized baseline.',
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
      remediation: 'Compare the modified device against the predicate device. If SE cannot be demonstrated, a new predicate or De Novo pathway may be needed.',
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
      remediation: 'Complete PCCP scope verification questions (P1–P5). Verify change type, boundaries, validation protocol, monitoring, and cumulative impact.',
    });
  }

  if (determination.pccpScopeFailed) {
    gaps.push({
      id: 'GAP-PCCP-FAILED',
      category: 'PCCP',
      description: 'PCCP scope verification failed — change cannot be implemented under PCCP',
      severity: 'important',
      sourceClass: 'Final guidance',
      source: 'FDA-PCCP-2025 §V',
      remediation: 'Identify which PCCP gate(s) failed. Consider expanding PCCP scope via new submission or proceeding through standard submission pathway.',
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
      remediation: 'Compare modified device against the De Novo classification order and each special control. File a Pre-Submission with FDA if uncertainty persists.',
    });
  }

  // --- GenAI-specific gaps ---

  if (determination.genAIHighImpactChange) {
    if (answers.D5 !== Answer.Yes) {
      gaps.push({
        id: 'GAP-GENAI-HALLUCINATION',
        category: 'GenAI',
        description: 'Hallucination testing not confirmed for GenAI high-impact change',
        severity: 'important',
        sourceClass: 'Draft guidance',
        source: 'FDA-LIFECYCLE-2025 §V.D',
        remediation: 'Perform hallucination/factual accuracy testing appropriate for the GenAI component. Document test methodology and results.',
      });
    }

    if (answers.D4 === Answer.Yes && answers.C5 !== Answer.Yes) {
      gaps.push({
        id: 'GAP-GENAI-GUARDRAIL',
        category: 'GenAI',
        description: 'Guardrail/safety filter change detected but risk control impact may not be fully assessed',
        severity: 'important',
        sourceClass: 'Final guidance',
        source: 'FDA-SW-510K-2017 Q3; ISO 14971:2019',
        remediation: 'Review the risk management file for impacts of the guardrail change on all identified hazardous situations.',
      });
    }
  }

  // --- Cybersecurity gaps ---

  if (answers.C1 === Answer.Uncertain) {
    gaps.push({
      id: 'GAP-CYBER-EXEMPT',
      category: 'Cybersecurity',
      description: 'Cybersecurity applicability not documented — exemption eligibility uncertain',
      severity: 'important',
      sourceClass: 'Final guidance',
      source: 'FDA-SW-510K-2017 Q1; FDA-CYBER-2026',
      remediation: 'Perform analysis demonstrating the change is solely cybersecurity-related with zero functional impact, or confirm it is not eligible for exemption.',
    });
  }

  // --- PMA-specific gaps ---

  if (isPMA && determination.pmaIncomplete) {
    gaps.push({
      id: 'GAP-PMA-INCOMPLETE',
      category: 'PMA Assessment',
      description: 'PMA safety/effectiveness assessment incomplete',
      severity: 'critical',
      sourceClass: 'Regulation',
      source: '21 CFR 814.39',
      remediation: 'Complete the PMA-specific questions (C_PMA1–C_PMA3) to determine whether a supplement is required.',
    });
  }

  // --- Uncertain significance (conservative routing) ---

  if (determination.hasUncertainSignificance) {
    gaps.push({
      id: 'GAP-SIG-UNCERTAIN',
      category: 'Regulatory Significance',
      description: 'One or more significance questions answered "Uncertain" — conservatively treated as significant',
      severity: 'important',
      sourceClass: 'Internal conservative policy',
      source: 'FDA-SW-510K-2017 Q3-Q4',
      remediation: 'Gather additional evidence or consult with RA/clinical experts to convert "Uncertain" responses to definitive "Yes" or "No" answers.',
    });
  }

  return gaps;
}
