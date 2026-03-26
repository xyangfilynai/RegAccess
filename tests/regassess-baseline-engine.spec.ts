import { describe, expect, it } from 'vitest';

/**
 * Baseline tests for the RegAssess decision engine.
 *
 * Adjust the import path after extraction. The target module should export:
 * - Answer
 * - AuthPathway
 * - Pathway
 * - computeDetermination
 * - computeDerivedState
 */
import {
  Answer,
  AuthPathway,
  Pathway,
  computeDetermination,
  computeDerivedState,
} from '../src/lib/assessment-engine';

type Answers = Record<string, any>;

const base510k = (overrides: Answers = {}): Answers => ({
  A1: AuthPathway.FiveOneZeroK,
  A1b: 'K123456',
  A1c: 'v1.0',
  A1d: 'Authorized IFU statement',
  A2: Answer.No,
  A3: ['US'],
  A6: ['Traditional ML (e.g., random forest, SVM)'],
  B3: Answer.No,
  C1: Answer.No,
  C2: Answer.No,
  C3: Answer.No,
  C4: Answer.No,
  C5: Answer.No,
  C6: Answer.No,
  ...overrides,
});

const baseDeNovo = (overrides: Answers = {}): Answers =>
  base510k({ A1: AuthPathway.DeNovo, ...overrides });

const basePMA = (overrides: Answers = {}): Answers => ({
  A1: AuthPathway.PMA,
  A1b: 'P123456',
  A1c: 'v1.0',
  A1d: 'Authorized IFU statement',
  A2: Answer.No,
  A3: ['US'],
  A6: ['Traditional ML (e.g., random forest, SVM)'],
  B3: Answer.No,
  ...overrides,
});

