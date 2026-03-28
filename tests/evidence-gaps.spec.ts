/**
 * Comprehensive tests for computeEvidenceGaps().
 * Covers every gap ID and branch in evidence-gaps.ts.
 */

import { describe, expect, it } from 'vitest';
import { Answer, computeDetermination, type Answers } from '../src/lib/assessment-engine';
import { computeEvidenceGaps, type EvidenceGap } from '../src/lib/evidence-gaps';
import { base510k, baseDeNovo, basePMA } from './helpers';

/** Helper: compute gaps from answers using the real determination engine. */
const gapsFor = (answers: Answers): EvidenceGap[] => computeEvidenceGaps(answers, computeDetermination(answers));

/** Helper: get gap IDs from an answer set. */
const gapIds = (answers: Answers): string[] => gapsFor(answers).map((g) => g.id);

/** Helper: build a minimal determination stub with all flags off. */
const baseDetermination = (overrides: Partial<ReturnType<typeof computeDetermination>> = {}) => ({
  pathway: 'Letter to File' as const,
  isDocOnly: false,
  isLetterToFile: true,
  isPMAAnnualReport: false,
  isPCCPImpl: false,
  isNewSub: false,
  isIncomplete: false,
  isIntendedUseChange: false,
  isIntendedUseUncertain: false,
  isCyberOnly: false,
  isBugFix: false,
  isSignificant: false,
  baseSignificant: false,
  allSignificanceNo: true,
  significanceIncomplete: false,
  hasUncertainSignificance: false,
  cumulativeEscalation: false,
  seNotSupportable: false,
  seUncertain: false,
  genAIHighImpactChange: false,
  consistencyIssues: [],
  deNovoDeviceTypeFitFailed: false,
  baselineIncomplete: false,
  pmaRequiresSupplement: false,
  pmaIncomplete: false,
  cumulativeDriftUnresolved: false,
  pccpScopeVerified: false,
  pccpScopeFailed: false,
  pccpIncomplete: false,
  pccpRecommendation: null,
  decisionTrace: {
    pathwayRule: { id: 'stub', description: 'stub' },
    consistencyRules: [],
    pccpRecommendationRule: { id: 'stub', description: 'stub' },
  },
  ...overrides,
});

