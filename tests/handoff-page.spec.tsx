import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Answer, computeDetermination } from '../src/lib/assessment-engine';
import { HandoffPage } from '../src/components/HandoffPage';
import { base510k, baseDeNovo } from './helpers';

describe('HandoffPage', () => {
  it('shows the incomplete state when pathway-critical fields are unresolved', () => {
    const answers = base510k({ B3: Answer.Uncertain });
    const determination = computeDetermination(answers);

    expect(determination.isIncomplete).toBe(true);

    render(
      <HandoffPage determination={determination} answers={answers} onBack={() => {}} onBackToAssessment={() => {}} />,
    );

    expect(screen.getByText('Assessment incomplete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to Assessment' })).toBeInTheDocument();
  });

  it('lets reviewers complete every checklist item and mark the handoff complete', () => {
    const answers = base510k();
    const determination = computeDetermination(answers);

    render(
      <HandoffPage determination={determination} answers={answers} onBack={() => {}} onBackToAssessment={() => {}} />,
    );

    screen.getAllByRole('checkbox').forEach((checkbox) => {
      fireEvent.click(checkbox);
    });

    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    expect(screen.getByText('Checklist marked complete')).toBeInTheDocument();
    expect(screen.getByText(/Record completion in your QMS change control/i)).toBeInTheDocument();
  });

  it('surfaces the q-sub advisory for new submission handoffs', () => {
    const answers = baseDeNovo({ B3: Answer.Yes });
    const determination = computeDetermination(answers);

    expect(determination.isNewSub).toBe(true);

    render(
      <HandoffPage determination={determination} answers={answers} onBack={() => {}} onBackToAssessment={() => {}} />,
    );

    expect(screen.getByText(/Pre-Submission \(Q-Sub\) Highly advisable/i)).toBeInTheDocument();
  });
});