describe('computeDetermination — 510(k) / De Novo', () => {
  it('routes all-non-significant 510(k) changes to Letter to File', () => {
    const det = computeDetermination(base510k());

    expect(det.pathway).toBe(Pathway.LetterToFile);
    expect(det.allSignificanceNo).toBe(true);
    expect(det.isDocOnly).toBe(true);
    expect(det.isNewSub).toBe(false);
    expect(det.isIncomplete).toBe(false);
  });

  it('records the matched declarative pathway rule and recommendation trace', () => {
    const det = computeDetermination(base510k());

    expect(det.decisionTrace.pathwayRule.id).toBe('nonpma-all-significance-no');
    expect(det.decisionTrace.pccpRecommendationRule.id).toBe('suppress-pccp-recommendation');
    expect(det.decisionTrace.consistencyRules).toEqual([]);
  });

  it('records triggered declarative consistency rules', () => {
    const det = computeDetermination(base510k({ D1: Answer.Yes }));

    expect(det.decisionTrace.consistencyRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'nonpma-foundation-model-all-significance-no',
        }),
      ]),
    );
  });

  it('routes pure cybersecurity changes to Letter to File', () => {
    const det = computeDetermination(base510k({ C1: Answer.Yes }));

    expect(det.pathway).toBe(Pathway.LetterToFile);
    expect(det.isCyberOnly).toBe(true);
    expect(det.isBugFix).toBe(false);
  });

  it('routes pure restore-to-spec bug fixes to Letter to File', () => {
    const det = computeDetermination(base510k({ C2: Answer.Yes }));

    expect(det.pathway).toBe(Pathway.LetterToFile);
    expect(det.isBugFix).toBe(true);
    expect(det.isCyberOnly).toBe(false);
  });

  it('routes intended-use changes to New Submission Required', () => {
    const det = computeDetermination(base510k({ B3: Answer.Yes }));

    expect(det.pathway).toBe(Pathway.NewSubmission);
    expect(det.isIntendedUseChange).toBe(true);
    expect(det.pccpRecommendation).toEqual({ shouldRecommend: true });
  });

  it('routes intended-use uncertainty to Assessment Incomplete with mandatory consistency warning', () => {
    const det = computeDetermination(base510k({ B3: Answer.Uncertain }));

    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.isIntendedUseUncertain).toBe(true);
    expect(det.isIncomplete).toBe(true);
    expect(det.consistencyIssues.length).toBeGreaterThan(0);
    expect(det.consistencyIssues.join(' ')).toContain('Intended use impact is marked Uncertain');
    expect(det.consistencyIssues.join(' ')).toContain('Pre-Submission');
  });

  it('routes significant changes without PCCP to New Submission Required', () => {
    const det = computeDetermination(base510k({ C3: Answer.Yes }));

    expect(det.pathway).toBe(Pathway.NewSubmission);
    expect(det.isSignificant).toBe(true);
    expect(det.baseSignificant).toBe(true);
    expect(det.pccpRecommendation).toEqual({ shouldRecommend: true });
  });

  it('routes significant changes under verified PCCP scope to Implement Under Authorized PCCP', () => {
    const det = computeDetermination(
      base510k({
        A2: Answer.Yes,
        C3: Answer.Yes,
        P1: Answer.Yes,
        P2: Answer.Yes,
        P3: Answer.Yes,
        P4: Answer.Yes,
        P5: Answer.Yes,
      }),
    );

    expect(det.pathway).toBe(Pathway.ImplementPCCP);
    expect(det.isPCCPImpl).toBe(true);
    expect(det.pccpScopeVerified).toBe(true);
    expect(det.pccpIncomplete).toBe(false);
  });

  it('routes significant changes with partially answered PCCP scope to Assessment Incomplete', () => {
    const det = computeDetermination(
      base510k({
        A2: Answer.Yes,
        C3: Answer.Yes,
        P1: Answer.Yes,
        P2: Answer.Uncertain,
      }),
    );

    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.pccpScopeVerified).toBe(false);
    expect(det.pccpScopeFailed).toBe(false);
    expect(det.pccpIncomplete).toBe(true);
  });

  it('does not let stale downstream PCCP failures override an unresolved earlier PCCP gate', () => {
    const det = computeDetermination(
      base510k({
        A2: Answer.Yes,
        C3: Answer.Yes,
        P1: Answer.Yes,
        P2: Answer.Uncertain,
        P5: Answer.No,
      }),
    );

    expect(det.pccpScopeFailed).toBe(false);
    expect(det.pccpIncomplete).toBe(true);
    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
  });

  it('escalates cumulative drift plus unsupported substantial equivalence to New Submission Required', () => {
    const det = computeDetermination(
      base510k({
        A8: '3',
        C10: Answer.Yes,
        C11: Answer.No,
      }),
    );

    expect(det.pathway).toBe(Pathway.NewSubmission);
    expect(det.cumulativeEscalation).toBe(true);
    expect(det.seNotSupportable).toBe(true);
    expect(det.isSignificant).toBe(true);
  });

  it('marks cumulative-drift cases incomplete when C11 is still missing', () => {
    const det = computeDetermination(
      base510k({
        A8: '3',
        C10: Answer.Yes,
      }),
    );

    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.cumulativeEscalation).toBe(true);
    expect(det.significanceIncomplete).toBe(true);
    expect(det.seNotSupportable).toBe(false);
  });

  it('routes failed De Novo device-type fit to New Submission Required even if significance answers are all No', () => {
    const det = computeDetermination(
      baseDeNovo({
        C0_DN1: Answer.No,
      }),
    );

    expect(det.pathway).toBe(Pathway.NewSubmission);
    expect(det.deNovoDeviceTypeFitFailed).toBe(true);
    expect(det.consistencyIssues.join(' ')).toContain('device type / special controls');
  });

  it('marks uncertain De Novo device-type fit as Assessment Incomplete', () => {
    const det = computeDetermination(
      baseDeNovo({
        C0_DN1: Answer.Uncertain,
      }),
    );

    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.significanceIncomplete).toBe(true);
    expect(det.consistencyIssues.join(' ')).toContain('continued fit');
  });

  it('flags missing baseline fields without blocking a non-significant Letter to File result', () => {
    const det = computeDetermination(
      base510k({
        A1b: undefined,
      }),
    );

    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.baselineIncomplete).toBe(true);
    expect(det.consistencyIssues.join(' ')).toContain('baseline fields');
  });

  it('flags GenAI guardrail inconsistency when D4 is Yes but C5 is No', () => {
    const det = computeDetermination(
      base510k({
        D4: Answer.Yes,
        C5: Answer.No,
      }),
    );

    expect(det.genAIHighImpactChange).toBe(true);
    expect(det.consistencyIssues.join(' ')).toContain('guardrail / safety filter');
  });

  it('flags foundation-model inconsistency when D1 is Yes but all significance answers are No', () => {
    const det = computeDetermination(
      base510k({
        D1: Answer.Yes,
      }),
    );

    expect(det.genAIHighImpactChange).toBe(true);
    expect(det.consistencyIssues.join(' ')).toContain('foundation/base model change');
  });

  it('flags demographic expansion inconsistency when E3 is Yes but B3 is No', () => {
    const det = computeDetermination(
      base510k({
        E3: Answer.Yes,
      }),
    );

    expect(det.consistencyIssues.join(' ')).toContain('demographic populations');
  });
});