describe('computeEvidenceGaps', () => {
  // --- Device profile gaps ---

  describe('GAP-A1 — authorization pathway not specified', () => {
    it('fires when A1 is missing', () => {
      const gaps = computeEvidenceGaps({}, baseDetermination());
      expect(gaps.some((g) => g.id === 'GAP-A1')).toBe(true);
    });

    it('does not fire when A1 is present', () => {
      expect(gapIds(base510k())).not.toContain('GAP-A1');
    });
  });

  describe('GAP-BASELINE — incomplete device profile', () => {
    it('fires when A1b is missing', () => {
      const ids = gapIds(base510k({ A1b: undefined }));
      expect(ids).toContain('GAP-BASELINE');
    });

    it('fires when A1c is missing', () => {
      const ids = gapIds(base510k({ A1c: undefined }));
      expect(ids).toContain('GAP-BASELINE');
    });

    it('fires when A1d is missing', () => {
      const ids = gapIds(base510k({ A1d: undefined }));
      expect(ids).toContain('GAP-BASELINE');
    });

    it('does not fire when all baseline fields present', () => {
      expect(gapIds(base510k())).not.toContain('GAP-BASELINE');
    });
  });

  // --- Intended use gaps ---

  describe('GAP-IFU-UNCERTAIN', () => {
    it('fires when B3 is Uncertain', () => {
      expect(gapIds(base510k({ B3: Answer.Uncertain }))).toContain('GAP-IFU-UNCERTAIN');
    });

    it('does not fire when B3 is Yes or No', () => {
      expect(gapIds(base510k({ B3: Answer.Yes }))).not.toContain('GAP-IFU-UNCERTAIN');
      expect(gapIds(base510k({ B3: Answer.No }))).not.toContain('GAP-IFU-UNCERTAIN');
    });
  });

  describe('GAP-IFU-INCOMPLETE', () => {
    it('fires when B3 is empty but B1 is answered', () => {
      const answers = base510k({ B3: undefined, B1: 'Some change description' });
      expect(gapIds(answers)).toContain('GAP-IFU-INCOMPLETE');
    });

    it('does not fire when B3 is answered', () => {
      expect(gapIds(base510k())).not.toContain('GAP-IFU-INCOMPLETE');
    });

    it('does not fire when both B3 and B1 are empty', () => {
      const answers = base510k({ B3: undefined, B1: undefined });
      expect(gapIds(answers)).not.toContain('GAP-IFU-INCOMPLETE');
    });
  });

  // --- Validation / significance gaps ---

  describe('GAP-SIG-INCOMPLETE', () => {
    it('fires when significance fields are incomplete (B3=No, non-cyber, non-bugfix)', () => {
      const answers = base510k({ C3: undefined, C4: undefined, C5: undefined, C6: undefined });
      expect(gapIds(answers)).toContain('GAP-SIG-INCOMPLETE');
    });

    it('does not fire when all significance fields answered', () => {
      expect(gapIds(base510k())).not.toContain('GAP-SIG-INCOMPLETE');
    });

    it('does not fire for cyber-only changes', () => {
      // C1=Yes and C2=No makes it cyber-only
      const answers = base510k({
        C1: Answer.Yes,
        C2: Answer.No,
        C3: undefined,
        C4: undefined,
        C5: undefined,
        C6: undefined,
      });
      const det = computeDetermination(answers);
      expect(det.isCyberOnly).toBe(true);
      expect(computeEvidenceGaps(answers, det).some((g) => g.id === 'GAP-SIG-INCOMPLETE')).toBe(false);
    });

    it('does not fire for bug-fix changes', () => {
      const answers = base510k({
        C2: Answer.Yes,
        C3: undefined,
        C4: undefined,
        C5: undefined,
        C6: undefined,
      });
      const det = computeDetermination(answers);
      expect(det.isBugFix).toBe(true);
      expect(computeEvidenceGaps(answers, det).some((g) => g.id === 'GAP-SIG-INCOMPLETE')).toBe(false);
    });

    it('respects cascading skip logic — C4 skipped when C3=Yes', () => {
      // C3=Yes means C4/C5/C6 are skipped; all effectively answered
      const answers = base510k({ C3: Answer.Yes, C4: undefined, C5: undefined, C6: undefined });
      expect(gapIds(answers)).not.toContain('GAP-SIG-INCOMPLETE');
    });
  });

  describe('GAP-VALIDATION', () => {
    it('fires when significance has Yes and C6 is not No', () => {
      const answers = base510k({ C3: Answer.Yes, C6: undefined });
      expect(gapIds(answers)).toContain('GAP-VALIDATION');
    });

    it('fires when significance has Uncertain and C6 is not No', () => {
      const answers = base510k({ C3: Answer.Uncertain, C6: undefined });
      expect(gapIds(answers)).toContain('GAP-VALIDATION');
    });

    it('does not fire when C6 is No', () => {
      const answers = base510k({ C3: Answer.Yes, C6: Answer.No });
      expect(gapIds(answers)).not.toContain('GAP-VALIDATION');
    });

    it('does not fire when all significance fields are No', () => {
      expect(gapIds(base510k())).not.toContain('GAP-VALIDATION');
    });
  });

  // --- Bias / equity gaps ---

  describe('GAP-TRAINING-REPR', () => {
    it('fires when E1 is No', () => {
      expect(gapIds(base510k({ E1: Answer.No }))).toContain('GAP-TRAINING-REPR');
    });

    it('fires when E1 is Uncertain', () => {
      expect(gapIds(base510k({ E1: Answer.Uncertain }))).toContain('GAP-TRAINING-REPR');
    });

    it('does not fire when E1 is Yes', () => {
      expect(gapIds(base510k({ E1: Answer.Yes }))).not.toContain('GAP-TRAINING-REPR');
    });
  });

  describe('GAP-SUBGROUP', () => {
    it('fires when E2 is No', () => {
      expect(gapIds(base510k({ E2: Answer.No }))).toContain('GAP-SUBGROUP');
    });

    it('does not fire when E2 is Yes or Uncertain', () => {
      expect(gapIds(base510k({ E2: Answer.Yes }))).not.toContain('GAP-SUBGROUP');
      expect(gapIds(base510k({ E2: Answer.Uncertain }))).not.toContain('GAP-SUBGROUP');
    });
  });

  describe('GAP-POPULATION-SCOPE', () => {
    it('fires when E3 is Yes', () => {
      expect(gapIds(base510k({ E3: Answer.Yes }))).toContain('GAP-POPULATION-SCOPE');
    });

    it('fires when E3 is Uncertain', () => {
      expect(gapIds(base510k({ E3: Answer.Uncertain }))).toContain('GAP-POPULATION-SCOPE');
    });

    it('does not fire when E3 is No', () => {
      expect(gapIds(base510k({ E3: Answer.No }))).not.toContain('GAP-POPULATION-SCOPE');
    });
  });

  describe('GAP-BIAS-ASSESSMENT-UPDATE', () => {
    it('fires when E4 is No', () => {
      expect(gapIds(base510k({ E4: Answer.No }))).toContain('GAP-BIAS-ASSESSMENT-UPDATE');
    });

    it('does not fire when E4 is Yes', () => {
      expect(gapIds(base510k({ E4: Answer.Yes }))).not.toContain('GAP-BIAS-ASSESSMENT-UPDATE');
    });
  });

  describe('GAP-BIAS-MITIGATION', () => {
    it('fires when E5 is Yes', () => {
      expect(gapIds(base510k({ E5: Answer.Yes }))).toContain('GAP-BIAS-MITIGATION');
    });

    it('fires when E5 is Uncertain', () => {
      expect(gapIds(base510k({ E5: Answer.Uncertain }))).toContain('GAP-BIAS-MITIGATION');
    });

    it('does not fire when E5 is No', () => {
      expect(gapIds(base510k({ E5: Answer.No }))).not.toContain('GAP-BIAS-MITIGATION');
    });
  });

  // --- Cumulative impact gaps ---

  describe('GAP-CUMULATIVE', () => {
    it('fires when determination.cumulativeEscalation is true', () => {
      const answers = base510k();
      const det = baseDetermination({ cumulativeEscalation: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-CUMULATIVE')).toBe(true);
    });

    it('does not fire when cumulativeEscalation is false', () => {
      expect(gapIds(base510k())).not.toContain('GAP-CUMULATIVE');
    });
  });

  describe('GAP-SE-UNCERTAIN', () => {
    it('fires when determination.seUncertain is true', () => {
      const answers = base510k();
      const det = baseDetermination({ seUncertain: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-SE-UNCERTAIN')).toBe(true);
    });

    it('does not fire when seUncertain is false', () => {
      expect(gapIds(base510k())).not.toContain('GAP-SE-UNCERTAIN');
    });
  });

  // --- PCCP gaps ---

  describe('GAP-PCCP-SCOPE', () => {
    it('fires when determination.pccpIncomplete is true', () => {
      const answers = base510k();
      const det = baseDetermination({ pccpIncomplete: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-PCCP-SCOPE')).toBe(true);
    });

    it('does not fire when pccpIncomplete is false', () => {
      expect(gapIds(base510k())).not.toContain('GAP-PCCP-SCOPE');
    });
  });

  describe('GAP-PCCP-FAILED', () => {
    it('fires when determination.pccpScopeFailed is true', () => {
      const answers = base510k();
      const det = baseDetermination({ pccpScopeFailed: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-PCCP-FAILED')).toBe(true);
    });

    it('does not fire when pccpScopeFailed is false', () => {
      expect(gapIds(base510k())).not.toContain('GAP-PCCP-FAILED');
    });
  });

  // --- De Novo gaps ---

  describe('GAP-DENOVO-FIT', () => {
    it('fires when De Novo and C0_DN1 is Uncertain', () => {
      expect(gapIds(baseDeNovo({ C0_DN1: Answer.Uncertain }))).toContain('GAP-DENOVO-FIT');
    });

    it('fires when De Novo and C0_DN2 is Uncertain', () => {
      expect(gapIds(baseDeNovo({ C0_DN2: Answer.Uncertain }))).toContain('GAP-DENOVO-FIT');
    });

    it('does not fire for 510(k) even with Uncertain DN fields', () => {
      expect(gapIds(base510k({ C0_DN1: Answer.Uncertain }))).not.toContain('GAP-DENOVO-FIT');
    });

    it('does not fire when both DN fields are Yes/No', () => {
      expect(gapIds(baseDeNovo({ C0_DN1: Answer.Yes, C0_DN2: Answer.No }))).not.toContain('GAP-DENOVO-FIT');
    });
  });

  // --- GenAI gaps ---

  describe('GAP-GENAI-HALLUCINATION', () => {
    it('fires when genAIHighImpactChange=true and D5 is not Yes', () => {
      const answers = base510k({ D5: Answer.No });
      const det = baseDetermination({ genAIHighImpactChange: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-GENAI-HALLUCINATION')).toBe(true);
    });

    it('fires when genAIHighImpactChange=true and D5 is undefined', () => {
      const answers = base510k();
      const det = baseDetermination({ genAIHighImpactChange: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-GENAI-HALLUCINATION')).toBe(true);
    });

    it('does not fire when D5 is Yes', () => {
      const answers = base510k({ D5: Answer.Yes });
      const det = baseDetermination({ genAIHighImpactChange: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-GENAI-HALLUCINATION')).toBe(false);
    });

    it('does not fire when genAIHighImpactChange is false', () => {
      expect(gapIds(base510k({ D5: Answer.No }))).not.toContain('GAP-GENAI-HALLUCINATION');
    });
  });

  describe('GAP-GENAI-GUARDRAIL', () => {
    it('fires for 510(k) when D4=Yes and C5 is not Yes', () => {
      const answers = base510k({ D4: Answer.Yes, C5: Answer.No });
      const det = baseDetermination({ genAIHighImpactChange: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-GENAI-GUARDRAIL')).toBe(true);
    });

    it('does not fire for 510(k) when D4=Yes and C5=Yes', () => {
      const answers = base510k({ D4: Answer.Yes, C5: Answer.Yes });
      const det = baseDetermination({ genAIHighImpactChange: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-GENAI-GUARDRAIL')).toBe(false);
    });

    it('fires for PMA when D4=Yes and C_PMA1 is not Yes', () => {
      const answers = basePMA({ D4: Answer.Yes, C_PMA1: Answer.No });
      const det = baseDetermination({ genAIHighImpactChange: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-GENAI-GUARDRAIL')).toBe(true);
      // Verify PMA-specific source citation
      const gap = gaps.find((g) => g.id === 'GAP-GENAI-GUARDRAIL')!;
      expect(gap.source).toContain('21 CFR 814.39');
    });

    it('does not fire for PMA when D4=Yes and C_PMA1=Yes', () => {
      const answers = basePMA({ D4: Answer.Yes, C_PMA1: Answer.Yes });
      const det = baseDetermination({ genAIHighImpactChange: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-GENAI-GUARDRAIL')).toBe(false);
    });

    it('does not fire when D4 is not Yes', () => {
      const answers = base510k({ D4: Answer.No, C5: Answer.No });
      const det = baseDetermination({ genAIHighImpactChange: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-GENAI-GUARDRAIL')).toBe(false);
    });
  });

  // --- Cybersecurity gaps ---

  describe('GAP-CYBER-EXEMPT', () => {
    it('fires for 510(k) when C1 is Uncertain', () => {
      expect(gapIds(base510k({ C1: Answer.Uncertain }))).toContain('GAP-CYBER-EXEMPT');
    });

    it('fires for De Novo when C1 is Uncertain', () => {
      expect(gapIds(baseDeNovo({ C1: Answer.Uncertain }))).toContain('GAP-CYBER-EXEMPT');
    });

    it('does not fire for PMA even when C1 is Uncertain', () => {
      expect(gapIds(basePMA({ C1: Answer.Uncertain }))).not.toContain('GAP-CYBER-EXEMPT');
    });

    it('does not fire when C1 is Yes or No', () => {
      expect(gapIds(base510k({ C1: Answer.Yes }))).not.toContain('GAP-CYBER-EXEMPT');
      expect(gapIds(base510k({ C1: Answer.No }))).not.toContain('GAP-CYBER-EXEMPT');
    });
  });

  // --- PMA-specific gaps ---

  describe('GAP-PMA-INCOMPLETE', () => {
    it('fires when PMA and pmaIncomplete is true', () => {
      const answers = basePMA();
      const det = baseDetermination({ pmaIncomplete: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-PMA-INCOMPLETE')).toBe(true);
    });

    it('does not fire for 510(k) even when pmaIncomplete is true', () => {
      const answers = base510k();
      const det = baseDetermination({ pmaIncomplete: true });
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-PMA-INCOMPLETE')).toBe(false);
    });

    it('does not fire when pmaIncomplete is false (C_PMA1 answered)', () => {
      expect(gapIds(basePMA({ C_PMA1: Answer.No }))).not.toContain('GAP-PMA-INCOMPLETE');
    });
  });

  // --- Uncertain significance ---

  describe('GAP-SIG-UNCERTAIN', () => {
    it('fires when determination.hasUncertainSignificance is true', () => {
      const answers = base510k({ C3: Answer.Uncertain });
      const det = computeDetermination(answers);
      expect(det.hasUncertainSignificance).toBe(true);
      const gaps = computeEvidenceGaps(answers, det);
      expect(gaps.some((g) => g.id === 'GAP-SIG-UNCERTAIN')).toBe(true);
    });

    it('does not fire when all significance is definitive', () => {
      expect(gapIds(base510k())).not.toContain('GAP-SIG-UNCERTAIN');
    });
  });

  // --- Integration: clean baseline produces minimal gaps ---

  describe('clean baselines', () => {
    it('510(k) clean baseline has no gaps', () => {
      expect(gapsFor(base510k())).toHaveLength(0);
    });

    it('De Novo clean baseline has no gaps', () => {
      expect(gapsFor(baseDeNovo())).toHaveLength(0);
    });

    it('PMA clean baseline has no gaps when C_PMA1 is answered', () => {
      expect(gapsFor(basePMA({ C_PMA1: Answer.No }))).toHaveLength(0);
    });
  });

  // --- Severity classification ---

  describe('severity classification', () => {
    it('GAP-A1 is critical', () => {
      const gaps = computeEvidenceGaps({}, baseDetermination());
      expect(gaps.find((g) => g.id === 'GAP-A1')!.severity).toBe('critical');
    });

    it('GAP-TRAINING-REPR is important', () => {
      const gaps = gapsFor(base510k({ E1: Answer.No }));
      expect(gaps.find((g) => g.id === 'GAP-TRAINING-REPR')!.severity).toBe('important');
    });

    it('GAP-SIG-UNCERTAIN is important', () => {
      const answers = base510k({ C3: Answer.Uncertain });
      const gaps = gapsFor(answers);
      expect(gaps.find((g) => g.id === 'GAP-SIG-UNCERTAIN')!.severity).toBe('important');
    });
  });

  // --- Multiple gaps can co-exist ---

  describe('multiple gaps', () => {
    it('accumulates multiple independent gaps', () => {
      const answers = base510k({
        E1: Answer.No,
        E2: Answer.No,
        E3: Answer.Yes,
        E4: Answer.No,
        E5: Answer.Yes,
      });
      const ids = gapIds(answers);
      expect(ids).toContain('GAP-TRAINING-REPR');
      expect(ids).toContain('GAP-SUBGROUP');
      expect(ids).toContain('GAP-POPULATION-SCOPE');
      expect(ids).toContain('GAP-BIAS-ASSESSMENT-UPDATE');
      expect(ids).toContain('GAP-BIAS-MITIGATION');
    });
  });
});
