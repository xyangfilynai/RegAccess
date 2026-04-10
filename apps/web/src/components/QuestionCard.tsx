import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { HelpTextWithLinks } from './ui';
import type { AssessmentField, AnswerValue } from '../lib/assessment-engine';
import { fieldReasoningLibrary } from '../lib/content';
import {
  NoteBox,
  YesNoInput,
  RadioInput,
  CheckboxInput,
  TextInput,
  NumericInput,
  SupportSection,
  hasSupportingContext,
} from './question-card';

/* ------------------------------------------------------------------ */
/*  Field tag badge (inline after question text)                       */
/* ------------------------------------------------------------------ */

const TAG_BASE_STYLE: React.CSSProperties = {
  display: 'inline',
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  marginLeft: 6,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};

interface TagConfig {
  label: string;
  bg: string;
  color: string;
  border: string;
}

const FieldTag: React.FC<TagConfig> = ({ label, bg, color, border }) => (
  <span style={{ ...TAG_BASE_STYLE, background: bg, color, border: `1px solid ${border}` }}>{label}</span>
);

/* ------------------------------------------------------------------ */
/*  QuestionCard                                                       */
/* ------------------------------------------------------------------ */

interface QuestionCardProps {
  field: AssessmentField;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  index: number;
  hasValidationError?: boolean;
}

/**
 * Generic shallow-equal for AssessmentField objects.
 * Compares all own enumerable keys so it stays correct automatically
 * when new fields are added to the AssessmentField interface.
 */
function areFieldsShallowEqual(a: AssessmentField, b: AssessmentField): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a) as (keyof AssessmentField)[];
  const keysB = Object.keys(b) as (keyof AssessmentField)[];
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.is(a[key], b[key]));
}

