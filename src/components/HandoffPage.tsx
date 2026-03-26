import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { BrandMark } from './BrandMark';
import { AuthPathway, Answer, type Answers, type DeterminationResult } from '../lib/assessment-engine';

interface HandoffPageProps {
  determination: DeterminationResult;
  answers: Answers;
  onBack: () => void;
  onBackToAssessment: () => void;
}

interface ChecklistSection {
  n: number;
  title: string;
  detail: string;
  items: string[];
}

const getSections = (
  determination: DeterminationResult,
  answers: Answers,
): ChecklistSection[] => {
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;
  const isPCCPImpl = determination.isPCCPImpl;
  const isLTF = determination.isLetterToFile;
  const isCyberOnly = determination.isCyberOnly;
  const isBugFix = determination.isBugFix;
  const isPMAAnnualReport = determination.isPMAAnnualReport;
  const isPMAPCCP = isPCCPImpl && isPMA;

  if (isPCCPImpl) {
    return [
      {
        n: 1,
        title: 'Scope Verification Record',
        detail: 'Document PCCP boundary compliance',
        items: [
          'Confirm change type described in authorized PCCP',
          'Verify parameters within predefined bounds',
          'Document PCCP section references',
          'Verify cumulative impact within PCCP boundaries (P5)',
        ],
      },
      {
        n: 2,
        title: 'Validation per PCCP Protocol',
        detail: 'Execute the validation procedure',
        items: [
          'Execute validation per acceptance criteria',
          'Perform subgroup analysis (bias/equity)',
          'Document pass/fail for each criterion',
          'Obtain independent review/approval',
        ],
      },
      {
        n: 3,
        title: 'Risk, Labeling & Monitoring',
        detail: 'Update risk file, labeling, and activate monitoring',
        items: [
          'Update risk management file (ISO 14971)',
          'Review labeling for any updates required by the authorized PCCP, applicable regulations, or FDA conditions of authorization',
          'Update SBOM',
          'Activate post-deployment monitoring plan',
          isPMAPCCP
            ? 'Include implementation details in PMA Annual Report per 21 CFR 814.84'
            : 'Update PCCP implementation records per QMS',
          'Complete QMS change control record',
        ],
      },
    ];
  }

  if (isPMAAnnualReport) {
    return [
      {
        n: 1,
        title: 'Letter to File & Annual Report',
        detail: 'PMA-specific change documentation',
        items: [
          'Draft Letter to File with change description and rationale',
          'Document rationale confirming no impact on safety or effectiveness per 21 CFR 814.39',
          'Prepare PMA Annual Report entry per 21 CFR 814.84',
          'Update SBOM',
        ],
      },
      {
        n: 2,
        title: 'Risk Assessment',
        detail: 'Confirm no safety/effectiveness impact',
        items: [
          'Document risk assessment per ISO 14971',
          'Update configuration management record',
          'Update device history record',
        ],
      },
      {
        n: 3,
        title: 'QMS Filing',
        detail: 'Complete quality system documentation',
        items: [
          'Complete QMS change control record (QMSR / ISO 13485:2016)',
          'File Letter to File in device history record',
          'Submit PMA Annual Report update to FDA',
          'Obtain review and approval per QMS',
        ],
      },
    ];
  }

  if (isLTF) {
    return [
      {
        n: 1,
        title: 'Letter to File',
        detail: 'Change description, rationale, and basis',
        items: [
          'Draft LTF with change description and rationale',
          `Document regulatory basis (${
            isCyberOnly
              ? 'Cybersecurity Exemption — no functional impact'
              : isBugFix
                ? 'Restore-to-Spec Exemption — restore to cleared specification'
                : 'non-significant per regulatory significance assessment'
          })`,
          'Update SBOM',
        ],
      },
      {
        n: 2,
        title: 'Risk Assessment',
        detail: 'Confirm no safety/effectiveness impact',
        items: [
          'Document risk assessment',
          'Update configuration management record',
        ],
      },
      {
        n: 3,
        title: 'QMS Filing',
        detail: 'Complete quality system documentation',
        items: [
          'Complete QMS change control record',
          'File in device history record',
          'Obtain review and approval per QMS',
        ],
      },
    ];
  }

  if (isPMA) {
    return [
      {
        n: 1,
        title: 'Supplement Type',
        detail: 'Determine PMA supplement category',
        items: [
          `Confirm type: ${answers.C_PMA4 || 'TBD'} per 21 CFR 814.39`,
          'Review supplement-specific requirements',
          'Identify clinical data requirements',
        ],
      },
      {
        n: 2,
        title: 'Submission Package',
        detail: 'Prepare core documents',
        items: [
          'Draft updated device description',
          'Prepare performance testing report',
          'Update software documentation (IEC 62304)',
          'Prepare clinical data package',
          'Update labeling',
          'Prepare submission-specific change summary / traceability package',
          'Include subgroup or bias analysis when relevant to the change',
          'Update SBOM if applicable',
        ],
      },
      {
        n: 3,
        title: 'Risk Analysis & QMS',
        detail: 'Complete risk and quality documentation',
        items: [
          'Update risk analysis (ISO 14971)',
          'Complete QMS change control record',
          'Obtain QA/RA review and approval',
        ],
      },
    ];
  }

  // Default: New Submission (510(k) or De Novo)
  return [
    {
      n: 1,
      title: isDeNovo
        ? 'Device-Type / Submission Strategy'
        : 'Predicate Strategy',
      detail: isDeNovo
        ? 'Confirm whether the modified device remains within the De Novo device type and special controls'
        : 'Establish substantial equivalence argument',
      items: isDeNovo
        ? [
            'Confirm the applicable De Novo classification regulation and special controls',
            'Assess whether the modified device still fits the established device type',
            'Schedule FDA Pre-Submission (Q-Sub) — strongly recommended',
            'Identify testing requirements and evidence gaps',
            'If the modified device no longer fits the device type, discuss 510(k) vs new De Novo strategy with FDA',
          ]
        : [
            'Confirm predicate for 510(k)',
            'Draft updated substantial equivalence argument',
            'Identify testing requirements',
            'Consider Pre-Submission (Q-Sub)',
          ],
    },
    {
      n: 2,
      title: 'Submission Package',
      detail: 'Prepare core documents',
      items: [
        'Draft updated device description',
        'Prepare performance testing report',
        'Update software documentation (IEC 62304)',
        'Prepare cybersecurity documentation if applicable',
        'Update labeling',
        isDeNovo
          ? 'Compile submission package in the format confirmed with RA/FDA'
          : 'Compile eSTAR format',
        'Prepare submission-specific change summary / traceability package',
        'Include subgroup or bias analysis when relevant to the change',
        'Update SBOM if applicable',
      ],
    },
    {
      n: 3,
      title: 'Risk Analysis & Review',
      detail: 'Complete risk and quality documentation',
      items: [
        'Update risk analysis (ISO 14971)',
        'Complete QMS change control record',
        'Obtain QA/RA review and approval',
      ],
    },
  ];
};

