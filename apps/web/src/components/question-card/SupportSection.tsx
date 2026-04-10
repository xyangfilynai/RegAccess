/**
 * Collapsible "Rationale and verification notes" section for QuestionCard.
 *
 * Contains regulatory context, AI/ML guidance, info notes, and classification guidance
 * for a single assessment field.
 */

import React, { useState } from 'react';
import { Icon } from '../Icon';
import { HelpTextWithLinks, AuthorityTag, GuidanceRef } from '../ui';
import { NoteBox } from './NoteBox';
import { hasSupportingContext } from './field-support';
import type { AssessmentField } from '../../lib/assessment-engine';

interface FieldReasoning {
  title?: string;
  text: string;
  status?: string;
  verify?: string;
  counter?: string;
  source?: string;
}

interface SupportSectionProps {
  field: AssessmentField;
  qReasoning: FieldReasoning | undefined;
}

export const SupportSection: React.FC<SupportSectionProps> = ({ field, qReasoning }) => {
  const [showSupport, setShowSupport] = useState(false);

  if (!hasSupportingContext(field, qReasoning)) return null;

  return (
    <div style={{ marginTop: 'var(--space-sm)' }}>
      <button
        onClick={() => setShowSupport(!showSupport)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          width: '100%',
          padding: '10px 12px',
          borderRadius: showSupport ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
          background: showSupport ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'left',
        }}
      >
        <Icon name="book" size={14} color="var(--color-primary)" />
        <span style={{ flex: 1 }}>Rationale and verification notes</span>
        {(qReasoning?.status || field.mlguidance) && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {qReasoning?.status && <AuthorityTag level={qReasoning.status.toLowerCase().replace(' ', '_')} compact />}
            {field.mlguidance && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'var(--color-info-bg)',
                  color: 'var(--color-info)',
                  border: '1px solid var(--color-info-border)',
                }}
              >
                AI/ML
              </span>
            )}
          </span>
        )}
        <Icon name={showSupport ? 'arrowUp' : 'arrowDown'} size={12} />
      </button>

      {showSupport && (
        <div
          className="animate-fade-in"
          style={{
            padding: 'var(--space-md)',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
            background: 'var(--color-bg-hover)',
            borderLeft: '1px solid var(--color-border)',
            borderRight: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            marginTop: -1,
          }}
        >
          {field.help && (
            <div
              style={{
                marginBottom: 'var(--space-md)',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.7,
              }}
            >
              <HelpTextWithLinks text={field.help} />
            </div>
          )}

          {qReasoning && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>
                  {qReasoning.title || 'Regulatory Context'}
                </strong>
                {qReasoning.status && (
                  <AuthorityTag level={qReasoning.status.toLowerCase().replace(' ', '_')} compact />
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                <HelpTextWithLinks text={qReasoning.text} />
              </div>
              {qReasoning.verify && (
                <div
                  style={{
                    marginTop: 'var(--space-sm)',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-border)',
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: 'var(--color-success)' }}>Verify:</strong>{' '}
                  <HelpTextWithLinks text={qReasoning.verify} />
                </div>
              )}
              {qReasoning.counter && (
                <div
                  style={{
                    marginTop: 'var(--space-sm)',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning-border)',
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: 'var(--color-warning)' }}>Counterpoint:</strong>{' '}
                  <HelpTextWithLinks text={qReasoning.counter} />
                </div>
              )}
              {qReasoning.source && (
                <div
                  style={{
                    marginTop: 'var(--space-sm)',
                    fontSize: 10,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Source: <GuidanceRef code={qReasoning.source} />
                </div>
              )}
            </div>
          )}

          {field.mlguidance && (
            <NoteBox variant="info" icon="cpu" label="AI/ML Guidance">
              <HelpTextWithLinks text={field.mlguidance} />
            </NoteBox>
          )}

          {field.infoNote && (
            <NoteBox variant="success" icon="info">
              <HelpTextWithLinks text={field.infoNote} />
            </NoteBox>
          )}

          {field.classificationGuidance && (
            <NoteBox variant="neutral" label="Classification Guidance">
              <HelpTextWithLinks text={field.classificationGuidance} />
            </NoteBox>
          )}
        </div>
      )}
    </div>
  );
};
