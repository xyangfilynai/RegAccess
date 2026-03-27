import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackSurvey } from '../src/components/FeedbackSurvey';
import * as feedbackServiceModule from '../src/lib/feedback-service';

// Mock CSS custom properties for jsdom
beforeEach(() => {
  // Clear localStorage between tests
  localStorage.clear();
});

describe('FeedbackSurvey', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    onBack.mockReset();
  });

  it('renders the survey form with all always-visible fields', () => {
    render(<FeedbackSurvey onBack={onBack} />);
    expect(screen.getByText('Assessment feedback')).toBeInTheDocument();
    expect(screen.getByText(/determined pathway match your expectation/i)).toBeInTheDocument();
    expect(screen.getByText(/challenge or refine/i)).toBeInTheDocument();
    expect(screen.getByText(/increase your confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/How would you use ChangePath/i)).toBeInTheDocument();
    expect(screen.getByText(/most and least helpful/i)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up interest/i)).toBeInTheDocument();
  });

  it('does not show Q1b initially', () => {
    render(<FeedbackSurvey onBack={onBack} />);
    expect(screen.queryByTestId('q1b-section')).not.toBeInTheDocument();
  });

  it('shows Q1b when "Partly" is selected', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    const radio = screen.getByLabelText(/Partly — I would qualify/);
    await userEvent.click(radio);
    expect(screen.getByTestId('q1b-section')).toBeInTheDocument();
  });

  it('shows Q1b when "No, I would have reached a different conclusion" is selected', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    const radio = screen.getByLabelText(/No — I would reach a different conclusion/);
    await userEvent.click(radio);
    expect(screen.getByTestId('q1b-section')).toBeInTheDocument();
  });

  it('does not show Q1b for "Yes" or "Mostly"', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    await userEvent.click(screen.getByLabelText(/Yes — matches my conclusion/));
    expect(screen.queryByTestId('q1b-section')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Mostly — minor/));
    expect(screen.queryByTestId('q1b-section')).not.toBeInTheDocument();
  });

  it('does not show Q4b initially', () => {
    render(<FeedbackSurvey onBack={onBack} />);
    expect(screen.queryByTestId('q4b-section')).not.toBeInTheDocument();
  });

  it('shows Q4b when "Other" is checked in Q4', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    const otherCheckbox = screen.getByLabelText('Other');
    await userEvent.click(otherCheckbox);
    expect(screen.getByTestId('q4b-section')).toBeInTheDocument();
  });

  it('does not show Q7 or Q8 initially', () => {
    render(<FeedbackSurvey onBack={onBack} />);
    expect(screen.queryByTestId('q7-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('q8-section')).not.toBeInTheDocument();
  });

  it('shows Q7 and Q8 when a follow-up interest is selected (not "Not at this time")', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    await userEvent.click(screen.getByLabelText(/Early access/));
    expect(screen.getByTestId('q7-section')).toBeInTheDocument();
    expect(screen.getByTestId('q8-section')).toBeInTheDocument();
  });

  it('does not show Q7/Q8 when only "Not at this time" is selected', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    await userEvent.click(screen.getByLabelText(/Not at this time/));
    expect(screen.queryByTestId('q7-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('q8-section')).not.toBeInTheDocument();
  });

  it('shows Q7/Q8 when "Not at this time" plus another option are selected', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    await userEvent.click(screen.getByLabelText(/Not at this time/));
    await userEvent.click(screen.getByLabelText(/A longer pilot/));
    expect(screen.getByTestId('q7-section')).toBeInTheDocument();
    expect(screen.getByTestId('q8-section')).toBeInTheDocument();
  });

  it('submits and shows thank-you state', async () => {
    vi.spyOn(feedbackServiceModule.feedbackService, 'submit').mockResolvedValue({ ok: true });
    render(<FeedbackSurvey onBack={onBack} />);
    await userEvent.click(screen.getByTestId('feedback-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('feedback-thankyou')).toBeInTheDocument();
    });
    expect(screen.getByText(/Feedback received/)).toBeInTheDocument();
  });

  it('"Back to Review" calls onBack without corrupting state', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    await userEvent.click(screen.getByTestId('feedback-skip'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('"Skip" button calls onBack', async () => {
    render(<FeedbackSurvey onBack={onBack} />);
    await userEvent.click(screen.getByText('Skip'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('"Back to final review" from thank-you calls onBack', async () => {
    vi.spyOn(feedbackServiceModule.feedbackService, 'submit').mockResolvedValue({ ok: true });
    render(<FeedbackSurvey onBack={onBack} />);
    await userEvent.click(screen.getByTestId('feedback-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('feedback-thankyou')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Back to final review'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