export const QuestionCard: React.FC<QuestionCardProps> = React.memo(
  ({ field, value, onChange, index, hasValidationError = false }) => {
    const [localText, setLocalText] = useState<string>(
      typeof value === 'string' || typeof value === 'number' ? String(value) : '',
    );
    const consequencePreview =
      typeof field.consequencePreview === 'object' && field.consequencePreview !== null
        ? field.consequencePreview
        : null;
    const hasForcedValue = field.forcedValue !== undefined && field.forcedValue !== null && field.forcedValue !== '';

    const qReasoning = fieldReasoningLibrary[field.id];

    useEffect(() => {
      setLocalText(typeof value === 'string' || typeof value === 'number' ? String(value) : '');
    }, [value]);

    // Section divider rendering
    if (field.sectionDivider) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-lg) 0',
            marginBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={field.icon || 'info'} size={18} color="var(--color-primary)" />
          </div>
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text)',
                margin: 0,
              }}
            >
              {field.label}
            </h3>
            {field.sublabel && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  margin: '4px 0 0 0',
                }}
              >
                {field.sublabel}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Skip hidden fields
    if (field.skip) return null;

    const isCritical = field.critical || field.pathwayCritical;
    const hasValue = Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '');

    const hasSupport = hasSupportingContext(field, qReasoning);

    // Commit text value on blur
    const commitText = () => {
      if (localText !== value) {
        onChange(localText);
      }
    };

    // Render input based on field type
    const renderInput = () => {
      switch (field.type) {
        case 'yesno':
        case 'yesnouncertain':
          return (
            <YesNoInput
              value={value}
              onChange={onChange}
              includeUncertain={field.type === 'yesnouncertain'}
              disabled={field.disabled}
            />
          );

        case 'single':
          return (
            <RadioInput value={value} onChange={onChange} options={field.options || []} disabled={field.disabled} />
          );

        case 'multi':
          return <CheckboxInput value={value} onChange={onChange} options={field.options || []} />;

        case 'text':
          return (
            <TextInput
              localText={localText}
              onLocalTextChange={setLocalText}
              onBlur={commitText}
              hasValidationError={hasValidationError}
              placeholder={field.q?.includes('Paste') ? 'Paste or type your answer...' : undefined}
            />
          );

        case 'numeric':
          return (
            <NumericInput
              localText={localText}
              onLocalTextChange={setLocalText}
              onBlur={commitText}
              hasValidationError={hasValidationError}
              placeholder={field.id === 'A8' ? 'e.g., 0, 5, 12' : undefined}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div
        className="animate-fade-in-up"
        style={{
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          border: field.disabled
            ? '1px dashed var(--color-border)'
            : hasValidationError
              ? '1px solid var(--color-danger)'
              : '1px solid var(--color-border)',
          background: field.disabled ? '#f8fafc' : '#ffffff',
          marginBottom: 'var(--space-md)',
          animationDelay: `${index * 50}ms`,
          animationFillMode: 'backwards',
          opacity: field.disabled ? 0.7 : 1,
          position: 'relative',
          boxShadow: field.disabled
            ? 'none'
            : hasValidationError
              ? '0 0 0 3px rgba(239, 68, 68, 0.12)'
              : '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Disabled overlay */}
        {field.disabled && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              fontSize: 10,
              color: 'var(--color-text-muted)',
            }}
          >
            <Icon name="alert" size={12} />
            Skipped — not applicable based on earlier answers
          </div>
        )}

        {/* Field header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
          }}
        >
          {/* Status indicator */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: hasValidationError
                ? 'var(--color-danger-bg)'
                : hasValue
                  ? 'var(--color-success-bg)'
                  : isCritical
                    ? 'var(--color-warning-bg)'
                    : 'var(--color-bg-hover)',
              border: `1px solid ${
                hasValidationError
                  ? 'var(--color-danger-border)'
                  : hasValue
                    ? 'var(--color-success-border)'
                    : isCritical
                      ? 'var(--color-warning-border)'
                      : 'var(--color-border)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {hasValidationError ? (
              <Icon name="alertCircle" size={14} color="var(--color-danger)" />
            ) : hasValue ? (
              <Icon name="check" size={14} color="var(--color-success)" />
            ) : isCritical ? (
              <Icon name="alertCircle" size={14} color="var(--color-warning)" />
            ) : (
              <Icon name="info" size={14} color="var(--color-text-muted)" />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ lineHeight: 1.5 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{field.q}</span>

              {field.pathwayCritical && (
                <FieldTag
                  label="Pathway-critical"
                  bg="var(--color-danger-bg)"
                  color="var(--color-danger)"
                  border="var(--color-danger-border)"
                />
              )}
              {field.critical && !field.pathwayCritical && (
                <FieldTag
                  label="Critical"
                  bg="var(--color-warning-bg)"
                  color="var(--color-warning)"
                  border="var(--color-warning-border)"
                />
              )}
              {field.draftRef && (
                <FieldTag
                  label="Draft Guidance"
                  bg="var(--color-info-bg)"
                  color="var(--color-info)"
                  border="var(--color-info-border)"
                />
              )}
              {field.dynamic && (
                <FieldTag
                  label="Conditional"
                  bg="var(--color-primary-muted)"
                  color="var(--color-primary)"
                  border="var(--color-primary)"
                />
              )}
              {field.disabled && (
                <FieldTag
                  label="Locked"
                  bg="var(--color-bg-hover)"
                  color="var(--color-text-muted)"
                  border="var(--color-border)"
                />
              )}
              {hasForcedValue && (
                <FieldTag
                  label="Auto-set"
                  bg="var(--color-info-bg)"
                  color="var(--color-info)"
                  border="var(--color-info-border)"
                />
              )}
            </div>
          </div>
        </div>

        <div style={{ paddingLeft: 'calc(28px + var(--space-md))' }}>
          {hasValidationError && (
            <div
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-border)',
                marginBottom: 'var(--space-md)',
                color: 'var(--color-danger)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              This pathway-critical field must be completed before you can continue.
            </div>
          )}

          {field.autoWarn && (
            <NoteBox variant="warning" icon="alert">
              <HelpTextWithLinks text={field.autoWarn} />
            </NoteBox>
          )}

          {field.boundaryNote && (
            <NoteBox variant="warning" label="Boundary note">
              <HelpTextWithLinks text={field.boundaryNote} />
            </NoteBox>
          )}

          {hasForcedValue && (
            <div
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
                marginBottom: 'var(--space-md)',
                display: 'flex',
                gap: 'var(--space-sm)',
              }}
            >
              <Icon name="info" size={16} color="var(--color-info)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: 'var(--color-info)' }}>Set automatically:</strong> This value is derived from
                earlier answers. Value: <strong>{String(field.forcedValue)}</strong>
              </div>
            </div>
          )}

          {/* Input */}
          <div
            style={{
              marginBottom:
                hasSupport || Boolean(field.consequencePreview) || field.selectedTypeData ? 'var(--space-md)' : 0,
            }}
          >
            {renderInput()}
          </div>

          {/* Consequence preview */}
          {field.consequencePreview && (
            <div
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
                marginBottom: 'var(--space-md)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                <Icon name="arrow" size={14} color="var(--color-info)" />
                <strong
                  style={{
                    color: 'var(--color-info)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Pathway effect
                </strong>
              </div>
              {typeof field.consequencePreview === 'string' ? (
                <HelpTextWithLinks text={field.consequencePreview} />
              ) : consequencePreview ? (
                <div>
                  {consequencePreview.yes && (
                    <div style={{ marginBottom: 'var(--space-xs)' }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>If Yes →</span>{' '}
                      <HelpTextWithLinks text={consequencePreview.yes} />
                    </div>
                  )}
                  {consequencePreview.no && (
                    <div style={{ marginBottom: 'var(--space-xs)' }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>If No →</span>{' '}
                      <HelpTextWithLinks text={consequencePreview.no} />
                    </div>
                  )}
                  {consequencePreview.uncertain && (
                    <div>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>If Uncertain →</span>{' '}
                      <HelpTextWithLinks text={consequencePreview.uncertain} />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {field.selectedTypeData && (
            <div
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-hover)',
                border: '1px solid var(--color-border)',
                marginBottom: 'var(--space-md)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Change-type context
              </div>
              <div style={{ marginBottom: field.selectedTypeData.pccpNote ? 'var(--space-sm)' : 0 }}>
                <strong>Illustration:</strong> {field.selectedTypeData.example}
              </div>
              {field.selectedTypeData.misclass && (
                <div style={{ marginBottom: field.selectedTypeData.pccpNote ? 'var(--space-sm)' : 0 }}>
                  <strong>Common misclassification:</strong>{' '}
                  <HelpTextWithLinks text={field.selectedTypeData.misclass} />
                </div>
              )}
              {field.selectedTypeData.pccpNote && (
                <div>
                  <strong>PCCP note:</strong> <HelpTextWithLinks text={field.selectedTypeData.pccpNote} />
                </div>
              )}
            </div>
          )}

          <SupportSection field={field} qReasoning={qReasoning} />
        </div>
      </div>
    );
  },
  (prev, next) => {
    // Skip onChange comparison — it's always behaviorally equivalent for the same
    // QuestionCard instance (wraps stable handleAnswerChange with the same field.id).
    return (
      prev.value === next.value &&
      prev.index === next.index &&
      prev.hasValidationError === next.hasValidationError &&
      areFieldsShallowEqual(prev.field, next.field)
    );
  },
);