describe('computeDetermination — PMA', () => {
  it('marks PMA assessments incomplete when PMA significance questions are not yet answered', () => {
    const det = computeDetermination(basePMA());

    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.pmaIncomplete).toBe(true);
  });

  it('routes non-significant PMA changes to PMA Annual Report / Letter to File', () => {
    const det = computeDetermination(
      basePMA({
        C_PMA1: Answer.No,
        C_PMA2: Answer.No,
        C_PMA3: Answer.No,
      }),
    );

    expect(det.pathway).toBe(Pathway.PMAAnnualReport);
    expect(det.isDocOnly).toBe(true);
    expect(det.pmaRequiresSupplement).toBe(false);
  });

  it('routes PMA intended-use changes to PMA Supplement Required', () => {
    const det = computeDetermination(basePMA({ B3: Answer.Yes }));

    expect(det.pathway).toBe(Pathway.PMASupplementRequired);
    expect(det.isNewSub).toBe(true);
  });

  it('routes PMA safety/effectiveness-impact changes to PMA Supplement Required', () => {
    const det = computeDetermination(
      basePMA({
        C_PMA1: Answer.Yes,
        C_PMA2: Answer.No,
        C_PMA3: Answer.No,
      }),
    );

    expect(det.pathway).toBe(Pathway.PMASupplementRequired);
    expect(det.pmaRequiresSupplement).toBe(true);
  });

  it('does not require a PMA supplement for a labeling-only change when safety/effectiveness impact is answered No', () => {
    const det = computeDetermination(
      basePMA({
        C_PMA1: Answer.No,
        C_PMA2: Answer.Yes,
      }),
    );

    expect(det.pathway).toBe(Pathway.PMAAnnualReport);
    expect(det.pmaRequiresSupplement).toBe(false);
    expect(det.consistencyIssues.join(' ')).toContain('labeling change');
  });

  it('does not require a PMA supplement for a manufacturing-only change when safety/effectiveness impact is answered No', () => {
    const det = computeDetermination(
      basePMA({
        C_PMA1: Answer.No,
        C_PMA3: Answer.Yes,
      }),
    );

    expect(det.pathway).toBe(Pathway.PMAAnnualReport);
    expect(det.pmaRequiresSupplement).toBe(false);
    expect(det.consistencyIssues.join(' ')).toContain('manufacturing or facility change');
  });

  it('does not mark a PMA safety/effectiveness-impact change incomplete just because labeling/manufacturing detail questions are unanswered', () => {
    const det = computeDetermination(
      basePMA({
        C_PMA1: Answer.Yes,
      }),
    );

    expect(det.pathway).toBe(Pathway.PMASupplementRequired);
    expect(det.pmaIncomplete).toBe(false);
  });

  it('routes PMA supplement-triggering changes under verified PCCP scope to Implement Under Authorized PCCP', () => {
    const det = computeDetermination(
      basePMA({
        A2: Answer.Yes,
        C_PMA1: Answer.Yes,
        C_PMA2: Answer.No,
        C_PMA3: Answer.No,
        P1: Answer.Yes,
        P2: Answer.Yes,
        P3: Answer.Yes,
        P4: Answer.Yes,
        P5: Answer.Yes,
      }),
    );

    expect(det.pathway).toBe(Pathway.ImplementPCCP);
    expect(det.pccpScopeVerified).toBe(true);
    expect(det.pmaRequiresSupplement).toBe(true);
  });

  it('marks PMA supplement-triggering changes incomplete when PCCP scope review is partial', () => {
    const det = computeDetermination(
      basePMA({
        A2: Answer.Yes,
        C_PMA1: Answer.Yes,
        C_PMA2: Answer.No,
        C_PMA3: Answer.No,
        P1: Answer.Yes,
        P2: Answer.Uncertain,
      }),
    );

    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.pccpIncomplete).toBe(true);
  });
});