const getHandoffTitle = (
  determination: DeterminationResult,
  answers: Answers,
): string => {
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isPCCPImpl = determination.isPCCPImpl;
  const isLTF = determination.isLetterToFile;
  const isPMAAnnualReport = determination.isPMAAnnualReport;

  if (isPCCPImpl && isPMA) return 'PMA Device — PCCP Implementation Preparation';
  if (isPCCPImpl) return 'PCCP Implementation Preparation';
  if (isPMAAnnualReport) return 'PMA Annual Report / Letter to File Preparation';
  if (isLTF) return 'Letter to File Preparation';
  if (isPMA) return 'PMA Supplement Preparation';
  return 'New Submission Preparation';
};

const getHandoffDesc = (
  determination: DeterminationResult,
  answers: Answers,
): string => {
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;
  const isPCCPImpl = determination.isPCCPImpl;
  const isLTF = determination.isLetterToFile;
  const isPMAAnnualReport = determination.isPMAAnnualReport;

  if (isPCCPImpl && isPMA) return 'Complete the PCCP implementation protocol sections below. Include in PMA Annual Report per 21 CFR 814.84.';
  if (isPCCPImpl) return 'Complete the PCCP implementation protocol sections below.';
  if (isPMAAnnualReport) return 'Document the change rationale for PMA Annual Report and Letter to File.';
  if (isLTF) return 'Document the change rationale and regulatory basis.';
  if (isPMA) return 'Prepare the PMA supplement package per 21 CFR 814.39.';
  if (isDeNovo) return 'Prepare the post-market submission strategy package — confirm with RA whether the modified device remains within the De Novo device type / special controls.';
  return 'Prepare the 510(k) submission package.';
};

