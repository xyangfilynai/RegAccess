import { describe, expect, it } from 'vitest';

import {
  Answer,
  AuthPathway,
  computeDerivedState,
  getQuestions,
  getBlocks,
} from '../src/lib/assessment-engine';

type Answers = Record<string, any>;

// ── Helpers ──

/** Return the question object for a given ID, or undefined if absent. */
const findQ = (blockId: string, answers: Answers, id: string) => {
  const ds = computeDerivedState(answers);
  return getQuestions(blockId, answers, ds).find(q => q.id === id);
};

/** True when the question exists and is NOT skipped. */
const isVisible = (blockId: string, answers: Answers, id: string) => {
  const q = findQ(blockId, answers, id);
  return q !== undefined && !q.skip;
};

/** True when the question either doesn't exist or is skipped. */
const isHidden = (blockId: string, answers: Answers, id: string) => {
  return !isVisible(blockId, answers, id);
};

/** Return block IDs from getBlocks. */
const blockIds = (answers: Answers) => {
  const ds = computeDerivedState(answers);
  return getBlocks(answers, ds).map(b => b.id);
};

// ── Base answer sets ──

const base510k = (overrides: Answers = {}): Answers => ({
  A1: AuthPathway.FiveOneZeroK,
  A1b: 'K123456',
  A1c: 'v1.0',
  A1d: 'Authorized IFU statement',
  A2: Answer.No,
  A3: ['US'],
  A6: ['Traditional ML (e.g., random forest, SVM)'],
  B3: Answer.No,
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

// ════════════════════════════════════════════════════════════════════════
// 1. De Novo-only baseline questions
// ════════════════════════════════════════════════════════════════════════

describe('De Novo-only question visibility', () => {
  it('A1f is hidden unless A1 === "De Novo"', () => {
    expect(isHidden('A', base510k(), 'A1f')).toBe(true);
    expect(isHidden('A', basePMA(), 'A1f')).toBe(true);
    expect(isVisible('A', baseDeNovo(), 'A1f')).toBe(true);
  });

  it('C0_DN1 is hidden unless A1 === "De Novo" and B3 !== Yes', () => {
    // Hidden for 510(k)
    expect(isHidden('C', base510k(), 'C0_DN1')).toBe(true);
    // Visible for De Novo when B3 is No
    expect(isVisible('C', baseDeNovo(), 'C0_DN1')).toBe(true);
    // Hidden when B3 is Yes (intended-use change overrides)
    expect(isHidden('C', baseDeNovo({ B3: Answer.Yes }), 'C0_DN1')).toBe(true);
  });

  it('C0_DN2 is hidden unless A1 === "De Novo", B3 !== Yes, and C0_DN1 !== Yes', () => {
    // Hidden for 510(k)
    expect(isHidden('C', base510k(), 'C0_DN2')).toBe(true);
    // Hidden when C0_DN1 is Yes (passed fit check)
    expect(isHidden('C', baseDeNovo({ C0_DN1: Answer.Yes }), 'C0_DN2')).toBe(true);
    // Visible when C0_DN1 is No (failed fit → ask about special controls)
    expect(isVisible('C', baseDeNovo({ C0_DN1: Answer.No }), 'C0_DN2')).toBe(true);
    // Visible when C0_DN1 is Uncertain
    expect(isVisible('C', baseDeNovo({ C0_DN1: Answer.Uncertain }), 'C0_DN2')).toBe(true);
    // Hidden when B3 is Yes regardless
    expect(isHidden('C', baseDeNovo({ B3: Answer.Yes }), 'C0_DN2')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. PCCP-only questions
// ════════════════════════════════════════════════════════════════════════

describe('PCCP question visibility', () => {
  it('A2b and A2c are hidden unless A2 === Yes', () => {
    expect(isHidden('A', base510k(), 'A2b')).toBe(true);
    expect(isHidden('A', base510k(), 'A2c')).toBe(true);
    expect(isVisible('A', base510k({ A2: Answer.Yes }), 'A2b')).toBe(true);
    expect(isVisible('A', base510k({ A2: Answer.Yes }), 'A2c')).toBe(true);
  });

  it('P block only appears when PCCP is active and B3 is not Yes/Uncertain', () => {
    // No PCCP → no P block
    expect(blockIds(base510k())).not.toContain('P');
    // PCCP active, B3=No → P block appears
    expect(blockIds(base510k({ A2: Answer.Yes }))).toContain('P');
    // PCCP active, B3=Yes → P block hidden (intended-use change bypasses PCCP)
    expect(blockIds(base510k({ A2: Answer.Yes, B3: Answer.Yes }))).not.toContain('P');
    // PCCP active, B3=Uncertain → P block hidden
    expect(blockIds(base510k({ A2: Answer.Yes, B3: Answer.Uncertain }))).not.toContain('P');
  });

  it('P2 is hidden unless P1 === Yes', () => {
    const pccpBase = base510k({ A2: Answer.Yes });
    expect(isHidden('P', pccpBase, 'P2')).toBe(true);
    expect(isHidden('P', { ...pccpBase, P1: Answer.No }, 'P2')).toBe(true);
    expect(isVisible('P', { ...pccpBase, P1: Answer.Yes }, 'P2')).toBe(true);
  });

  it('P3 is hidden unless P1 === Yes and P2 === Yes', () => {
    const pccpBase = base510k({ A2: Answer.Yes, P1: Answer.Yes });
    expect(isHidden('P', pccpBase, 'P3')).toBe(true);
    expect(isHidden('P', { ...pccpBase, P2: Answer.No }, 'P3')).toBe(true);
    expect(isVisible('P', { ...pccpBase, P2: Answer.Yes }, 'P3')).toBe(true);
    expect(isHidden('P', { ...pccpBase, P2: Answer.Uncertain }, 'P3')).toBe(true);
  });

  it('P4 is hidden unless P1 === Yes, P2 === Yes, and P3 === Yes', () => {
    const pccpBase = base510k({ A2: Answer.Yes, P1: Answer.Yes, P2: Answer.Yes });
    expect(isHidden('P', pccpBase, 'P4')).toBe(true); // P3 not Yes yet
    expect(isVisible('P', { ...pccpBase, P3: Answer.Yes }, 'P4')).toBe(true);
    expect(isHidden('P', { ...pccpBase, P3: Answer.No }, 'P4')).toBe(true);
    expect(isHidden('P', { ...base510k({ A2: Answer.Yes, P1: Answer.Yes, P2: Answer.Uncertain }), P3: Answer.Yes }, 'P4')).toBe(true);
  });

  it('P5 is hidden unless P1 === Yes, P2 === Yes, P3 === Yes, and P4 === Yes', () => {
    const pccpBase = base510k({ A2: Answer.Yes, P1: Answer.Yes, P2: Answer.Yes, P3: Answer.Yes });
    expect(isHidden('P', pccpBase, 'P5')).toBe(true); // P4 not Yes yet
    expect(isVisible('P', { ...pccpBase, P4: Answer.Yes }, 'P5')).toBe(true);
    expect(isHidden('P', { ...pccpBase, P4: Answer.No }, 'P5')).toBe(true);
    expect(isHidden('P', { ...base510k({ A2: Answer.Yes, P1: Answer.Yes, P2: Answer.Uncertain, P3: Answer.Yes, P4: Answer.Yes }) }, 'P5')).toBe(true);
  });

  it('P6 is hidden unless P1 === Yes, P2 === Yes, and P3 === Yes', () => {
    const pccpBase = base510k({ A2: Answer.Yes, P1: Answer.Yes, P2: Answer.Yes });
    expect(isHidden('P', pccpBase, 'P6')).toBe(true); // P3 not Yes yet
    expect(isVisible('P', { ...pccpBase, P3: Answer.Yes }, 'P6')).toBe(true);
    expect(isHidden('P', { ...pccpBase, P3: Answer.No }, 'P6')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. EU-only questions
// ════════════════════════════════════════════════════════════════════════

describe('EU-only question visibility', () => {
  it('A4, A5, A5b are hidden unless EU is in A3', () => {
    expect(isHidden('A', base510k(), 'A4')).toBe(true);
    expect(isHidden('A', base510k(), 'A5')).toBe(true);
    expect(isHidden('A', base510k(), 'A5b')).toBe(true);

    const euBase = base510k({ A3: ['US', 'EU'] });
    expect(isVisible('A', euBase, 'A4')).toBe(true);
    expect(isVisible('A', euBase, 'A5')).toBe(true);
    expect(isVisible('A', euBase, 'A5b')).toBe(true);
  });

  it('C8, C8b, C8c are hidden unless EU is in A3 (non-PMA path)', () => {
    expect(isHidden('C', base510k(), 'C8')).toBe(true);

    const euBase = base510k({ A3: ['US', 'EU'] });
    expect(isVisible('C', euBase, 'C8')).toBe(true);
    // C8b only visible when C8 is Uncertain
    expect(isHidden('C', euBase, 'C8b')).toBe(true);
    expect(isVisible('C', { ...euBase, C8: Answer.Uncertain }, 'C8b')).toBe(true);
    // C8c hidden when C8 is No
    expect(isHidden('C', { ...euBase, C8: Answer.No }, 'C8c')).toBe(true);
    expect(isVisible('C', { ...euBase, C8: Answer.Yes }, 'C8c')).toBe(true);
    expect(isVisible('C', { ...euBase, C8: Answer.Uncertain }, 'C8c')).toBe(true);
  });

  it('D9 is hidden unless EU is in A3 (and GenAI block active)', () => {
    // GenAI + EU → D9 visible
    const genaiEU = base510k({ A3: ['US', 'EU'], A6: ['LLM / Foundation Model'], A5: Answer.Yes });
    expect(isVisible('D', genaiEU, 'D9')).toBe(true);
    // GenAI + no EU → D9 hidden
    const genaiNoEU = base510k({ A6: ['LLM / Foundation Model'] });
    expect(isHidden('D', genaiNoEU, 'D9')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. 510(k)-specific cumulative drift questions
// ════════════════════════════════════════════════════════════════════════

describe('Cumulative drift question visibility', () => {
  it('C10 is hidden when A8 is empty or zero', () => {
    expect(isHidden('C', base510k(), 'C10')).toBe(true);
    expect(isHidden('C', base510k({ A8: '0' }), 'C10')).toBe(true);
  });

  it('C10 is visible when A8 is a nonzero number', () => {
    expect(isVisible('C', base510k({ A8: '3' }), 'C10')).toBe(true);
  });

  it('C11 is hidden unless A1 === "510(k)" and C10 === Yes', () => {
    // No C10 answer
    expect(isHidden('C', base510k({ A8: '3' }), 'C11')).toBe(true);
    // C10 is Yes → C11 visible
    expect(isVisible('C', base510k({ A8: '3', C10: Answer.Yes }), 'C11')).toBe(true);
    // C10 is No → C11 hidden
    expect(isHidden('C', base510k({ A8: '3', C10: Answer.No }), 'C11')).toBe(true);
    // De Novo + C10=Yes → C11 hidden (only for 510(k))
    expect(isHidden('C', baseDeNovo({ A8: '3', C10: Answer.Yes }), 'C11')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. PMA-only significance questions
// ════════════════════════════════════════════════════════════════════════

describe('PMA-only significance question visibility', () => {
  it('C_PMA1, C_PMA2, C_PMA3 appear for PMA assessments (B3 !== Yes)', () => {
    expect(isVisible('C', basePMA(), 'C_PMA1')).toBe(true);
    expect(isVisible('C', basePMA(), 'C_PMA2')).toBe(true);
    expect(isVisible('C', basePMA(), 'C_PMA3')).toBe(true);
  });

  it('C_PMA1–3 are hidden when B3 is Yes', () => {
    expect(isHidden('C', basePMA({ B3: Answer.Yes }), 'C_PMA1')).toBe(true);
    expect(isHidden('C', basePMA({ B3: Answer.Yes }), 'C_PMA2')).toBe(true);
    expect(isHidden('C', basePMA({ B3: Answer.Yes }), 'C_PMA3')).toBe(true);
  });

  it('C_PMA4 appears only when PMA supplement logic is triggered', () => {
    // No supplement trigger → hidden
    expect(isHidden('C', basePMA(), 'C_PMA4')).toBe(true);
    // C_PMA1=Yes → supplement triggered → visible
    expect(isVisible('C', basePMA({ C_PMA1: Answer.Yes }), 'C_PMA4')).toBe(true);
    // C_PMA1=Uncertain → supplement triggered → visible
    expect(isVisible('C', basePMA({ C_PMA1: Answer.Uncertain }), 'C_PMA4')).toBe(true);
    // Labeling/manufacturing category flags alone do not independently trigger supplement visibility
    expect(isHidden('C', basePMA({ C_PMA2: Answer.Yes }), 'C_PMA4')).toBe(true);
    expect(isHidden('C', basePMA({ C_PMA3: Answer.Yes }), 'C_PMA4')).toBe(true);
    // B3=Yes → supplement triggered → visible
    expect(isVisible('C', basePMA({ B3: Answer.Yes }), 'C_PMA4')).toBe(true);
  });

  it('510(k) path does NOT show C_PMA1–4', () => {
    const q = getQuestions('C', base510k(), computeDerivedState(base510k()));
    const ids = q.map(x => x.id);
    expect(ids).not.toContain('C_PMA1');
    expect(ids).not.toContain('C_PMA2');
    expect(ids).not.toContain('C_PMA3');
    expect(ids).not.toContain('C_PMA4');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. GenAI supplemental gating
// ════════════════════════════════════════════════════════════════════════

describe('GenAI supplemental gating', () => {
  it('D1b is hidden unless D1 === Yes', () => {
    const genai = base510k({ A6: ['LLM / Foundation Model'] });
    expect(isHidden('D', genai, 'D1b')).toBe(true);
    expect(isVisible('D', { ...genai, D1: Answer.Yes }, 'D1b')).toBe(true);
    expect(isHidden('D', { ...genai, D1: Answer.No }, 'D1b')).toBe(true);
  });

  it('GenAI block (D) appears only when A6 includes GenAI types', () => {
    // Traditional ML → no D block
    expect(blockIds(base510k())).not.toContain('D');
    // LLM → D block
    expect(blockIds(base510k({ A6: ['LLM / Foundation Model'] }))).toContain('D');
    // Generative AI → D block
    expect(blockIds(base510k({ A6: ['Generative AI'] }))).toContain('D');
    // Foundation in name → D block
    expect(blockIds(base510k({ A6: ['LLM / Foundation Model', 'Traditional ML (e.g., random forest, SVM)'] }))).toContain('D');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. Dynamic change taxonomy (Block B)
// ════════════════════════════════════════════════════════════════════════

describe('Dynamic change taxonomy', () => {
  it('B2 options populate from selected B1 category', () => {
    const ans = base510k({ B1: 'Training Data' });
    const ds = computeDerivedState(ans);
    const b2 = getQuestions('B', ans, ds).find(q => q.id === 'B2');
    expect(b2).toBeDefined();
    expect(b2!.options!.length).toBeGreaterThan(0);
    expect(b2!.options).toContain('Additional data — same distribution');
  });

  it('B2 is disabled when B1 is empty', () => {
    const ans = base510k();
    const ds = computeDerivedState(ans);
    const b2 = getQuestions('B', ans, ds).find(q => q.id === 'B2');
    expect(b2!.disabled).toBe(true);
    expect(b2!.options).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 8. Intended-use gating (B3 === Yes hides significance chain)
// ════════════════════════════════════════════════════════════════════════

describe('Intended-use gating on significance questions', () => {
  it('C1–C6 are all hidden when B3 === Yes (non-PMA)', () => {
    const ans = base510k({ B3: Answer.Yes });
    for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
      expect(isHidden('C', ans, id)).toBe(true);
    }
  });

  it('C1 is visible when B3 === No', () => {
    expect(isVisible('C', base510k(), 'C1')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 9. Significance gating (cascading skip chain)
// ════════════════════════════════════════════════════════════════════════

describe('Significance question cascading skip chain', () => {
  it('C2 is hidden when C1 === Yes (cybersecurity exemption)', () => {
    expect(isHidden('C', base510k({ C1: Answer.Yes }), 'C2')).toBe(true);
  });

  it('C3 is hidden when C1 === Yes OR C2 === Yes', () => {
    expect(isHidden('C', base510k({ C1: Answer.Yes }), 'C3')).toBe(true);
    expect(isHidden('C', base510k({ C2: Answer.Yes }), 'C3')).toBe(true);
    expect(isVisible('C', base510k({ C1: Answer.No, C2: Answer.No }), 'C3')).toBe(true);
  });

  it('C4 is hidden when C3 === Yes (harm already confirmed → skip hazard check)', () => {
    expect(isHidden('C', base510k({ C3: Answer.Yes }), 'C4')).toBe(true);
    expect(isVisible('C', base510k({ C3: Answer.No }), 'C4')).toBe(true);
  });

  it('C5 is hidden when any of C3 or C4 === Yes', () => {
    expect(isHidden('C', base510k({ C3: Answer.Yes }), 'C5')).toBe(true);
    expect(isHidden('C', base510k({ C4: Answer.Yes }), 'C5')).toBe(true);
    expect(isVisible('C', base510k({ C3: Answer.No, C4: Answer.No }), 'C5')).toBe(true);
  });

  it('C6 is hidden when any of C3, C4, or C5 === Yes', () => {
    expect(isHidden('C', base510k({ C3: Answer.Yes }), 'C6')).toBe(true);
    expect(isHidden('C', base510k({ C5: Answer.Yes }), 'C6')).toBe(true);
    expect(isVisible('C', base510k({ C3: Answer.No, C4: Answer.No, C5: Answer.No }), 'C6')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 10. Bug-fix / cyber-only visibility branches
// ════════════════════════════════════════════════════════════════════════

describe('Bug-fix / cyber-only visibility branches', () => {
  it('when C1=Yes (cyber only), C2–C6 are all hidden', () => {
    const ans = base510k({ C1: Answer.Yes });
    for (const id of ['C2', 'C3', 'C4', 'C5', 'C6']) {
      expect(isHidden('C', ans, id)).toBe(true);
    }
  });

  it('when C2=Yes (bug fix), C3–C6 are all hidden', () => {
    const ans = base510k({ C1: Answer.No, C2: Answer.Yes });
    for (const id of ['C3', 'C4', 'C5', 'C6']) {
      expect(isHidden('C', ans, id)).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// 11. EU market-driven conditional visibility in PMA block C
// ════════════════════════════════════════════════════════════════════════

describe('EU/AI Act questions in PMA block C', () => {
  it('C_PMA5 is hidden unless EU is in A3 (PMA path)', () => {
    expect(isHidden('C', basePMA(), 'C_PMA5')).toBe(true);
    expect(isVisible('C', basePMA({ A3: ['US', 'EU'] }), 'C_PMA5')).toBe(true);
  });

  it('C_PMA6 is hidden unless euHighRisk (PMA path)', () => {
    // EU present but A5 not Yes → not high-risk
    expect(isHidden('C', basePMA({ A3: ['US', 'EU'] }), 'C_PMA6')).toBe(true);
    // EU present and A5=Yes → high-risk → visible
    expect(isVisible('C', basePMA({ A3: ['US', 'EU'], A5: Answer.Yes }), 'C_PMA6')).toBe(true);
  });

  it('C_PMA6b is hidden unless euHighRisk and C_PMA6 === Yes', () => {
    const euPMA = basePMA({ A3: ['US', 'EU'], A5: Answer.Yes });
    expect(isHidden('C', euPMA, 'C_PMA6b')).toBe(true);
    expect(isVisible('C', { ...euPMA, C_PMA6: Answer.Yes }, 'C_PMA6b')).toBe(true);
    expect(isHidden('C', { ...euPMA, C_PMA6: Answer.No }, 'C_PMA6b')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 12. Non-US market / jurisdiction block gating
// ════════════════════════════════════════════════════════════════════════

describe('Jurisdiction block and question visibility', () => {
  it('F block appears only when non-US markets are selected', () => {
    expect(blockIds(base510k())).not.toContain('F');
    expect(blockIds(base510k({ A3: ['US', 'EU'] }))).toContain('F');
    expect(blockIds(base510k({ A3: ['US', 'Canada'] }))).toContain('F');
  });

  it('F2 is hidden unless Canada is in A3', () => {
    const euOnly = base510k({ A3: ['US', 'EU'] });
    expect(isHidden('F', euOnly, 'F2')).toBe(true);
    const withCanada = base510k({ A3: ['US', 'Canada'] });
    expect(isVisible('F', withCanada, 'F2')).toBe(true);
  });

  it('F4 is hidden unless Japan is in A3', () => {
    expect(isHidden('F', base510k({ A3: ['US', 'EU'] }), 'F4')).toBe(true);
    expect(isVisible('F', base510k({ A3: ['US', 'Japan'] }), 'F4')).toBe(true);
  });

  it('F7 is hidden unless UK is in A3', () => {
    expect(isHidden('F', base510k({ A3: ['US', 'EU'] }), 'F7')).toBe(true);
    expect(isVisible('F', base510k({ A3: ['US', 'UK'] }), 'F7')).toBe(true);
  });

  it('F8 is hidden unless China is in A3', () => {
    expect(isHidden('F', base510k({ A3: ['US', 'EU'] }), 'F8')).toBe(true);
    expect(isVisible('F', base510k({ A3: ['US', 'China'] }), 'F8')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 13. EU-specific questions in non-PMA block C
// ════════════════════════════════════════════════════════════════════════

describe('EU AI Act questions in non-PMA block C', () => {
  it('C9 is hidden unless euHighRisk (non-PMA path)', () => {
    const euNoHR = base510k({ A3: ['US', 'EU'] });
    expect(isHidden('C', euNoHR, 'C9')).toBe(true);
    const euHR = base510k({ A3: ['US', 'EU'], A5: Answer.Yes });
    expect(isVisible('C', euHR, 'C9')).toBe(true);
  });

  it('C9b is hidden unless euHighRisk and C9 === Yes', () => {
    const euHR = base510k({ A3: ['US', 'EU'], A5: Answer.Yes });
    expect(isHidden('C', euHR, 'C9b')).toBe(true);
    expect(isVisible('C', { ...euHR, C9: Answer.Yes }, 'C9b')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 14. Baseline tests still pass (sanity)
// ════════════════════════════════════════════════════════════════════════

describe('Baseline engine tests still pass (sanity check)', () => {
  it('getQuestions returns an array for each known block', () => {
    for (const blockId of ['A', 'B', 'C', 'P', 'D', 'E', 'F']) {
      const ans = base510k({ A2: Answer.Yes, A3: ['US', 'EU'], A6: ['LLM / Foundation Model'] });
      const ds = computeDerivedState(ans);
      const qs = getQuestions(blockId, ans, ds);
      expect(Array.isArray(qs)).toBe(true);
    }
  });

  it('getQuestions returns empty array for unknown block', () => {
    const ds = computeDerivedState(base510k());
    expect(getQuestions('Z', base510k(), ds)).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 15. C1/C2 Uncertain path — exemption questions accept Uncertain (Finding #2)
// ════════════════════════════════════════════════════════════════════════

describe('C1/C2 yesnouncertain support', () => {
  it('C1 is type yesnouncertain', () => {
    const q = findQ('C', base510k(), 'C1');
    expect(q).toBeDefined();
    expect(q!.type).toBe('yesnouncertain');
  });

  it('C2 is type yesnouncertain', () => {
    const q = findQ('C', base510k(), 'C2');
    expect(q).toBeDefined();
    expect(q!.type).toBe('yesnouncertain');
  });

  it('C1=Uncertain does not skip C2 (Uncertain does not qualify as exemption)', () => {
    expect(isVisible('C', base510k({ C1: Answer.Uncertain }), 'C2')).toBe(true);
  });

  it('C2=Uncertain does not skip C3 (Uncertain does not qualify as exemption)', () => {
    expect(isVisible('C', base510k({ C1: Answer.No, C2: Answer.Uncertain }), 'C3')).toBe(true);
  });

  it('C1=Yes still skips C2 (exemption confirmed)', () => {
    expect(isHidden('C', base510k({ C1: Answer.Yes }), 'C2')).toBe(true);
  });
});