describe('computeDerivedState', () => {
  it('detects generative/foundation AI and market rollups correctly', () => {
    const state = computeDerivedState({
      A1: AuthPathway.FiveOneZeroK,
      A2: Answer.Yes,
      A3: ['US', 'EU', 'UK'],
      A5: Answer.Yes,
      A5b: Answer.No,
      A6: ['LLM / Foundation Model', 'Generative AI'],
      B1: 'Foundation Model / Generative AI',
    });

    expect(state.hasGenAI).toBe(true);
    expect(state.hasEU).toBe(true);
    expect(state.hasUK).toBe(true);
    expect(state.hasNonUSMarket).toBe(true);
    expect(state.isMultiMarket).toBe(true);
    expect(state.euHighRisk).toBe(true);
    expect(state.hasPCCP).toBe(true);
    expect(state.is510k).toBe(true);
  });

  it('does not mark EU high-risk without EU market presence', () => {
    const state = computeDerivedState({
      A1: AuthPathway.DeNovo,
      A2: Answer.No,
      A3: ['US', 'Canada'],
      A5: Answer.Yes,
      A6: ['Deep Learning (e.g., CNN, RNN)'],
      B1: 'Training Data',
    });

    expect(state.hasEU).toBe(false);
    expect(state.euHighRisk).toBe(false);
    expect(state.hasCanada).toBe(true);
    expect(state.isDeNovo).toBe(true);
    expect(state.hasGenAI).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Trust-remediation tests — regulatory correctness validation
// ════════════════════════════════════════════════════════════════════════

describe('B3 Uncertain escalation (Finding #1)', () => {
  it('routes 510(k) B3=Uncertain to Assessment Incomplete, not New Submission', () => {
    const det = computeDetermination(base510k({ B3: Answer.Uncertain }));
    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.isIncomplete).toBe(true);
    expect(det.isNewSub).toBe(false);
  });

  it('routes PMA B3=Uncertain to Assessment Incomplete, not PMA Supplement', () => {
    const det = computeDetermination(basePMA({ B3: Answer.Uncertain }));
    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.isIncomplete).toBe(true);
    expect(det.isNewSub).toBe(false);
  });

  it('produces a mandatory consistency warning when B3=Uncertain', () => {
    const det = computeDetermination(base510k({ B3: Answer.Uncertain }));
    expect(det.consistencyIssues.some((i: string) => i.includes('Intended use impact is marked Uncertain'))).toBe(true);
    expect(det.consistencyIssues.some((i: string) => i.includes('Pre-Submission'))).toBe(true);
  });
});

describe('C1/C2 Uncertain handling (Finding #2)', () => {
  it('C1=Uncertain does NOT qualify for cybersecurity exemption', () => {
    const det = computeDetermination(base510k({ C1: Answer.Uncertain }));
    expect(det.isCyberOnly).toBe(false);
    // Uncertain on C1 means the cyber exemption is NOT claimed; the assessment
    // continues to the full significance evaluation. The final pathway depends on
    // significance answers — it may still be LTF via allSignificanceNo, but NOT
    // via the cybersecurity exemption shortcut.
  });

  it('C2=Uncertain does NOT qualify for restore-to-spec exemption (no Letter to File)', () => {
    const det = computeDetermination(base510k({ C2: Answer.Uncertain }));
    expect(det.isBugFix).toBe(false);
    // All significance questions are defaulted to No in base510k, so it routes to LTF
    // via allSignificanceNo — but NOT via the bug-fix exemption
  });

  it('C1=Uncertain produces a consistency warning about exemption uncertainty', () => {
    const det = computeDetermination(base510k({ C1: Answer.Uncertain }));
    expect(det.consistencyIssues.some((i: string) => i.includes('Cybersecurity exemption eligibility is uncertain'))).toBe(true);
  });

  it('C2=Uncertain produces a consistency warning about exemption uncertainty', () => {
    const det = computeDetermination(base510k({ C2: Answer.Uncertain }));
    expect(det.consistencyIssues.some((i: string) => i.includes('Restore-to-specification exemption eligibility is uncertain'))).toBe(true);
  });
});

describe('isLetterToFile vs isPMAAnnualReport (Finding #15)', () => {
  it('isLetterToFile is true only for Letter to File pathway', () => {
    const ltf = computeDetermination(base510k());
    expect(ltf.isLetterToFile).toBe(true);
    expect(ltf.isPMAAnnualReport).toBe(false);
    expect(ltf.isDocOnly).toBe(true);
  });

  it('isPMAAnnualReport is true only for PMA Annual Report pathway', () => {
    const pma = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
    }));
    expect(pma.isPMAAnnualReport).toBe(true);
    expect(pma.isLetterToFile).toBe(false);
    expect(pma.isDocOnly).toBe(true);
  });

  it('New Submission pathway has neither isLetterToFile nor isPMAAnnualReport', () => {
    const det = computeDetermination(base510k({ B3: Answer.Yes }));
    expect(det.isLetterToFile).toBe(false);
    expect(det.isPMAAnnualReport).toBe(false);
    expect(det.isDocOnly).toBe(false);
  });
});

