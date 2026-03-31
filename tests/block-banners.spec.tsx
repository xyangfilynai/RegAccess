import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Answer, computeDerivedState } from '../src/lib/assessment-engine';
import { BlockBanners } from '../src/components/BlockBanners';
import { base510k, baseDeNovo } from './helpers';

describe('BlockBanners', () => {
  it('shows the incomplete-field warning for the current block', () => {
    const answers = base510k();

    render(
      <BlockBanners
        blockId="A"
        answers={answers}
        derivedState={computeDerivedState(answers)}
        currentBlockComplete={false}
        currentMissingRequired={2}
      />,
    );

    expect(screen.getByText(/2 pathway-critical fields incomplete in this section/i)).toBeInTheDocument();
  });

  it('shows the de novo device-type fit warning when fit is unresolved', () => {
    const answers = baseDeNovo({
      C0_DN1: Answer.No,
      C0_DN2: Answer.Yes,
    });

    render(
      <BlockBanners
        blockId="C"
        answers={answers}
        derivedState={computeDerivedState(answers)}
        currentBlockComplete={true}
        currentMissingRequired={0}
      />,
    );

    expect(screen.getByText(/De Novo device-type fit unresolved/i)).toBeInTheDocument();
  });

  it('shows the PCCP planning heuristic banner for scoped PCCP review blocks', () => {
    const answers = base510k({
      A2: Answer.Yes,
      B1: 'Training Data',
      B2: 'Additional data — new clinical sites',
    });

    render(
      <BlockBanners
        blockId="P"
        answers={answers}
        derivedState={computeDerivedState(answers)}
        currentBlockComplete={true}
        currentMissingRequired={0}
      />,
    );

    expect(
      screen.getByText(/ChangePath PCCP planning heuristic for "Additional data — new clinical sites"/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/May fit a PCCP only if scope, acceptance criteria, and boundaries are explicitly authorized/i),
    ).toBeInTheDocument();
  });
});
