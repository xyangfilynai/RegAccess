import React, { useState } from 'react';
import { Icon } from './Icon';
import type { SavedAssessment } from '../lib/assessment-store';
import type { SampleCaseDefinition } from '../sample-cases';

interface DashboardPageProps {
  onFullAssessment: () => void;
  onResume: () => void;
  sampleCases: SampleCaseDefinition[];
  onOpenSampleCase: (id: string) => void;
  hasSavedSession: boolean;
  savedAssessments?: SavedAssessment[];
  onLoadAssessment?: (id: string) => void;
  onDuplicateAssessment?: (id: string) => void;
  onDeleteAssessment?: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onFullAssessment,
  onResume,
  sampleCases,
  onOpenSampleCase,
  hasSavedSession,
  savedAssessments = [],
  onLoadAssessment,
  onDuplicateAssessment,
  onDeleteAssessment,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const hasSavedWork = hasSavedSession || savedAssessments.length > 0;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="ChangePath" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            ChangePath
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: 840,
        margin: '0 auto',
        padding: '64px 40px 80px',
      }}>
        {/* Hero Section */}
        <div style={{ marginBottom: 72 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 16,
          }}>
            ChangePath
          </div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--color-text)',
            margin: '0 0 20px',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
          }}>
            Assess regulatory pathway for changes to AI-enabled medical devices
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.65,
            maxWidth: 720,
            margin: 0,
          }}>
            An early prototype for structured assessment of AI-related medical device changes. Review the authorized baseline, work through change classification and significance, and document a proposed pathway with supporting rationale and open issues.
          </p>
          <div style={{
            display: 'inline-block',
            marginTop: 20,
            padding: '6px 12px',
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-warning)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Prototype — decision support only
          </div>
        </div>

        {/* Primary Actions Section */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Resume Assessment Card */}
            {hasSavedSession && (
              <button
                onClick={onResume}
                data-testid="resume-btn"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  width: '100%',
                  padding: '20px 24px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-warning-bg)',
                  border: '1px solid var(--color-warning-border)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-warning-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name="clock" size={18} color="var(--color-warning)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                    Resume current assessment
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Continue the in-progress assessment stored in this browser.
                  </p>
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: 'var(--color-warning-border)',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-warning)',
                  marginTop: 4,
                  flexShrink: 0,
                }}>
                  In progress
                </div>
              </button>
            )}

            {/* Start Full Assessment Card */}
            <button
              onClick={onFullAssessment}
              data-testid="full-assessment-btn"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                width: '100%',
                padding: '20px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-bg)',
                border: '2px solid var(--color-info-border)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name="fileText" size={18} color="var(--color-primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                  Start full assessment
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Begin a new assessment from device profile through change classification, significance review, pathway assessment, and final review.
                </p>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'var(--color-info-border)',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginTop: 4,
                flexShrink: 0,
              }}>
                Full flow
              </div>
            </button>

          </div>
        </section>

        <section style={{ marginBottom: 72 }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            margin: '0 0 12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Sample library
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            margin: '0 0 24px',
            maxWidth: 720,
          }}>
            Browse nine realistic AI/ML change-review scenarios to see how the current workflow routes them. Samples open from source-controlled answers and do not replace the in-progress draft saved in this browser.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {sampleCases.map((sampleCase) => (
              <article
                key={sampleCase.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  padding: 20,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: 'var(--color-info-bg)',
                      border: '1px solid var(--color-info-border)',
                      color: 'var(--color-primary)',
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {sampleCase.authPathway}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.04em',
                  }}>
                    {sampleCase.id}
                  </span>
                </div>

                <div>
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    margin: '0 0 8px',
                    lineHeight: 1.35,
                  }}>
                    {sampleCase.title}
                  </h3>
                  <p style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.55,
                    margin: 0,
                  }}>
                    {sampleCase.shortScenario}
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gap: 12,
                }}>
                  <div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 6,
                    }}>
                      Expected outcome
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: 'var(--color-bg-hover)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-tertiary)',
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {sampleCase.expectedPathway}
                      </span>
                      {sampleCase.expectedPccpRecommendation && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: 'var(--color-info-bg)',
                          border: '1px solid var(--color-info-border)',
                          color: 'var(--color-primary)',
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          Recommends PCCP
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 6,
                    }}>
                      Tags
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {sampleCase.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            borderRadius: 999,
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: 'auto',
                }}>
                  <button
                    onClick={() => onOpenSampleCase(sampleCase.id)}
                    data-testid={`sample-case-open-${sampleCase.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'var(--color-primary)',
                      border: 'none',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Open sample
                    <Icon name="arrow" size={14} color="#fff" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Workflow Preview Section */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            margin: '0 0 24px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Workflow overview
          </h2>

          <div style={{
            padding: 24,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <ol style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16,
              margin: 0,
              paddingLeft: 0,
              listStylePosition: 'inside',
            }}>
              {[
                'Device profile',
                'Change classification',
                'Regulatory significance',
                'PCCP scope, when relevant',
                'GenAI checks, when relevant',
                'Population impact',
                'Final review',
              ].map((step, index) => (
                <li key={step} style={{
                  fontSize: 13,
                  color: 'var(--color-text)',
                  lineHeight: 1.5,
                  listStyleType: 'decimal',
                }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Saved Assessments Section */}
        {hasSavedWork && (
          <section style={{ marginBottom: 72 }}>
            {savedAssessments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {savedAssessments.map(assessment => {
                  const isConfirmingDelete = confirmDeleteId === assessment.id;

                  return (
                    <div
                      key={assessment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        transition: 'border-color var(--transition-fast)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {assessment.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {assessment.lastPathway && (
                            <span>{assessment.lastPathway}</span>
                          )}
                          <span>Updated {new Date(assessment.updatedAt).toLocaleDateString()}</span>
                          {assessment.reviewerNotes.length > 0 && (
                            <span>{assessment.reviewerNotes.length} note{assessment.reviewerNotes.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {onLoadAssessment && (
                          <button
                            onClick={() => onLoadAssessment(assessment.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 4,
                              background: 'var(--color-primary)',
                              border: 'none',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'background var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
                          >
                            Open
                          </button>
                        )}
                        {onDuplicateAssessment && (
                          <button
                            onClick={() => onDuplicateAssessment(assessment.id)}
                            title="Duplicate"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 4,
                              background: 'var(--color-bg-hover)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-tertiary)',
                              fontSize: 11,
                              cursor: 'pointer',
                              transition: 'all var(--transition-fast)',
                            }}
                          >
                            Duplicate
                          </button>
                        )}
                        {onDeleteAssessment && (
                          isConfirmingDelete ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => {
                                  onDeleteAssessment(assessment.id);
                                  setConfirmDeleteId(null);
                                }}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 4,
                                  background: 'var(--color-danger-bg)',
                                  border: '1px solid var(--color-danger-border)',
                                  color: 'var(--color-danger)',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all var(--transition-fast)',
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 4,
                                  background: 'var(--color-bg-hover)',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-text-tertiary)',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  transition: 'all var(--transition-fast)',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(assessment.id)}
                              title="Delete"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 4,
                                background: 'var(--color-bg-hover)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                fontSize: 11,
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                              }}
                            >
                              Delete
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Disclaimer Section */}
        <section>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-warning)',
            margin: '0 0 16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Prototype use and limitations
          </h2>

          <div style={{
            padding: 20,
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <p style={{
              fontSize: 13,
              color: 'var(--color-warning)',
              lineHeight: 1.65,
              margin: 0,
            }}>
              ChangePath is an early prototype intended to support structured internal assessment. It does not provide a regulatory determination and does not replace qualified regulatory, legal, clinical, quality, or engineering judgment. Outputs should be reviewed before reliance or action.
            </p>
          </div>
        </section>
      </main>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          main {
            padding: 48px 24px 60px !important;
          }
          header {
            padding: 0 24px !important;
          }
        }
        @media (max-width: 480px) {
          main {
            padding: 40px 16px 60px !important;
          }
          header {
            padding: 0 16px !important;
          }
          h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};
