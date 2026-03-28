import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardPage } from '../src/components/DashboardPage';
import { QuestionCard } from '../src/components/QuestionCard';
import { Layout } from '../src/components/Layout';
import { ReviewPanel } from '../src/components/ReviewPanel';
import { App } from '../src/App';
import { assessmentStore } from '../src/lib/assessment-store';
import { Answer, computeDetermination, type Block, type AssessmentField } from '../src/lib/assessment-engine';
import { storage } from '../src/lib/storage';
import { SAMPLE_CASES } from '../src/sample-cases';

describe('UI workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'scrollTo', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('prioritizes continuing existing work ahead of starting a new assessment', () => {
    render(
      <DashboardPage
        onFullAssessment={() => {}}
        onResume={() => {}}
        sampleCases={SAMPLE_CASES}
        onOpenSampleCase={() => {}}
        hasSavedSession
        savedAssessments={[
          {
            id: 'case-1',
            name: 'Chest CT model drift review',
            answers: {},
            blockIndex: 2,
            lastPathway: 'New Submission Required',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-05T00:00:00.000Z',
            versions: [],
            reviewerNotes: [],
          },
        ]}
        onLoadAssessment={() => {}}
      />,
    );

    const resumeButton = screen.getByTestId('resume-btn');
    const fullAssessmentButton = screen.getByTestId('full-assessment-btn');

    expect(screen.getByText('Resume current assessment')).toBeInTheDocument();
    expect(screen.getByText('Start full assessment')).toBeInTheDocument();
    expect(screen.getByText('Sample library')).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_CASES[0].title)).toBeInTheDocument();
    expect(screen.getByTestId(`sample-case-open-${SAMPLE_CASES[0].id}`)).toBeInTheDocument();
    expect(screen.getByText(/browse nine realistic ai\/ml change-review scenarios/i)).toBeInTheDocument();
    expect(screen.getAllByText('Expected outcome').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tags').length).toBeGreaterThan(0);
    expect(screen.getByText(SAMPLE_CASES[0].tags[0])).toBeInTheDocument();
    expect(resumeButton.compareDocumentPosition(fullAssessmentButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('preserves the resumable browser draft when a sample is opened', () => {
    const savedAnswers = {
      A1: '510(k)',
      A1b: 'K009999',
      A1c: 'Saved live draft',
      A2: 'No',
    };

    storage.saveAnswers(savedAnswers);
    storage.saveBlockIndex(2);

    render(<App />);

    fireEvent.click(screen.getByTestId(`sample-case-open-${SAMPLE_CASES[0].id}`));

    expect(storage.loadAnswers()).toEqual(savedAnswers);
    expect(storage.loadBlockIndex()).toBe(2);
  });

  it('saves the current assessment into the dashboard library', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('full-assessment-btn'));
    fireEvent.click(screen.getByRole('button', { name: '510(k)' }));
    fireEvent.click(screen.getByTestId('save-assessment-btn'));
    fireEvent.click(screen.getByTitle('Return to dashboard'));

    expect(screen.getByText('Saved assessments')).toBeInTheDocument();
    expect(screen.getByText('Assessment - 510(k)')).toBeInTheDocument();
    expect(screen.getByText(/saved library records preserve structured review context/i)).toBeInTheDocument();
  });

  it('keeps the resumable browser draft intact when a saved library record is opened', () => {
    storage.saveAnswers({
      A1: '510(k)',
      A1b: 'K009999',
      A1c: 'Live draft',
      A2: 'No',
    });
    storage.saveBlockIndex(2);

    assessmentStore.save({
      name: 'Saved library assessment',
      answers: {
        A1: 'PMA',
        A1b: 'P123456',
        A1c: 'Library record',
        A2: 'No',
      },
      blockIndex: 1,
      lastPathway: 'PMA Annual Report',
    });

    render(<App />);

    fireEvent.click(screen.getByText('Open'));

    expect(storage.loadAnswers()).toEqual({
      A1: '510(k)',
      A1b: 'K009999',
      A1c: 'Live draft',
      A2: 'No',
    });
    expect(storage.loadBlockIndex()).toBe(2);
  });

  it('keeps supporting field context collapsed until the user asks for it', () => {
    const field: AssessmentField = {
      id: 'UX_TEST',
      q: 'Does the proposed change remain inside the validated operating range?',
      type: 'yesnouncertain',
      help: 'Use the authorized baseline and current validation protocol as the comparison anchor.',
      mlguidance: 'Check whether retraining, threshold tuning, or site shifts alter the validated data envelope.',
      pathwayCritical: true,
    };

    render(<QuestionCard field={field} value={undefined} onChange={() => {}} index={0} />);

    expect(screen.getByRole('button', { name: Answer.Yes })).toBeInTheDocument();
    expect(screen.queryByText(/comparison anchor/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /rationale and verification notes/i }));

    expect(screen.getByText(/comparison anchor/i)).toBeInTheDocument();
    expect(screen.getByText(/validated data envelope/i)).toBeInTheDocument();
  });

  it('keeps the case snapshot exclusive to the review step', () => {
    const blocks: Block[] = [
      {
        id: 'A',
        label: 'Device under assessment',
        shortLabel: 'Device profile',
        icon: 'shield',
        description: 'Anchor the assessment to the authorized device and baseline.',
      },
      {
        id: 'review',
        label: 'Assessment record',
        shortLabel: 'Review',
        icon: 'check',
      },
    ];

    const { rerender } = render(
      <Layout
        blocks={blocks}
        currentBlockIndex={0}
        onBlockSelect={() => {}}
        completedBlocks={new Set()}
        answeredCounts={{ A: 3, review: 0 }}
        totalCounts={{ A: 5, review: 0 }}
        requiredAnsweredCounts={{ A: 2, review: 0 }}
        requiredCounts={{ A: 4, review: 0 }}
        overallAnswered={3}
        overallTotal={5}
        overallRequiredAnswered={2}
        overallRequiredTotal={4}
        caseSummary={[
          { label: 'Authorization', value: '510(k)' },
          { label: 'Authorized baseline', value: 'v4.2 cleared build' },
          { label: 'PCCP', value: 'No authorized PCCP', tone: 'warning' },
        ]}
      >
        <div>Assessment body</div>
      </Layout>,
    );

    expect(screen.getByText('Pathway-critical')).toBeInTheDocument();
    expect(screen.getAllByText('2/4').length).toBeGreaterThan(0);
    expect(screen.queryByText('Authorization')).not.toBeInTheDocument();

    rerender(
      <Layout
        blocks={blocks}
        currentBlockIndex={1}
        onBlockSelect={() => {}}
        completedBlocks={new Set(['A'])}
        answeredCounts={{ A: 5, review: 0 }}
        totalCounts={{ A: 5, review: 0 }}
        requiredAnsweredCounts={{ A: 4, review: 0 }}
        requiredCounts={{ A: 4, review: 0 }}
        overallAnswered={5}
        overallTotal={5}
        overallRequiredAnswered={4}
        overallRequiredTotal={4}
        caseSummary={[
          { label: 'Authorization', value: '510(k)' },
          { label: 'Authorized baseline', value: 'v4.2 cleared build' },
          { label: 'PCCP', value: 'No authorized PCCP', tone: 'warning' },
        ]}
      >
        <div>Assessment body</div>
      </Layout>,
    );

    expect(screen.getByText('Authorization')).toBeInTheDocument();
    expect(screen.getByText('All pathway-critical fields complete')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/working title/i)).not.toBeInTheDocument();
  });

  it('surfaces PCCP recommendation in the review hero and removes export/save actions', () => {
    const answers = {
      A1: '510(k)',
      A1b: 'K123456',
      A1c: 'v4.2 cleared build',
      A1d: 'Authorized IFU summary',
      A2: 'No',
      B1: 'Training Data',
      B2: 'Additional data — new clinical sites',
      B4: 'The submitted change description reports lower sensitivity on Canon scanners and higher false-positive rates in older patients with chronic lung disease.',
      B3: 'No',
      C1: 'No',
      C2: 'No',
      C3: 'Uncertain',
      C4: 'No',
      C5: 'No',
      C6: 'Yes',
      E1: 'Yes',
      E2: 'Yes',
    } as const;

    render(
      <ReviewPanel
        determination={computeDetermination(answers)}
        answers={answers}
        blocks={[]}
        getFieldsForBlock={() => []}
      />,
    );

    expect(screen.getByText(/Consider a PCCP|Evaluate PCCP/i)).toBeInTheDocument();
    expect(screen.getByText(/next submission to assess whether PCCP is viable/i)).toBeInTheDocument();
    expect(screen.getByText('Assessment Basis')).toBeInTheDocument();
    expect(screen.getByText('Decision Trace')).toBeInTheDocument();
    expect(screen.getByText('Open Issues')).toBeInTheDocument();
    expect(screen.getAllByText(/New or modified cause of harm: Uncertain/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Decision support only — not a regulatory determination\./i)).not.toBeInTheDocument();
    expect(screen.queryByText('Export JSON')).not.toBeInTheDocument();
    expect(screen.queryByText('Save Assessment')).not.toBeInTheDocument();
    expect(screen.getByText('Export Report')).toBeInTheDocument();
  });

  it('renders evidence gaps as case-specific evidence requests instead of generic notes', () => {
    const answers = {
      A1: '510(k)',
      A1b: 'K123456',
      A1c: 'v4.2 cleared build',
      A1d: 'Authorized IFU summary',
      A2: 'No',
      B1: 'Training Data',
      B2: 'Additional data — new clinical sites',
      B4: 'Adds data from three new hospitals using Canon scanners and a broader protocol mix.',
      B3: 'No',
      C1: 'No',
      C2: 'No',
      C3: 'Uncertain',
      C4: 'No',
      C5: 'No',
      C6: 'Yes',
      E1: 'No',
      E2: 'No',
    };

    render(
      <ReviewPanel
        determination={computeDetermination(answers)}
        answers={answers}
        blocks={[]}
        getFieldsForBlock={() => []}
      />,
    );

    expect(
      screen.getAllByText(/The supporting data is not yet shown to represent the cleared population/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/List each newly added site/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/creates a new or modified cause of harm/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Assessment Basis')).toBeInTheDocument();
    expect(screen.getByText('Decision Trace')).toBeInTheDocument();
    expect(screen.getByText('Open Issues')).toBeInTheDocument();
    expect(screen.queryByText('Package Requirements')).not.toBeInTheDocument();
    expect(screen.queryByText('Documentation Requirements')).not.toBeInTheDocument();
    expect(screen.queryByText('Regulatory Glossary')).not.toBeInTheDocument();
    expect(screen.queryByText('Response Details')).not.toBeInTheDocument();
  });
});
