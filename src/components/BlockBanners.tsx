import React from 'react';
import { Icon } from './Icon';
import { changeTaxonomy, Answer, type Answers, type DerivedState } from '../lib/assessment-engine';

const bannerStyle = {
  warning: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-warning-bg)',
    border: '1px solid var(--color-warning-border)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  } as React.CSSProperties,
  danger: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-danger-bg)',
    border: '1px solid var(--color-danger-border)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  } as React.CSSProperties,
};

export interface BlockBannersProps {
  blockId: string;
  answers: Answers;
  derivedState: DerivedState;
  currentBlockComplete: boolean;
  currentMissingRequired: number;
}

export const BlockBanners: React.FC<BlockBannersProps> = ({
  blockId,
  answers,
  derivedState,
  currentBlockComplete,
  currentMissingRequired,
}) => {
  return (
    <>
      {!currentBlockComplete && (
        <div style={bannerStyle.warning}>
          <Icon name="alertCircle" size={15} color="var(--color-warning)" style={{ marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning)' }}>
              {currentMissingRequired} pathway-critical field{currentMissingRequired === 1 ? '' : 's'} incomplete in
              this section
            </span>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
              Complete items marked <strong>Pathway-critical</strong> to continue. Optional fields add context for
              review and records.
            </div>
          </div>
        </div>
      )}

      {blockId === 'C' && answers.B3 === Answer.Yes && (
        <div style={bannerStyle.warning}>
          <Icon name="alertCircle" size={15} color="var(--color-warning)" style={{ marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning)' }}>
              Intended use or indications change indicated
            </span>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
              This pattern typically requires a new marketing submission.{' '}
              {derivedState.isPMA
                ? 'Expect a PMA supplement unless a different reporting pathway applies.'
                : derivedState.isDeNovo
                  ? 'Expect a 510(k) or De Novo submission, depending on device-type fit and strategy.'
                  : 'Expect a new 510(k) unless another pathway applies.'}
            </div>
          </div>
        </div>
      )}

      {blockId === 'C' && answers.B3 === Answer.Uncertain && (
        <div style={bannerStyle.warning}>
          <Icon name="alertCircle" size={15} color="var(--color-warning)" style={{ marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning)' }}>
              Intended use impact uncertain — conservative pathway selection
            </span>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
              ChangePath applies conservative pathway selection when intended-use impact is uncertain. Complete the
              remaining fields for your internal record.{' '}
              <strong>
                Consider an FDA Pre-Submission (Q-Sub) or equivalent expert review before relying on a
                documentation-only pathway.
              </strong>
            </div>
          </div>
        </div>
      )}

      {blockId === 'C' &&
        derivedState.isDeNovo &&
        !derivedState.isPMA &&
        answers.B3 !== Answer.Yes &&
        (answers.C0_DN1 === Answer.No ||
        answers.C0_DN1 === Answer.Uncertain ||
        answers.C0_DN2 === Answer.No ||
        answers.C0_DN2 === Answer.Uncertain ? (
          <div style={bannerStyle.danger}>
            <Icon name="alertCircle" size={15} color="var(--color-danger)" style={{ marginTop: 1 }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-danger)' }}>
                De Novo device-type fit unresolved
              </span>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
                The modified device may not remain within the De Novo device type and special controls. Consider an FDA
                Pre-Submission (Q-Sub) or senior RA review before treating any documentation-only pathway as sufficient.
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.55,
            }}
          >
            <strong>De Novo note:</strong>{' '}
            {
              'For software changes, FDA 510(k) software change guidance is often applied by analogy to De Novo-authorized devices; confirm device-type fit and special controls. For borderline cases, consider a Pre-Submission (Q-Sub).'
            }
          </div>
        ))}

      {blockId === 'C' &&
        !derivedState.isPMA &&
        answers.B3 !== Answer.Yes &&
        answers.C1 !== Answer.Yes &&
        answers.C2 !== Answer.Yes &&
        [answers.C3, answers.C4, answers.C5, answers.C6].includes(Answer.Uncertain) && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.55,
            }}
          >
            {
              'One or more significance fields are marked "Uncertain." As a conservative policy, ChangePath treats unresolved uncertainty as significant for pathway purposes. Resolve through evidence or expert review where possible, and document the rationale in your change record.'
            }
          </div>
        )}

      {blockId === 'P' &&
        (() => {
          const selType =
            answers.B1 && answers.B2
              ? changeTaxonomy[answers.B1 as string]?.types?.find((t) => t.name === answers.B2)
              : null;
          const pccpStatus = selType?.pccp;
          const pccpNote = selType?.pccpNote;
          if (!selType || !pccpStatus) return null;
          const isEligible = pccpStatus === 'TYPICAL' || pccpStatus === 'EXEMPT';
          const isConditional = pccpStatus === 'CONDITIONAL';
          return (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: isEligible
                  ? 'var(--color-success-bg)'
                  : isConditional
                    ? 'var(--color-warning-bg)'
                    : 'var(--color-danger-bg)',
                border: `1px solid ${isEligible ? 'var(--color-success-border)' : isConditional ? 'var(--color-warning-border)' : 'var(--color-danger-border)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <Icon
                name={isEligible ? 'check' : 'alertCircle'}
                size={15}
                color={
                  isEligible ? 'var(--color-success)' : isConditional ? 'var(--color-warning)' : 'var(--color-danger)'
                }
                style={{ marginTop: 1 }}
              />
              <div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isEligible
                      ? 'var(--color-success)'
                      : isConditional
                        ? 'var(--color-warning)'
                        : 'var(--color-danger)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  PCCP suitability for {`"${answers.B2 as string}"`}:{' '}
                  {pccpStatus === 'TYPICAL'
                    ? 'Often compatible'
                    : pccpStatus === 'EXEMPT'
                      ? 'Not the primary mechanism'
                      : pccpStatus === 'CONDITIONAL'
                        ? 'Conditional'
                        : pccpStatus === 'UNLIKELY'
                          ? 'Unlikely'
                          : 'Outside typical scope'}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 400,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {pccpStatus === 'TYPICAL'
                    ? 'This change type is often compatible with PCCP when the change is pre-described, bounded, and validated prospectively.'
                    : pccpStatus === 'EXEMPT'
                      ? 'PCCP is typically not the primary mechanism for documentation-only cybersecurity or restore-to-specification pathways.'
                      : pccpStatus === 'CONDITIONAL'
                        ? 'May fit a PCCP only if scope, acceptance criteria, and boundaries are explicitly authorized.'
                        : pccpStatus === 'UNLIKELY'
                          ? 'Unlikely to fit a PCCP without a new authorization scope.'
                          : 'Outside typical PCCP scope under current FDA PCCP policy for this change pattern.'}
                </span>
                {pccpNote && (
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
                    {pccpNote}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </>
  );
};