describe('PMA Uncertain safety/effectiveness (Finding #7 test)', () => {
  it('routes PMA C_PMA1=Uncertain to PMA Supplement Required, not Annual Report', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.Uncertain,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
    }));
    expect(det.pathway).toBe(Pathway.PMASupplementRequired);
    expect(det.pmaRequiresSupplement).toBe(true);
  });
});

describe('De Novo fit failure + PCCP interaction', () => {
  it('De Novo with failed device-type fit cannot route to PCCP regardless of scope verification', () => {
    const det = computeDetermination(baseDeNovo({
      A2: Answer.Yes,
      C0_DN1: Answer.No,
      P1: Answer.Yes,
      P2: Answer.Yes,
      P3: Answer.Yes,
      P4: Answer.Yes,
      P5: Answer.Yes,
    }));
    // Device-type fit failure routes to NewSubmission before PCCP evaluation
    expect(det.pathway).toBe(Pathway.NewSubmission);
    expect(det.deNovoDeviceTypeFitFailed).toBe(true);
    expect(det.isPCCPImpl).toBe(false);
  });
});

describe('Cumulative escalation + SE supportable', () => {
  it('C10=Yes + C11=Yes (SE still supportable) routes to Letter to File, not New Submission', () => {
    const det = computeDetermination(base510k({
      A8: '3',
      C10: Answer.Yes,
      C11: Answer.Yes,
    }));
    expect(det.pathway).toBe(Pathway.LetterToFile);
    expect(det.cumulativeEscalation).toBe(true);
    expect(det.seNotSupportable).toBe(false);
    expect(det.isNewSub).toBe(false);
  });
});

