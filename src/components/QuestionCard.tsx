import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { HelpTextWithLinks, AuthorityTag, GuidanceRef } from './ui';
import type { AssessmentField } from '../lib/assessment-engine';
import { Answer } from '../lib/assessment-engine';
import { fieldReasoningLibrary } from '../lib/content';

/** Reusable note box for contextual information (guidance, warnings, info notes). */
const NoteBox: React.FC<{
  variant: 'info' | 'warning' | 'success' | 'neutral';
  icon?: string;
  label?: string;
  children: React.ReactNode;
}> = ({ variant, icon, label, children }) => {
  const variantMap = {
    info:    { bg: 'var(--color-info-bg)',    border: 'var(--color-info-border)',    color: 'var(--color-info)' },
    warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)', color: 'var(--color-warning)' },
    success: { bg: 'var(--color-success-bg)', border: 'var(--color-success-border)', color: 'var(--color-success)' },
    neutral: { bg: 'var(--color-bg-hover)',   border: 'var(--color-border)',          color: 'var(--color-text-secondary)' },
  };
  const v = variantMap[variant];
  return (
    <div style={{
      padding: 'var(--space-md)',
      borderRadius: 'var(--radius-md)',
      background: v.bg,
      border: `1px solid ${v.border}`,
      marginBottom: 'var(--space-md)',
      display: icon ? 'flex' : 'block',
      gap: 'var(--space-sm)',
      fontSize: 12,
      color: 'var(--color-text-secondary)',
      lineHeight: 1.6,
    }}>
      {icon && <Icon name={icon} size={16} color={v.color} style={{ flexShrink: 0, marginTop: 2 }} />}
      <div>
        {label && <><strong style={{ color: v.color }}>{label}:</strong>{' '}</>}
        {children}
      </div>
    </div>
  );
};

