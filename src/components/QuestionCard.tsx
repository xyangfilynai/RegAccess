import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { HelpTextWithLinks, AuthorityTag, GuidanceRef } from './ui';
import type { Question } from '../lib/assessment-engine';
import { Answer } from '../lib/assessment-engine';
import { questionReasoningLibrary } from '../lib/content';

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
  question: Question;
  value: any;
  onChange: (value: any) => void;
  index: number;
  hasValidationError?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  value,
  onChange,
  index,
  hasValidationError = false,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [localText, setLocalText] = useState(value || '');

  // Get question-specific reasoning from library
  const qReasoning = questionReasoningLibrary[question.id];

  useEffect(() => {
    setLocalText(value == null ? '' : String(value));
  }, [value]);

  // Section divider rendering
  if (question.sectionDivider) {
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
          <Icon name={question.icon || 'info'} size={18} color="var(--color-primary)" />
        </div>
        <div>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text)',
            margin: 0,
          }}>
            {question.label}
          </h3>
          {question.sublabel && (
            <p style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              margin: '4px 0 0 0',
            }}>
              {question.sublabel}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Skip hidden questions
  if (question.skip) return null;

  const isCritical = question.critical || question.pathwayCritical;
  const hasValue = Array.isArray(value)
    ? value.length > 0
    : value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '');

  // Commit text value on blur
  const commitText = () => {
    if (localText !== value) {
      onChange(localText);
    }
  };

  // Render input based on question type
  const renderInput = () => {
    switch (question.type) {
      case 'yesno':
      case 'yesnouncertain': {
        const options = question.type === 'yesno'
          ? [Answer.Yes, Answer.No]
          : [Answer.Yes, Answer.No, Answer.Uncertain];
        return (
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                disabled={question.disabled}
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
                  cursor: question.disabled ? 'not-allowed' : 'pointer',
                  opacity: question.disabled ? 0.5 : 1,
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
            {(question.options || []).map((opt) => (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                disabled={question.disabled}
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
                  cursor: question.disabled ? 'not-allowed' : 'pointer',
                  opacity: question.disabled ? 0.5 : 1,
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
            {(question.options || []).map((opt) => {
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
            placeholder={question.q?.includes('Paste') ? 'Paste or type here...' : 'Enter your response...'}
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
            placeholder="Enter number"
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
        border: question.disabled
          ? '1px dashed var(--color-border)'
          : hasValidationError
            ? '1px solid var(--color-danger)'
            : '1px solid var(--color-border)',
        background: question.disabled 
          ? '#f8fafc' 
          : '#ffffff',
        marginBottom: 'var(--space-md)',
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'backwards',
        opacity: question.disabled ? 0.7 : 1,
        position: 'relative',
        boxShadow: question.disabled
          ? 'none'
          : hasValidationError
            ? '0 0 0 3px rgba(239, 68, 68, 0.12)'
            : '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Disabled overlay */}
      {question.disabled && (
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
          Not applicable based on prior answers
        </div>
      )}
      {/* Question header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
      }}>
        {/* Status indicator (no question number) */}
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
          {/* Tags */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-xs)',
            marginBottom: 'var(--space-sm)',
            flexWrap: 'wrap',
          }}>
            {question.pathwayCritical && (
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
              }}>
                Required
              </span>
            )}
            {question.critical && !question.pathwayCritical && (
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
              }}>
                Critical
              </span>
            )}
            {question.draftRef && (
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
              }}>
                Draft Guidance
              </span>
            )}
            {question.dynamic && (
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
              }}>
                <Icon name="zap" size={10} />
                Dynamic
              </span>
            )}
            {question.disabled && (
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
              }}>
                Locked
              </span>
            )}
            {question.forcedValue !== undefined && (
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
              }}>
                <Icon name="check" size={10} />
                Auto-Set
              </span>
            )}
          </div>

          {/* Question text */}
          <h4 style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-text)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {question.q}
          </h4>
        </div>

        {/* Help button */}
        {question.help && (
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              background: showHelp ? 'var(--color-primary-muted)' : 'transparent',
              color: showHelp ? 'var(--color-primary)' : 'var(--color-text-muted)',
              flexShrink: 0,
            }}
            aria-label="Toggle help"
          >
            <Icon name="helpCircle" size={18} />
          </button>
        )}
      </div>

      {/* Help text */}
      {showHelp && question.help && (
        <div style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg-hover)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-md)',
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
        }}>
          <HelpTextWithLinks text={question.help} />
        </div>
      )}

      {/* Question reasoning from library */}
      {qReasoning && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: showReasoning ? 'var(--color-primary-muted)' : 'var(--color-bg-hover)',
              border: '1px solid var(--color-border)',
              color: showReasoning ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Icon name="book" size={14} />
            <span style={{ flex: 1 }}>{qReasoning.title || 'Regulatory Context'}</span>
            {qReasoning.status && <AuthorityTag level={qReasoning.status.toLowerCase().replace(' ', '_')} compact />}
            <Icon name={showReasoning ? 'arrowUp' : 'arrowDown'} size={12} />
          </button>
          {showReasoning && (
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
                  <strong style={{ color: 'var(--color-warning)' }}>Counter:</strong>{' '}
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
        </div>
      )}

      {/* ML Guidance */}
      {question.mlguidance && (
        <NoteBox variant="info" icon="cpu" label="AI/ML Guidance">
          <HelpTextWithLinks text={question.mlguidance} />
        </NoteBox>
      )}

      {/* Auto warning */}
      {question.autoWarn && (
        <NoteBox variant="warning" icon="alert">
          <HelpTextWithLinks text={question.autoWarn} />
        </NoteBox>
      )}

      {/* Info note */}
      {question.infoNote && (
        <NoteBox variant="success" icon="info">
          <HelpTextWithLinks text={question.infoNote} />
        </NoteBox>
      )}

      {/* Classification guidance */}
      {question.classificationGuidance && (
        <NoteBox variant="neutral" label="Classification Guidance">
          <HelpTextWithLinks text={question.classificationGuidance} />
        </NoteBox>
      )}

      {/* Boundary note */}
      {question.boundaryNote && (
        <NoteBox variant="warning" label="Boundary Note">
          <HelpTextWithLinks text={question.boundaryNote} />
        </NoteBox>
      )}

      {/* Consequence preview */}
      {question.consequencePreview && (
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
            <Icon name="zap" size={14} color="var(--color-info)" />
            <strong style={{ color: 'var(--color-info)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Consequence Preview
            </strong>
          </div>
          {typeof question.consequencePreview === 'string' ? (
            <HelpTextWithLinks text={question.consequencePreview} />
          ) : typeof question.consequencePreview === 'object' ? (
            <div>
              {question.consequencePreview.yes && (
                <div style={{ marginBottom: 'var(--space-xs)' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Yes:</span>{' '}
                  <HelpTextWithLinks text={question.consequencePreview.yes} />
                </div>
              )}
              {question.consequencePreview.no && (
                <div style={{ marginBottom: 'var(--space-xs)' }}>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>No:</span>{' '}
                  <HelpTextWithLinks text={question.consequencePreview.no} />
                </div>
              )}
              {question.consequencePreview.uncertain && (
                <div>
                  <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Uncertain:</span>{' '}
                  <HelpTextWithLinks text={question.consequencePreview.uncertain} />
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Selected type data */}
      {question.selectedTypeData && (
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
          {question.selectedTypeData.typicalPathway && (
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <strong>Typical Pathway:</strong> {question.selectedTypeData.typicalPathway}
            </div>
          )}
          {question.selectedTypeData.keyConsiderations && (
            <div>
              <strong>Key Considerations:</strong> {question.selectedTypeData.keyConsiderations}
            </div>
          )}
        </div>
      )}

      {/* Forced value explanation — only show when forcedValue is a non-null, non-empty value */}
      {question.forcedValue != null && question.forcedValue !== '' && (
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
            <strong style={{ color: 'var(--color-info)' }}>Auto-determined:</strong>{' '}
            This value has been set automatically based on your prior answers.
            Value: <strong>{String(question.forcedValue)}</strong>
          </div>
        </div>
      )}

      {hasValidationError && (
        <div style={{
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger-border)',
          color: 'var(--color-danger)',
          fontSize: 12,
          fontWeight: 500,
          marginBottom: 'var(--space-md)',
        }}>
          This required question must be completed before you can continue.
        </div>
      )}

      {/* Input */}
      {renderInput()}
    </div>
  );
};
