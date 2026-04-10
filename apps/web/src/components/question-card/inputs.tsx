/**
 * Input renderers for QuestionCard.
 *
 * Each renderer handles one field type: yesno/yesnouncertain, single-select radio,
 * multi-select checkbox, text area, and numeric input.
 *
 * All renderers receive a common InputProps interface for consistency.
 */

import React from 'react';
import { Icon } from '../Icon';
import { Answer } from '../../lib/assessment-engine';
import type { AnswerValue } from '../../lib/assessment-engine';

export interface InputProps {
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  options?: string[];
  disabled?: boolean;
  hasValidationError?: boolean;
  /** For text/numeric: local text state */
  localText?: string;
  onLocalTextChange?: (text: string) => void;
  onBlur?: () => void;
  /** For text placeholder */
  placeholder?: string;
  /** For numeric: field id for custom placeholder */
  fieldId?: string;
}

/* ------------------------------------------------------------------ */
/*  Yes / No / Uncertain buttons                                       */
/* ------------------------------------------------------------------ */

export const YesNoInput: React.FC<{
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  includeUncertain: boolean;
  disabled?: boolean;
}> = ({ value, onChange, includeUncertain, disabled }) => {
  const options = includeUncertain ? [Answer.Yes, Answer.No, Answer.Uncertain] : [Answer.Yes, Answer.No];

  return (
    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          disabled={disabled}
          style={{
            flex: 1,
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: value === opt ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
            background: value === opt ? 'var(--color-primary-muted)' : 'var(--color-bg-card)',
            color: value === opt ? 'var(--color-primary)' : 'var(--color-text)',
            fontWeight: 600,
            fontSize: 14,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'all var(--transition-fast)',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Single-select radio buttons                                        */
/* ------------------------------------------------------------------ */

export const RadioInput: React.FC<{
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  options: string[];
  disabled?: boolean;
}> = ({ value, onChange, options, disabled }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          border: value === opt ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
          background: value === opt ? 'var(--color-primary-muted)' : 'var(--color-bg-card)',
          color: 'var(--color-text)',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all var(--transition-fast)',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: value === opt ? '5px solid var(--color-primary)' : '2px solid var(--color-border)',
            flexShrink: 0,
            transition: 'all var(--transition-fast)',
          }}
        />
        <span style={{ fontSize: 14 }}>{opt}</span>
      </button>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Multi-select checkbox buttons                                      */
/* ------------------------------------------------------------------ */

export const CheckboxInput: React.FC<{
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  options: string[];
}> = ({ value, onChange, options }) => {
  const currentValues = Array.isArray(value) ? value : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {options.map((opt) => {
        const isSelected = currentValues.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => {
              if (isSelected) {
                onChange(currentValues.filter((v: string) => v !== opt));
              } else {
                onChange([...currentValues, opt]);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: isSelected ? 'var(--color-primary-muted)' : 'var(--color-bg-card)',
              color: 'var(--color-text)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 'var(--radius-sm)',
                border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                background: isSelected ? 'var(--color-primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all var(--transition-fast)',
              }}
            >
              {isSelected && <Icon name="check" size={12} color="#fff" />}
            </div>
            <span style={{ fontSize: 14 }}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Text area input                                                    */
/* ------------------------------------------------------------------ */

export const TextInput: React.FC<{
  localText: string;
  onLocalTextChange: (text: string) => void;
  onBlur: () => void;
  hasValidationError: boolean;
  placeholder?: string;
}> = ({ localText, onLocalTextChange, onBlur, hasValidationError, placeholder }) => (
  <textarea
    value={localText}
    onChange={(e) => onLocalTextChange(e.target.value)}
    onBlur={onBlur}
    placeholder={placeholder || 'Enter your answer...'}
    rows={4}
    style={{
      width: '100%',
      padding: 'var(--space-md)',
      borderRadius: 'var(--radius-md)',
      border: hasValidationError ? '1px solid var(--color-danger)' : '1px solid var(--color-border)',
      background: 'var(--color-bg-card)',
      color: 'var(--color-text)',
      fontSize: 14,
      lineHeight: 1.6,
      resize: 'vertical',
      minHeight: 100,
    }}
  />
);

/* ------------------------------------------------------------------ */
/*  Numeric input                                                      */
/* ------------------------------------------------------------------ */

export const NumericInput: React.FC<{
  localText: string;
  onLocalTextChange: (text: string) => void;
  onBlur: () => void;
  hasValidationError: boolean;
  placeholder?: string;
}> = ({ localText, onLocalTextChange, onBlur, hasValidationError, placeholder }) => (
  <input
    type="number"
    min="0"
    value={localText}
    onChange={(e) => onLocalTextChange(e.target.value)}
    onBlur={onBlur}
    placeholder={placeholder || 'Enter a number'}
    style={{
      width: 160,
      padding: 'var(--space-md)',
      borderRadius: 'var(--radius-md)',
      border: hasValidationError ? '1px solid var(--color-danger)' : '1px solid var(--color-border)',
      background: 'var(--color-bg-card)',
      color: 'var(--color-text)',
      fontSize: 14,
    }}
  />
);