interface QuestionCardProps {
  field: AssessmentField;
  value: unknown;
  onChange: (value: unknown) => void;
  index: number;
  hasValidationError?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  field,
  value,
  onChange,
  index,
  hasValidationError = false,
}) => {
  const [showSupport, setShowSupport] = useState(false);
  const [localText, setLocalText] = useState<string>(
    typeof value === 'string' || typeof value === 'number' ? String(value) : '',
  );
  const consequencePreview =
    typeof field.consequencePreview === 'object' && field.consequencePreview !== null
      ? field.consequencePreview
      : null;
  const hasForcedValue =
    field.forcedValue !== undefined
    && field.forcedValue !== null
    && field.forcedValue !== '';

  // Field-specific reasoning from library (keys match assessment item ids)
  const qReasoning = fieldReasoningLibrary[field.id];

  useEffect(() => {
    setLocalText(typeof value === 'string' || typeof value === 'number' ? String(value) : '');
  }, [value]);

  // Section divider rendering
  if (field.sectionDivider) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-lg) 0',
        marginBottom: 'var(--space-md)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name={field.icon || 'info'} size={18} color="var(--color-primary)" />
        </div>
        <div>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text)',
            margin: 0,
          }}>
            {field.label}
          </h3>
          {field.sublabel && (
            <p style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              margin: '4px 0 0 0',
            }}>
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
  const hasSupportingContext = Boolean(
    field.help ||
    qReasoning ||
    field.mlguidance ||
    field.infoNote ||
    field.classificationGuidance ||
    field.selectedTypeData ||
    field.autoWarn ||
    field.boundaryNote
  );

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
      case 'yesnouncertain': {
        const options = field.type === 'yesno'
          ? [Answer.Yes, Answer.No]
          : [Answer.Yes, Answer.No, Answer.Uncertain];
        return (
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                disabled={field.disabled}
                style={{
                  flex: 1,
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  border: value === opt
                    ? '2px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                  background: value === opt
                    ? 'var(--color-primary-muted)'
                    : 'var(--color-bg-card)',
                  color: value === opt
                    ? 'var(--color-primary)'
                    : 'var(--color-text)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: field.disabled ? 'not-allowed' : 'pointer',
                  opacity: field.disabled ? 0.5 : 1,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      }

      case 'single':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {(field.options || []).map((opt) => (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                disabled={field.disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  border: value === opt 
                    ? '2px solid var(--color-primary)' 
                    : '1px solid var(--color-border)',
                  background: value === opt 
                    ? 'var(--color-primary-muted)' 
                    : 'var(--color-bg-card)',
                  color: 'var(--color-text)',
                  textAlign: 'left',
                  cursor: field.disabled ? 'not-allowed' : 'pointer',
                  opacity: field.disabled ? 0.5 : 1,
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: value === opt 
                    ? '5px solid var(--color-primary)' 
                    : '2px solid var(--color-border)',
                  flexShrink: 0,
                  transition: 'all var(--transition-fast)',
                }} />
                <span style={{ fontSize: 14 }}>{opt}</span>
              </button>
            ))}
          </div>
        );

      case 'multi':
        const currentValues = Array.isArray(value) ? value : [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {(field.options || []).map((opt) => {
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
                    border: isSelected 
                      ? '2px solid var(--color-primary)' 
                      : '1px solid var(--color-border)',
                    background: isSelected 
                      ? 'var(--color-primary-muted)' 
                      : 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected 
                      ? '2px solid var(--color-primary)' 
                      : '2px solid var(--color-border)',
                    background: isSelected ? 'var(--color-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all var(--transition-fast)',
                  }}>
                    {isSelected && <Icon name="check" size={12} color="#fff" />}
                  </div>
                  <span style={{ fontSize: 14 }}>{opt}</span>
                </button>
              );
            })}
          </div>
        );

      case 'text':
        return (
          <textarea
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={commitText}
            placeholder={field.q?.includes('Paste') ? 'Paste or type your answer...' : 'Enter your answer...'}
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

      case 'numeric':
        return (
          <input
            type="number"
            min="0"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={commitText}
            placeholder="Numeric value"
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
        background: field.disabled 
          ? '#f8fafc' 
          : '#ffffff',
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
        <div style={{
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
        }}>
          <Icon name="alert" size={12} />
          Not applicable based on earlier answers
        </div>
      )}
      {/* Field header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
      }}>
        {/* Status indicator (no item number) */}
        <div style={{
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
          border: `1px solid ${hasValidationError
            ? 'var(--color-danger-border)'
            : hasValue
              ? 'var(--color-success-border)'
              : isCritical
                ? 'var(--color-warning-border)'
                : 'var(--color-border)'}` ,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {hasValidationError
            ? <Icon name="alertCircle" size={14} color="var(--color-danger)" />
            : hasValue
              ? <Icon name="check" size={14} color="var(--color-success)" />
              : isCritical
                ? <Icon name="alertCircle" size={14} color="var(--color-warning)" />
                : <Icon name="info" size={14} color="var(--color-text-muted)" />
          }
        </div>

        <div style={{ flex: 1 }}>
          {/* Question text + tags inline */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}>
            <h4 style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              {field.q}
            </h4>

            {/* Tags — after the question text */}
            {field.pathwayCritical && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                border: '1px solid var(--color-danger-border)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                Required
              </span>
            )}
            {field.critical && !field.pathwayCritical && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
                border: '1px solid var(--color-warning-border)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                Critical
              </span>
            )}
            {field.draftRef && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-info-bg)',
                color: 'var(--color-info)',
                border: '1px solid var(--color-info-border)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                Draft Guidance
              </span>
            )}
            {field.dynamic && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-primary-muted)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}>
                <Icon name="layers" size={10} />
                Conditional
              </span>
            )}
            {field.disabled && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-hover)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                Locked
              </span>
            )}
            {hasForcedValue && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-info-bg)',
                color: 'var(--color-info)',
                border: '1px solid var(--color-info-border)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}>
                <Icon name="check" size={10} />
                Auto-set
              </span>
            )}
          </div>
        </div>

      </div>

      <div style={{ paddingLeft: 'calc(28px + var(--space-md))' }}>

      {hasValidationError && (
        <div style={{
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger-border)',
          marginBottom: 'var(--space-md)',
          color: 'var(--color-danger)',
          fontSize: 12,
          fontWeight: 500,
        }}>
          This required field must be completed before you can continue.
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

      {/* Forced value explanation — only show when forcedValue is a non-null, non-empty value */}
      {hasForcedValue && (
        <div style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-info-bg)',
          border: '1px solid var(--color-info-border)',
          marginBottom: 'var(--space-md)',
          display: 'flex',
          gap: 'var(--space-sm)',
        }}>
          <Icon name="info" size={16} color="var(--color-info)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--color-info)' }}>Set automatically:</strong>{' '}
            This value is derived from earlier answers.
            Value: <strong>{String(field.forcedValue)}</strong>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ marginBottom: hasSupportingContext || Boolean(field.consequencePreview) || field.selectedTypeData ? 'var(--space-md)' : 0 }}>
        {renderInput()}
      </div>

      {/* Consequence preview */}
      {field.consequencePreview && (
        <div style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-info-bg)',
          border: '1px solid var(--color-info-border)',
          marginBottom: 'var(--space-md)',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-xs)',
          }}>
            <Icon name="arrow" size={14} color="var(--color-info)" />
            <strong style={{ color: 'var(--color-info)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
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
        <div style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg-hover)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-md)',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            marginBottom: 'var(--space-xs)',
          }}>
            Change-type context
          </div>
          <div style={{ marginBottom: field.selectedTypeData.pccpNote ? 'var(--space-sm)' : 0 }}>
              <strong>Illustration:</strong> {field.selectedTypeData.example}
          </div>
          {field.selectedTypeData.misclass && (
            <div style={{ marginBottom: field.selectedTypeData.pccpNote ? 'var(--space-sm)' : 0 }}>
              <strong>Common misclassification:</strong> <HelpTextWithLinks text={field.selectedTypeData.misclass} />
            </div>
          )}
          {field.selectedTypeData.pccpNote && (
            <div>
              <strong>PCCP note:</strong> <HelpTextWithLinks text={field.selectedTypeData.pccpNote} />
            </div>
          )}
        </div>
      )}

      {hasSupportingContext && (
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
                {qReasoning?.status && (
                  <AuthorityTag level={qReasoning.status.toLowerCase().replace(' ', '_')} compact />
                )}
                {field.mlguidance && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--color-info-bg)',
                    color: 'var(--color-info)',
                    border: '1px solid var(--color-info-border)',
                  }}>
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
                <div style={{
                  marginBottom: 'var(--space-md)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.7,
                }}>
                  <HelpTextWithLinks text={field.help} />
                </div>
              )}

              {qReasoning && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)',
                  }}>
                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>
                      {qReasoning.title || 'Regulatory Context'}
                    </strong>
                    {qReasoning.status && <AuthorityTag level={qReasoning.status.toLowerCase().replace(' ', '_')} compact />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    <HelpTextWithLinks text={qReasoning.text} />
                  </div>
                  {qReasoning.verify && (
                    <div style={{
                      marginTop: 'var(--space-sm)',
                      padding: 'var(--space-sm) var(--space-md)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-success-bg)',
                      border: '1px solid var(--color-success-border)',
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      <strong style={{ color: 'var(--color-success)' }}>Verify:</strong>{' '}
                      <HelpTextWithLinks text={qReasoning.verify} />
                    </div>
                  )}
                  {qReasoning.counter && (
                    <div style={{
                      marginTop: 'var(--space-sm)',
                      padding: 'var(--space-sm) var(--space-md)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-warning-bg)',
                      border: '1px solid var(--color-warning-border)',
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      <strong style={{ color: 'var(--color-warning)' }}>Counterpoint:</strong>{' '}
                      <HelpTextWithLinks text={qReasoning.counter} />
                    </div>
                  )}
                  {qReasoning.source && (
                    <div style={{
                      marginTop: 'var(--space-sm)',
                      fontSize: 10,
                      color: 'var(--color-text-muted)',
                    }}>
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
      )}

      </div>
    </div>
  );
};