describe('Cumulative drift uncertainty routing (Issue #1 fix)', () => {
  it('C10=Uncertain must NOT route to Letter to File — routes to Assessment Incomplete', () => {
    const det = computeDetermination(base510k({
      A8: '3',
      C10: Answer.Uncertain,
    }));
    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.cumulativeEscalation).toBe(true);
    expect(det.cumulativeDriftUnresolved).toBe(true);
    expect(det.isDocOnly).toBe(false);
  });

  it('De Novo C10=Yes (C11 never shown) must NOT route to Letter to File', () => {
    const det = computeDetermination(baseDeNovo({
      A8: '3',
      C10: Answer.Yes,
    }));
    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.cumulativeEscalation).toBe(true);
    expect(det.cumulativeDriftUnresolved).toBe(true);
    expect(det.isDocOnly).toBe(false);
  });

  it('De Novo C10=Uncertain also routes to Assessment Incomplete', () => {
    const det = computeDetermination(baseDeNovo({
      A8: '3',
      C10: Answer.Uncertain,
    }));
    expect(det.pathway).toBe(Pathway.AssessmentIncomplete);
    expect(det.cumulativeEscalation).toBe(true);
    expect(det.cumulativeDriftUnresolved).toBe(true);
  });
});

describe('GenAI consistency cross-checks', () => {
  it('D1=Yes (base model swap) + all significance=No produces consistency warnings', () => {
    const det = computeDetermination(base510k({ D1: Answer.Yes }));
    expect(det.genAIHighImpactChange).toBe(true);
    expect(det.consistencyIssues.length).toBeGreaterThan(0);
    expect(det.consistencyIssues.some((i: string) => i.includes('foundation/base model change'))).toBe(true);
  });
});

describe('dead code removal (Finding #3)', () => {
  it('determination object does not contain consistencyBlock field', () => {
    const det = computeDetermination(base510k()) as Record<string, any>;
    expect('consistencyBlock' in det).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Logic audit fixes — preventing misroutes and stale-answer hazards
// ════════════════════════════════════════════════════════════════════════

describe('PMA devices must not use 510(k) exemption flags', () => {
  it('PMA device with C1=Yes does not set isCyberOnly (510(k) exemption does not apply to PMA)', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      C1: Answer.Yes, // stale or coincidental
    }));
    expect(det.isCyberOnly).toBe(false);
    expect(det.pathway).toBe(Pathway.PMAAnnualReport);
  });

  it('PMA device with C2=Yes does not set isBugFix (510(k) exemption does not apply to PMA)', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      C2: Answer.Yes, // stale or coincidental
    }));
    expect(det.isBugFix).toBe(false);
    expect(det.pathway).toBe(Pathway.PMAAnnualReport);
  });
});

describe('PCCP scope verification requires active PCCP (A2=Yes)', () => {
  it('stale P-block answers do not trigger pccpScopeVerified when A2=No', () => {
    const det = computeDetermination(base510k({
      A2: Answer.No, // no PCCP
      P1: Answer.Yes,
      P2: Answer.Yes,
      P3: Answer.Yes,
      P4: Answer.Yes,
      P5: Answer.Yes, // stale from previous session
    }));
    expect(det.pccpScopeVerified).toBe(false);
    expect(det.pccpScopeFailed).toBe(false);
    expect(det.pccpIncomplete).toBe(false);
    expect(det.pathway).toBe(Pathway.LetterToFile);
  });

  it('stale P-block answers do not trigger pccpScopeFailed when A2=No', () => {
    const det = computeDetermination(base510k({
      A2: Answer.No,
      C3: Answer.Yes, // significant
      P1: Answer.No, // stale
    }));
    expect(det.pccpScopeFailed).toBe(false);
    expect(det.pathway).toBe(Pathway.NewSubmission);
  });
});

