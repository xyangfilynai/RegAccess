import { describe, expect, it } from 'vitest';

import {
  Answer,
  AuthPathway,
  computeDerivedState,
  getBlocks,
  getQuestions,
} from '../src/lib/assessment-engine';

type Answers = Record<string, any>;

const findQ = (blockId: string, answers: Answers, id: string) => {
  const ds = computeDerivedState(answers);
  return getQuestions(blockId, answers, ds).find(q => q.id === id);
};

const isVisible = (blockId: string, answers: Answers, id: string) => {
  const q = findQ(blockId, answers, id);
  return q !== undefined && !q.skip;
};

const isHidden = (blockId: string, answers: Answers, id: string) => {
  return !isVisible(blockId, answers, id);
};

const blockIds = (answers: Answers) => {
  const ds = computeDerivedState(answers);
  return getBlocks(answers, ds).map(b => b.id);
};

const base510k = (overrides: Answers = {}): Answers => ({
  A1: AuthPathway.FiveOneZeroK,
  A1b: 'K123456',
  A1c: 'v1.0',
  A1d: 'Authorized IFU statement',
  A2: Answer.No,
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
  A6: ['Traditional ML (e.g., random forest, SVM)'],
  B3: Answer.No,
  ...overrides,
});

describe('De Novo-only question visibility', () => {
  it('C0_DN1 is hidden unless A1 === "De Novo" and B3 !== Yes', () => {
    expect(isHidden('C', base510k(), 'C0_DN1')).toBe(true);
    expect(isVisible('C', baseDeNovo(), 'C0_DN1')).toBe(true);
    expect(isHidden('C', baseDeNovo({ B3: Answer.Yes }), 'C0_DN1')).toBe(true);
  });

  it('C0_DN2 is hidden unless A1 === "De Novo", B3 !== Yes, and C0_DN1 !== Yes', () => {
    expect(isHidden('C', base510k(), 'C0_DN2')).toBe(true);
    expect(isHidden('C', baseDeNovo({ C0_DN1: Answer.Yes }), 'C0_DN2')).toBe(true);
    expect(isVisible('C', baseDeNovo({ C0_DN1: Answer.No }), 'C0_DN2')).toBe(true);
    expect(isVisible('C', baseDeNovo({ C0_DN1: Answer.Uncertain }), 'C0_DN2')).toBe(true);
    expect(isHidden('C', baseDeNovo({ B3: Answer.Yes }), 'C0_DN2')).toBe(true);
  });
});

describe('PCCP question visibility', () => {
  it('P block only appears when PCCP is active and B3 is not Yes/Uncertain', () => {
    expect(blockIds(base510k())).not.toContain('P');
    expect(blockIds(base510k({ A2: Answer.Yes }))).toContain('P');
    expect(blockIds(base510k({ A2: Answer.Yes, B3: Answer.Yes }))).not.toContain('P');
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
    expect(isHidden('P', pccpBase, 'P4')).toBe(true);
    expect(isVisible('P', { ...pccpBase, P3: Answer.Yes }, 'P4')).toBe(true);
    expect(isHidden('P', { ...pccpBase, P3: Answer.No }, 'P4')).toBe(true);
  });

  it('P5 is hidden unless P1 === Yes, P2 === Yes, P3 === Yes, and P4 === Yes', () => {
    const pccpBase = base510k({ A2: Answer.Yes, P1: Answer.Yes, P2: Answer.Yes, P3: Answer.Yes });
    expect(isHidden('P', pccpBase, 'P5')).toBe(true);
    expect(isVisible('P', { ...pccpBase, P4: Answer.Yes }, 'P5')).toBe(true);
    expect(isHidden('P', { ...pccpBase, P4: Answer.No }, 'P5')).toBe(true);
  });
});

describe('Cumulative drift question visibility', () => {
  it('C10 is hidden when A8 is empty or zero', () => {
    expect(isHidden('C', base510k(), 'C10')).toBe(true);
    expect(isHidden('C', base510k({ A8: '0' }), 'C10')).toBe(true);
  });

  it('C10 is visible when A8 is a nonzero number', () => {
    expect(isVisible('C', base510k({ A8: '3' }), 'C10')).toBe(true);
  });

  it('C11 is hidden unless A1 === "510(k)" and C10 === Yes', () => {
    expect(isHidden('C', base510k({ A8: '3' }), 'C11')).toBe(true);
    expect(isVisible('C', base510k({ A8: '3', C10: Answer.Yes }), 'C11')).toBe(true);
    expect(isHidden('C', base510k({ A8: '3', C10: Answer.No }), 'C11')).toBe(true);
    expect(isHidden('C', baseDeNovo({ A8: '3', C10: Answer.Yes }), 'C11')).toBe(true);
  });
});

