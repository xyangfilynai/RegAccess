import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardPage } from '../src/components/DashboardPage';
import { QuestionCard } from '../src/components/QuestionCard';
import { Layout } from '../src/components/Layout';
import { ReviewPanel } from '../src/components/ReviewPanel';
import { Answer, computeDetermination, type Block, type Question } from '../src/lib/assessment-engine';

describe('UI workflow', () => {
  it('prioritizes continuing existing work ahead of starting a new assessment', () => {
    render(
      <DashboardPage
        onQuickReview={() => {}}
        onFullAssessment={() => {}}
        onResume={() => {}}
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
      />
    );

    const resumeButton = screen.getByTestId('resume-btn');
    const fullAssessmentButton = screen.getByTestId('full-assessment-btn');

    expect(screen.getByText('Continue Working')).toBeInTheDocument();
    expect(screen.getByText('Start Assessment')).toBeInTheDocument();
    expect(screen.getByText('Primary workflow')).toBeInTheDocument();
    expect(screen.getByText('Decision traceability')).toBeInTheDocument();
    expect(screen.queryByText('Assessment Workflow')).not.toBeInTheDocument();
    expect(screen.queryByText('Assessment record')).not.toBeInTheDocument();
    expect(screen.queryByText(/JSON artifact/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Decision support only — not a regulatory determination\./i)).toBeInTheDocument();
    expect(
      resumeButton.compareDocumentPosition(fullAssessmentButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps supporting question context collapsed until the user asks for it', () => {
    const question: Question = {
      id: 'UX_TEST',
      q: 'Does the proposed change remain inside the validated operating range?',
      type: 'yesnouncertain',
      help: 'Use the authorized baseline and current validation protocol as the comparison anchor.',
      mlguidance: 'Check whether retraining, threshold tuning, or site shifts alter the validated data envelope.',
      pathwayCritical: true,
    };

    render(
      <QuestionCard
        question={question}
        value={undefined}
        onChange={() => {}}
        index={0}
      />
    );

    expect(screen.getByRole('button', { name: Answer.Yes })).toBeInTheDocument();
    expect(screen.queryByText(/comparison anchor/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /why this question matters and what to verify/i }));

    expect(screen.getByText(/comparison anchor/i)).toBeInTheDocument();
    expect(screen.getByText(/validated data envelope/i)).toBeInTheDocument();
  });

  it('keeps the case snapshot exclusive to the review step', () => {
    const blocks: Block[] = [
      {
        id: 'A',
        label: 'What device are we assessing?',
        shortLabel: 'Device Profile',
        icon: 'shield',
        description: 'Anchor the assessment to the authorized device and baseline.',
      },
      {
        id: 'review',
        label: 'Final review',
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
          { label: 'PCCP', value: 'No PCCP authorized', tone: 'warning' },
        ]}
      >
        <div>Assessment body</div>
      </Layout>
    );

    expect(screen.getByText('Required completion')).toBeInTheDocument();
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
          { label: 'PCCP', value: 'No PCCP authorized', tone: 'warning' },
        ]}
      >
        <div>Assessment body</div>
      </Layout>
    );

    expect(screen.getByText('Authorization')).toBeInTheDocument();
    expect(screen.getByText('All required questions answered')).toBeInTheDocument();
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
        getQuestionsForBlock={() => []}
      />
    );

    expect(screen.getByText(/PCCP application/i)).toBeInTheDocument();
    expect(screen.getByText(/this submission is the right opportunity/i)).toBeInTheDocument();
    expect(screen.getByText('Case Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Current Route')).toBeInTheDocument();
    expect(screen.getByText('Next Step')).toBeInTheDocument();
    expect(screen.getByText('What Still Needs Resolution')).toBeInTheDocument();
    expect(screen.getByText('No authorized PCCP')).toBeInTheDocument();
    expect(screen.getAllByText(/New or modified cause of harm: Uncertain/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Clinical performance impact: Yes/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Detailed Rationale')).toBeInTheDocument();
    expect(screen.queryByText(/Decision support only — not a regulatory determination\./i)).not.toBeInTheDocument();
    expect(screen.queryByText('Export Report')).not.toBeInTheDocument();
    expect(screen.queryByText('Export JSON')).not.toBeInTheDocument();
    expect(screen.queryByText('Save Assessment')).not.toBeInTheDocument();
    expect(screen.getByText('Print Assessment Summary')).toBeInTheDocument();
    expect(screen.queryByText('This summary captures the current route, the immediate next step, and any strategic follow-up to consider before preparing the next package.')).not.toBeInTheDocument();
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
        getQuestionsForBlock={() => []}
      />
    );

    expect(
      screen.getAllByText(/The supporting data is not yet shown to represent the cleared population/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/List each newly added site/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/creates a new or modified cause of harm/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('What Still Needs Resolution')).toBeInTheDocument();
    expect(screen.getByText('Detailed Rationale')).toBeInTheDocument();
    expect(screen.queryByText('Package Requirements')).not.toBeInTheDocument();
    expect(screen.queryByText('Documentation Requirements')).not.toBeInTheDocument();
    expect(screen.queryByText('Regulatory Glossary')).not.toBeInTheDocument();
    expect(screen.queryByText('Response Details')).not.toBeInTheDocument();
  });
});
