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

  it('clears the completion banner if the checklist becomes incomplete again', () => {
    const answers = base510k();
    const determination = computeDetermination(answers);

    render(
      <HandoffPage determination={determination} answers={answers} onBack={() => {}} onBackToAssessment={() => {}} />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      fireEvent.click(checkbox);
    });

    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));
    expect(screen.getByText('Checklist marked complete')).toBeInTheDocument();

    fireEvent.click(checkboxes[0]);

    expect(screen.queryByText('Checklist marked complete')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeDisabled();
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