describe('PMA-only significance question visibility', () => {
  it('C_PMA1, C_PMA2, C_PMA3 appear for PMA assessments when B3 !== Yes', () => {
    expect(isVisible('C', basePMA(), 'C_PMA1')).toBe(true);
    expect(isVisible('C', basePMA(), 'C_PMA2')).toBe(true);
    expect(isVisible('C', basePMA(), 'C_PMA3')).toBe(true);
  });

  it('C_PMA1 through C_PMA3 are hidden when B3 is Yes', () => {
    expect(isHidden('C', basePMA({ B3: Answer.Yes }), 'C_PMA1')).toBe(true);
    expect(isHidden('C', basePMA({ B3: Answer.Yes }), 'C_PMA2')).toBe(true);
    expect(isHidden('C', basePMA({ B3: Answer.Yes }), 'C_PMA3')).toBe(true);
  });

  it('C_PMA4 appears only when PMA supplement logic is triggered', () => {
    expect(isHidden('C', basePMA(), 'C_PMA4')).toBe(true);
    expect(isVisible('C', basePMA({ C_PMA1: Answer.Yes }), 'C_PMA4')).toBe(true);
    expect(isVisible('C', basePMA({ C_PMA1: Answer.Uncertain }), 'C_PMA4')).toBe(true);
    expect(isHidden('C', basePMA({ C_PMA2: Answer.Yes }), 'C_PMA4')).toBe(true);
    expect(isHidden('C', basePMA({ C_PMA3: Answer.Yes }), 'C_PMA4')).toBe(true);
    expect(isVisible('C', basePMA({ B3: Answer.Yes }), 'C_PMA4')).toBe(true);
  });

  it('510(k) path does not show PMA-only questions', () => {
    const q = getQuestions('C', base510k(), computeDerivedState(base510k()));
    const ids = q.map(x => x.id);
    expect(ids).not.toContain('C_PMA1');
    expect(ids).not.toContain('C_PMA2');
    expect(ids).not.toContain('C_PMA3');
    expect(ids).not.toContain('C_PMA4');
  });
});

describe('GenAI supplemental gating', () => {
  it('GenAI block appears only when A6 includes GenAI types', () => {
    expect(blockIds(base510k())).not.toContain('D');
    expect(blockIds(base510k({ A6: ['LLM / Foundation Model'] }))).toContain('D');
    expect(blockIds(base510k({ A6: ['Generative AI'] }))).toContain('D');
    expect(blockIds(base510k({ A6: ['LLM / Foundation Model', 'Traditional ML (e.g., random forest, SVM)'] }))).toContain('D');
  });
});

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

describe('Intended-use gating on significance questions', () => {
  it('C1 through C6 are all hidden when B3 === Yes (non-PMA)', () => {
    const ans = base510k({ B3: Answer.Yes });
    for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
      expect(isHidden('C', ans, id)).toBe(true);
    }
  });

  it('C1 is visible when B3 === No', () => {
    expect(isVisible('C', base510k(), 'C1')).toBe(true);
  });
});

describe('Significance question cascading skip chain', () => {
  it('C2 is hidden when C1 === Yes', () => {
    expect(isHidden('C', base510k({ C1: Answer.Yes }), 'C2')).toBe(true);
  });

  it('C3 is hidden when C1 === Yes or C2 === Yes', () => {
    expect(isHidden('C', base510k({ C1: Answer.Yes }), 'C3')).toBe(true);
    expect(isHidden('C', base510k({ C2: Answer.Yes }), 'C3')).toBe(true);
    expect(isVisible('C', base510k({ C1: Answer.No, C2: Answer.No }), 'C3')).toBe(true);
  });

  it('C4 is hidden when C3 === Yes', () => {
    expect(isHidden('C', base510k({ C3: Answer.Yes }), 'C4')).toBe(true);
    expect(isVisible('C', base510k({ C3: Answer.No }), 'C4')).toBe(true);
  });

  it('C5 is hidden when C3 or C4 is Yes', () => {
    expect(isHidden('C', base510k({ C3: Answer.Yes }), 'C5')).toBe(true);
    expect(isHidden('C', base510k({ C4: Answer.Yes }), 'C5')).toBe(true);
    expect(isVisible('C', base510k({ C3: Answer.No, C4: Answer.No }), 'C5')).toBe(true);
  });

  it('C6 is hidden when C3, C4, or C5 is Yes', () => {
    expect(isHidden('C', base510k({ C3: Answer.Yes }), 'C6')).toBe(true);
    expect(isHidden('C', base510k({ C5: Answer.Yes }), 'C6')).toBe(true);
    expect(isVisible('C', base510k({ C3: Answer.No, C4: Answer.No, C5: Answer.No }), 'C6')).toBe(true);
  });
});

describe('Bug-fix / cyber-only visibility branches', () => {
  it('when C1=Yes, C2 through C6 are all hidden', () => {
    const ans = base510k({ C1: Answer.Yes });
    for (const id of ['C2', 'C3', 'C4', 'C5', 'C6']) {
      expect(isHidden('C', ans, id)).toBe(true);
    }
  });

  it('when C2=Yes, C3 through C6 are all hidden', () => {
    const ans = base510k({ C1: Answer.No, C2: Answer.Yes });
    for (const id of ['C3', 'C4', 'C5', 'C6']) {
      expect(isHidden('C', ans, id)).toBe(true);
    }
  });
});

describe('Baseline engine tests still pass', () => {
  it('getQuestions returns an array for each known block', () => {
    for (const blockId of ['A', 'B', 'C', 'P', 'D', 'E']) {
      const ans = base510k({ A2: Answer.Yes, A6: ['LLM / Foundation Model'] });
      const ds = computeDerivedState(ans);
      const qs = getQuestions(blockId, ans, ds);
      expect(Array.isArray(qs)).toBe(true);
    }
  });

  it('getQuestions returns an empty array for unknown blocks', () => {
    const ds = computeDerivedState(base510k());
    expect(getQuestions('Z', base510k(), ds)).toEqual([]);
  });
});

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

  it('C1=Uncertain does not skip C2', () => {
    expect(isVisible('C', base510k({ C1: Answer.Uncertain }), 'C2')).toBe(true);
  });

  it('C2=Uncertain does not skip C3', () => {
    expect(isVisible('C', base510k({ C1: Answer.No, C2: Answer.Uncertain }), 'C3')).toBe(true);
  });

  it('C1=Yes still skips C2', () => {
    expect(isHidden('C', base510k({ C1: Answer.Yes }), 'C2')).toBe(true);
  });
});