describe('PMA GenAI consistency checks', () => {
  it('PMA device with D4=Yes (guardrail change) + C_PMA1=No produces consistency warning', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      D4: Answer.Yes,
    }));
    expect(det.consistencyIssues.some((i: string) => i.includes('guardrail') && i.includes('C_PMA1'))).toBe(true);
  });

  it('PMA device with D1=Yes (base model swap) + C_PMA1=No produces consistency warning', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      D1: Answer.Yes,
    }));
    expect(det.consistencyIssues.some((i: string) => i.includes('foundation/base model') && i.includes('C_PMA1'))).toBe(true);
  });

  it('PMA GenAI high-impact flag fires for PMA devices', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      D1: Answer.Yes,
    }));
    expect(det.genAIHighImpactChange).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Third-pass logic audit — stale answer hazards and PMA gap coverage
// ════════════════════════════════════════════════════════════════════════

describe('Stale C10/C11 answers after A8 correction to 0', () => {
  it('stale C10=Yes with A8=0 does not trigger cumulative drift escalation', () => {
    const det = computeDetermination(base510k({
      A8: '0',
      C10: Answer.Yes, // stale from when A8 was > 0
      C11: Answer.No,  // stale
    }));
    expect(det.cumulativeEscalation).toBe(false);
    expect(det.seNotSupportable).toBe(false);
    expect(det.isSignificant).toBe(false);
    expect(det.pathway).toBe(Pathway.LetterToFile);
  });

  it('stale C10=Yes with A8 empty does not trigger cumulative drift escalation', () => {
    const det = computeDetermination(base510k({
      C10: Answer.Yes, // stale
    }));
    expect(det.cumulativeEscalation).toBe(false);
    expect(det.pathway).toBe(Pathway.LetterToFile);
  });
});

describe('C1/C2 Uncertain consistency warnings must not fire for PMA devices', () => {
  it('PMA device with stale C1=Uncertain does not produce cybersecurity exemption warning', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      C1: Answer.Uncertain, // stale from 510(k) session
    }));
    expect(det.consistencyIssues.some((i: string) => i.includes('Cybersecurity exemption'))).toBe(false);
  });

  it('PMA device with stale C2=Uncertain does not produce restore-to-spec warning', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      C2: Answer.Uncertain, // stale from 510(k) session
    }));
    expect(det.consistencyIssues.some((i: string) => i.includes('Restore-to-specification'))).toBe(false);
  });
});

describe('PMA prompt/RAG consistency check', () => {
  it('PMA device with D2=Yes (prompt change) + C_PMA1=No produces consistency warning', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      D2: Answer.Yes,
    }));
    expect(det.consistencyIssues.some((i: string) => i.includes('prompt') && i.includes('C_PMA1'))).toBe(true);
  });

  it('PMA device with D3=Yes (RAG change) + C_PMA1=No produces consistency warning', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      D3: Answer.Yes,
    }));
    expect(det.consistencyIssues.some((i: string) => i.includes('RAG') && i.includes('C_PMA1'))).toBe(true);
  });
});

describe('PMA monitoring threshold consistency check', () => {
  it('PMA device with monitoring threshold change + C_PMA1=No produces consistency warning', () => {
    const det = computeDetermination(basePMA({
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      B1: 'Post-Market Surveillance',
      B2: 'Monitoring threshold adjustment',
    }));
    expect(det.consistencyIssues.some((i: string) => i.includes('monitoring') && i.includes('C_PMA1'))).toBe(true);
  });
});

describe('PCCP incomplete must not fire for PMA Annual Report pathway', () => {
  it('PMA + PCCP + no supplement needed does not set pccpIncomplete', () => {
    const det = computeDetermination(basePMA({
      A2: Answer.Yes,
      C_PMA1: Answer.No,
      C_PMA2: Answer.No,
      C_PMA3: Answer.No,
      P1: Answer.Yes,
      P2: Answer.Uncertain, // partially answered
    }));
    expect(det.pmaRequiresSupplement).toBe(false);
    expect(det.pccpIncomplete).toBe(false); // PCCP not relevant since no supplement needed
    expect(det.pathway).toBe(Pathway.PMAAnnualReport);
  });
});
