import { createContext, useContext } from 'react';
import type { Block } from '../lib/assessment-engine';
import type { LayoutSummaryItem } from '../components/LayoutSections';

export interface LayoutContextValue {
  blocks: Block[];
  currentBlockIndex: number;
  onBlockSelect: (index: number) => void;
  completedBlocks: Set<string>;
  answeredCounts: Record<string, number>;
  totalCounts: Record<string, number>;
  requiredAnsweredCounts: Record<string, number>;
  requiredCounts: Record<string, number>;
  overallAnswered: number;
  overallTotal: number;
  overallRequiredAnswered: number;
  overallRequiredTotal: number;
  caseSummary: LayoutSummaryItem[];
  onReset?: () => void;
  onHome?: () => void;
  onSaveAssessment?: () => void;
  canSaveAssessment: boolean;
  saveLabel: string;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutContext(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutContext must be used within a LayoutContext.Provider');
  return ctx;
}
