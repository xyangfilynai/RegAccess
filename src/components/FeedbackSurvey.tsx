import React, { useState } from 'react';
import { Icon } from './Icon';
import {
  type FeedbackFormData,
  type Q1Option,
  type Q4Option,
  type Q6Option,
  Q1_OPTIONS,
  Q1_FOLLOWUP_TRIGGERS,
  Q4_OPTIONS,
  Q6_OPTIONS,
  shouldShowContact,
  shouldShowReferral,
  createEmptyForm,
} from '../lib/feedback-types';
import { feedbackService } from '../lib/feedback-service';

interface FeedbackSurveyProps {
  onBack: () => void;
}

type SurveyState = 'form' | 'submitting' | 'thankyou' | 'error';

export const FeedbackSurvey: React.FC<FeedbackSurveyProps> = ({ onBack }) => {
  const [form, setForm] = useState<FeedbackFormData>(createEmptyForm);
  const [state, setState] = useState<SurveyState>('form');

  const update = <K extends keyof FeedbackFormData>(key: K, value: FeedbackFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleMulti = <T extends string>(key: 'q4_use_cases' | 'q6_followup', option: T) => {
    setForm(prev => {
      const current = prev[key] as T[];
      const next = current.includes(option)
        ? current.filter(v => v !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('submitting');
    try {
      const result = await feedbackService.submit({
        submittedAt: new Date().toISOString(),
        formData: form,
      });
      setState(result.ok ? 'thankyou' : 'error');
    } catch {
      setState('error');
    }
  };

  // --- Thank-you state ---
  if (state === 'thankyou') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-xl)' }}>
        <div
          data-testid="feedback-thankyou"
          style={{
            textAlign: 'center',
            padding: 'var(--space-xl)',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-success-bg)',
            border: '2px solid var(--color-success-border)',
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--color-success)',
            marginBottom: 'var(--space-md)',
          }}>
            <Icon name="checkCircle" size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 var(--space-sm)' }}>
            Thank you for your feedback
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 var(--space-lg)' }}>
            Your input helps us improve the assessment experience. We'll review your responses carefully.
          </p>
          <button onClick={onBack} style={btnSecondary}>
            <Icon name="arrowLeft" size={16} />
            Return to Review
          </button>
        </div>
      </div>
    );
  }

  // --- Form state ---
  const showQ1b = Q1_FOLLOWUP_TRIGGERS.includes(form.q1_conclusion as Q1Option);
  const showQ4b = form.q4_use_cases.includes('Other');
  const showQ7 = shouldShowContact(form.q6_followup);
  const showQ8 = shouldShowReferral(form.q6_followup);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--space-xl) var(--space-lg)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <button onClick={onBack} style={{ ...btnGhost, marginBottom: 'var(--space-md)' }} data-testid="feedback-skip">
          <Icon name="arrowLeft" size={16} />
          Back to Review
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 var(--space-sm)' }}>
          Share Your Feedback
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Help us understand how well this assessment matched your expectations and how we can improve.
          All fields are optional — share as much or as little as you'd like.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Q1 */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Did the assessment reach the conclusion you expected?</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {Q1_OPTIONS.map(option => (
              <label key={option} style={radioLabel}>
                <input
                  type="radio"
                  name="q1_conclusion"
                  value={option}
                  checked={form.q1_conclusion === option}
                  onChange={() => update('q1_conclusion', option)}
                  style={radioInput}
                />
                <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Q1b — conditional */}
        {showQ1b && (
          <fieldset style={fieldsetStyle} data-testid="q1b-section">
            <legend style={legendStyle}>How would you qualify it differently?</legend>
            <textarea
              value={form.q1b_qualify}
              onChange={e => update('q1b_qualify', e.target.value)}
              placeholder="Describe how your conclusion differs..."
              style={textareaStyle}
              rows={3}
            />
          </fieldset>
        )}

        {/* Q2 */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Is there anything in the reasoning you would push back on?</legend>
          <textarea
            value={form.q2_pushback}
            onChange={e => update('q2_pushback', e.target.value)}
            placeholder="Any reasoning you'd challenge or refine..."
            style={textareaStyle}
            rows={3}
          />
        </fieldset>

        {/* Q3 */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>What additional information or features would improve your confidence in the assessment?</legend>
          <textarea
            value={form.q3_confidence}
            onChange={e => update('q3_confidence', e.target.value)}
            placeholder="Citations, comparisons, additional context..."
            style={textareaStyle}
            rows={3}
          />
        </fieldset>

        {/* Q4 */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>How would you use RegAccess?</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {Q4_OPTIONS.map(option => (
              <label key={option} style={radioLabel}>
                <input
                  type="checkbox"
                  checked={form.q4_use_cases.includes(option)}
                  onChange={() => toggleMulti('q4_use_cases', option as Q4Option)}
                  style={radioInput}
                />
                <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Q4b — conditional */}
        {showQ4b && (
          <fieldset style={fieldsetStyle} data-testid="q4b-section">
            <legend style={legendStyle}>Please describe your use case</legend>
            <textarea
              value={form.q4b_other}
              onChange={e => update('q4b_other', e.target.value)}
              placeholder="Describe how you'd use RegAccess..."
              style={textareaStyle}
              rows={2}
            />
          </fieldset>
        )}

        {/* Q5 */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>What was most helpful — or least helpful — about this experience?</legend>
          <textarea
            value={form.q5_helpful}
            onChange={e => update('q5_helpful', e.target.value)}
            placeholder="Share what stood out, positively or negatively..."
            style={textareaStyle}
            rows={3}
          />
        </fieldset>

        {/* Q6 */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Would you be interested in any of the following?</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {Q6_OPTIONS.map(option => (
              <label key={option} style={radioLabel}>
                <input
                  type="checkbox"
                  checked={form.q6_followup.includes(option)}
                  onChange={() => toggleMulti('q6_followup', option as Q6Option)}
                  style={radioInput}
                />
                <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Q7 — conditional contact info */}
        {showQ7 && (
          <fieldset style={fieldsetStyle} data-testid="q7-section">
            <legend style={legendStyle}>Contact Information</legend>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 var(--space-md)', lineHeight: 1.5 }}>
              So we can follow up on the interests you selected above.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <label style={inputLabel}>
                Name
                <input
                  type="text"
                  value={form.q7_contact.name}
                  onChange={e => update('q7_contact', { ...form.q7_contact, name: e.target.value })}
                  style={inputStyle}
                  placeholder="Your name"
                />
              </label>
              <label style={inputLabel}>
                Email
                <input
                  type="email"
                  value={form.q7_contact.email}
                  onChange={e => update('q7_contact', { ...form.q7_contact, email: e.target.value })}
                  style={inputStyle}
                  placeholder="you@example.com"
                />
              </label>
              <label style={inputLabel}>
                Organization
                <input
                  type="text"
                  value={form.q7_contact.organization}
                  onChange={e => update('q7_contact', { ...form.q7_contact, organization: e.target.value })}
                  style={inputStyle}
                  placeholder="Your organization"
                />
              </label>
            </div>
          </fieldset>
        )}

        {/* Q8 — conditional referral */}
        {showQ8 && (
          <fieldset style={fieldsetStyle} data-testid="q8-section">
            <legend style={legendStyle}>Know someone who might benefit from RegAccess?</legend>
            <textarea
              value={form.q8_referral}
              onChange={e => update('q8_referral', e.target.value)}
              placeholder="Name, email, or any context that would help us reach out..."
              style={textareaStyle}
              rows={2}
            />
          </fieldset>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'var(--space-xl)',
          paddingTop: 'var(--space-lg)',
          borderTop: '1px solid var(--color-border)',
        }}>
          <button type="button" onClick={onBack} style={btnSecondary}>
            Skip
          </button>
          <button
            type="submit"
            disabled={state === 'submitting'}
            style={{
              ...btnPrimary,
              opacity: state === 'submitting' ? 0.6 : 1,
              cursor: state === 'submitting' ? 'not-allowed' : 'pointer',
            }}
            data-testid="feedback-submit"
          >
            {state === 'submitting' ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>

        {state === 'error' && (
          <div style={{
            marginTop: 'var(--space-md)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            fontSize: 13,
            color: 'var(--color-danger)',
          }}>
            Something went wrong. Please try again.
          </div>
        )}
      </form>
    </div>
  );
};

/* ── Shared inline styles ── */

const fieldsetStyle: React.CSSProperties = {
  border: 'none',
  margin: '0 0 var(--space-lg)',
  padding: 0,
};

const legendStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: 'var(--space-md)',
  padding: 0,
  lineHeight: 1.4,
};

const radioLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-sm)',
  cursor: 'pointer',
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: '#fff',
  transition: 'border-color var(--transition-fast)',
};

const radioInput: React.CSSProperties = {
  marginTop: 3,
  flexShrink: 0,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: '#fff',
  fontSize: 14,
  fontFamily: 'inherit',
  lineHeight: 1.5,
  resize: 'vertical',
  boxSizing: 'border-box',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: '#fff',
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const inputLabel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
};

const btnPrimary: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-primary)',
  border: 'none',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
};

const btnSecondary: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: 'var(--radius-md)',
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
};

const btnGhost: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-xs)',
  padding: '4px 0',
  background: 'none',
  border: 'none',
  color: 'var(--color-text-muted)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};