const getPreparationPackageLabel = (
  determination: DeterminationResult,
  answers: Answers,
): string => {
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;

  if (determination.isPCCPImpl) return isPMA ? 'PCCP implementation record + PMA annual-report support' : 'PCCP implementation record';
  if (determination.isPMAAnnualReport) return 'PMA annual report entry + Letter to File';
  if (determination.isLetterToFile) return 'Letter to File package';
  if (isPMA) return answers.C_PMA4 ? `${answers.C_PMA4} supplement package` : 'PMA supplement package';
  if (isDeNovo) return '510(k) or De Novo strategy package';
  return '510(k) submission package';
};

export const HandoffPage: React.FC<HandoffPageProps> = ({
  determination,
  answers,
  onBack,
  onBackToAssessment,
}) => {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [markedComplete, setMarkedComplete] = useState(false);

  const isDeNovo = answers.A1 === AuthPathway.DeNovo;
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isNewSub = determination.isNewSub;
  const isIncomplete = determination.isIncomplete;
  const consistencyIssues = determination.consistencyIssues || [];

  const sections = useMemo(
    () => getSections(determination, answers),
    [determination, answers],
  );
  const title = getHandoffTitle(determination, answers);
  const desc = getHandoffDesc(determination, answers);
  const packageLabel = getPreparationPackageLabel(determination, answers);

  if (isIncomplete) {
    return (
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '48px 32px',
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 24,
          }}
        >
          <Icon name="arrowLeft" size={14} /> Back to Review
        </button>
        <div style={{
          padding: 32,
          textAlign: 'center',
          background: 'var(--color-bg-elevated)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
        }}>
          <Icon name="alertCircle" size={32} color="var(--color-warning)" />
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-text)',
            marginTop: 16,
            marginBottom: 8,
          }}>Assessment Incomplete</h2>
          <p style={{
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            marginBottom: 20,
          }}>
            The regulatory assessment is not complete. Please return to the assessment and answer all required questions before preparing documentation.
          </p>
          <button
            onClick={onBackToAssessment}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              background: 'var(--color-primary)',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Return to Assessment
          </button>
        </div>
      </div>
    );
  }

  const allItemKeys = sections.flatMap((s, si) =>
    s.items.map((_, ii) => `${si}-${ii}`),
  );
  const totalItems = allItemKeys.length;
  const checkedCount = allItemKeys.filter(k => checks[k]).length;
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const toggleCheck = (key: string) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-lg)',
        height: 64,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
      }}>
        <BrandMark />
      </header>

      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '36px 32px 60px',
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 24,
          }}
        >
          <Icon name="arrowLeft" size={14} /> Back to Review
        </button>

        {/* Title Card */}
        <div style={{
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          background: 'var(--color-bg-elevated)',
        }}>
          <div style={{
            padding: '28px 32px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: determination.isPCCPImpl || determination.isLetterToFile || determination.isPMAAnnualReport
                  ? 'var(--color-success)'
                  : 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name="fileText" size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  margin: 0,
                  lineHeight: 1.3,
                }}>
                  {title}
                </h2>
                <p style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  margin: '4px 0 0',
                  lineHeight: 1.5,
                }}>
                  {desc}
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}>
              {[
                { label: 'Regulatory route', value: determination.pathway },
                { label: 'Primary package', value: packageLabel },
                { label: 'Change', value: (answers.B2 as string) || (answers.B1 as string) || 'Not specified' },
                { label: 'Authorized baseline', value: (answers.A1c as string) || 'Not specified' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.45 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 8,
            }}>
              <div style={{
                flex: 1,
                background: 'var(--color-border)',
                borderRadius: 4,
                height: 6,
                overflow: 'hidden',
              }}>
                <div style={{
                  background: 'var(--color-success)',
                  borderRadius: 4,
                  height: 6,
                  width: `${progressPercent}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-success)',
              }}>
                {checkedCount}/{totalItems}
              </span>
            </div>
          </div>

          <div style={{ padding: '24px 32px' }}>
            {/* Advisory notes */}
            <div style={{
              padding: '12px 16px',
              marginBottom: 20,
              borderRadius: 8,
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <Icon name="check" size={14} color="var(--color-success)" style={{ marginTop: 1 }} />
              <div style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.55,
              }}>
                <strong style={{ color: 'var(--color-success)' }}>Preparation checklist</strong> — Use this page to turn the determination into an execution checklist. For supporting document inventory and citations, refer back to Final Review.
              </div>
            </div>

            {consistencyIssues.length > 0 && (
              <div style={{
                padding: '12px 16px',
                marginBottom: 20,
                borderRadius: 8,
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <Icon name="alertCircle" size={13} color="var(--color-warning)" style={{ marginTop: 1 }} />
                <div style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.55,
                }}>
                  <strong style={{ color: 'var(--color-warning)' }}>Resolve flagged review items first.</strong>{' '}
                  The underlying assessment still contains {consistencyIssues.length} review item{consistencyIssues.length === 1 ? '' : 's'} that may affect package strategy or documentation language.
                </div>
              </div>
            )}

            {/* Assessment context */}
            <div style={{
              background: 'var(--color-bg-card)',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 24,
              border: '1px solid var(--color-border)',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                color: 'var(--color-text-muted)',
                marginBottom: 8,
              }}>
                Assessment Context
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 8,
              }}>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  <strong>Authorization:</strong> {answers.A1 as string || 'Not specified'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  <strong>Authorization ID:</strong> {answers.A1b as string || 'Not specified'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  <strong>PCCP status:</strong> {answers.A2 === Answer.Yes ? 'Authorized PCCP present' : answers.A2 === Answer.No ? 'No PCCP authorized' : 'Not specified'}
                </div>
              </div>
            </div>

            {/* Pre-Submission recommendation for new submissions */}
            {isNewSub && (
              <div style={{
                marginBottom: 20,
                padding: '16px 20px',
                background: 'var(--color-info-bg)',
                borderRadius: 10,
                border: '1px solid var(--color-info-border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <Icon name="alertCircle" size={15} color="var(--color-info)" style={{ marginTop: 1 }} />
                <div>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-info)',
                    display: 'block',
                    marginBottom: 4,
                  }}>
                    Pre-Submission (Q-Sub) {isDeNovo ? 'Strongly Recommended' : 'Recommended'}
                  </span>
                  <div style={{
                    fontSize: 12.5,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    {isDeNovo
                      ? "For software changes, FDA's 510(k) change guidances are relevant to De Novo-authorized existing devices; a Pre-Submission is still valuable when continued device-type fit or the right pathway is uncertain."
                      : `A Pre-Submission meeting with FDA is recommended before preparing the ${isPMA ? 'PMA supplement' : '510(k) submission'}.`}
                  </div>
                </div>
              </div>
            )}

            {/* Checklist sections */}
            <div style={{ display: 'grid', gap: 14 }}>
              {sections.map((section, si) => {
                const sectionKeys = section.items.map((_, ii) => `${si}-${ii}`);
                const allDone = sectionKeys.every(k => checks[k]);
                const anyDone = sectionKeys.some(k => checks[k]);
                const status = allDone ? 'complete' : anyDone ? 'in_progress' : 'not_started';

                return (
                  <div
                    key={si}
                    style={{
                      borderRadius: 10,
                      border: '1px solid var(--color-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--color-bg-elevated)',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                        <div style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background:
                            status === 'complete'
                              ? 'var(--color-success)'
                              : status === 'in_progress'
                                ? 'var(--color-warning)'
                                : 'var(--color-bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            status === 'not_started'
                              ? 'var(--color-text-muted)'
                              : '#fff',
                          border: status === 'not_started' ? '1px solid var(--color-border)' : 'none',
                        }}>
                          {status === 'complete' ? (
                            <Icon name="check" size={14} color="#fff" />
                          ) : (
                            section.n
                          )}
                        </div>
                        <div>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--color-text)',
                          }}>
                            {section.title}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: 'var(--color-text-muted)',
                            marginTop: 1,
                          }}>
                            {section.detail} • {section.items.length} item{section.items.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em',
                        padding: '4px 10px',
                        borderRadius: 5,
                        background:
                          status === 'complete'
                            ? 'var(--color-success-bg)'
                            : status === 'in_progress'
                              ? 'var(--color-warning-bg)'
                              : 'var(--color-bg-card)',
                        color:
                          status === 'complete'
                            ? 'var(--color-success)'
                            : status === 'in_progress'
                              ? 'var(--color-warning)'
                              : 'var(--color-text-muted)',
                        border:
                          status === 'complete'
                            ? '1px solid var(--color-success-border)'
                            : status === 'in_progress'
                              ? '1px solid var(--color-warning-border)'
                              : '1px solid var(--color-border)',
                      }}>
                        {status === 'complete'
                          ? 'Complete'
                          : status === 'in_progress'
                            ? 'In Progress'
                            : 'Not Started'}
                      </span>
                    </div>

                    <div style={{
                      padding: '12px 20px 16px',
                      background: 'var(--color-bg)',
                      borderTop: '1px solid var(--color-border)',
                    }}>
                      {section.items.map((item, ii) => {
                        const key = `${si}-${ii}`;
                        return (
                          <label
                            key={ii}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 0',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checks[key] || false}
                              onChange={() => toggleCheck(key)}
                              style={{ accentColor: 'var(--color-success)' }}
                            />
                            <span style={{
                              fontSize: 12.5,
                              color: 'var(--color-text-secondary)',
                              textDecoration: checks[key] ? 'line-through' : 'none',
                            }}>
                              {item}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mark Complete button */}
            <div style={{
              marginTop: 24,
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => checkedCount === totalItems && setMarkedComplete(true)}
                disabled={checkedCount !== totalItems}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: checkedCount === totalItems
                    ? 'var(--color-success)'
                    : 'var(--color-bg-card)',
                  border: checkedCount === totalItems
                    ? 'none'
                    : '1px solid var(--color-border)',
                  color: checkedCount === totalItems
                    ? '#fff'
                    : 'var(--color-text-muted)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: checkedCount === totalItems ? 'pointer' : 'not-allowed',
                  opacity: checkedCount === totalItems ? 1 : 0.5,
                }}
              >
                <Icon
                  name="check"
                  size={14}
                  color={checkedCount === totalItems ? '#fff' : 'var(--color-text-muted)'}
                />
                Mark Complete
              </button>
            </div>

            {/* Completion confirmation */}
            {markedComplete && (
              <div style={{
                marginTop: 16,
                padding: '16px 20px',
                background: 'var(--color-success-bg)',
                borderRadius: 10,
                border: '1px solid var(--color-success-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Icon name="check" size={15} color="var(--color-success)" />
                <div>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-success)',
                    display: 'block',
                    marginBottom: 2,
                  }}>
                    Preparation Marked Complete
                  </span>
                  <span style={{
                    fontSize: 12.5,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    Checklist complete. Record completion in your QMS change control record.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
