import React from 'react';
import { Icon } from './Icon';

/** Creates onMouseEnter/onMouseLeave handlers for border-color + boxShadow hover effects. */
const hoverHandlers = (hoverBorder: string, restBorder: string) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = hoverBorder;
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = restBorder;
    e.currentTarget.style.boxShadow = 'none';
  },
});

interface DashboardPageProps {
  onQuickReview: () => void;
  onFullAssessment: () => void;
  onResume: () => void;
  hasSavedSession: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onQuickReview,
  onFullAssessment,
  onResume,
  hasSavedSession,
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        height: 72,
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="RegAssess" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
            RegAssess
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 4,
            background: '#f0fdf4',
            color: '#15803d',
            letterSpacing: '0.02em',
          }}>
            AI/ML
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          Change Assessment Tool
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: 880,
        margin: '0 auto',
        padding: '56px 40px 80px',
      }}>
        {/* Page Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#111827',
            margin: '0 0 12px',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            AI/ML Device Change Assessment
          </h1>
          <p style={{
            fontSize: 15,
            color: '#6b7280',
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 560,
          }}>
            U.S.-primary regulatory pathway analysis with escalation cues for EU, UK, Canada, Japan, and China.
          </p>
        </div>

        {/* Action Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 56 }}>
          
          {/* Quick Expert Review - Recommended */}
          <button
            onClick={onQuickReview}
            data-testid="quick-review-btn"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 20,
              padding: '24px 28px',
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid #d1fae5',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              position: 'relative',
            }}
            {...hoverHandlers('#86efac', '#d1fae5')}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="zap" size={20} color="#16a34a" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#111827',
                }}>
                  Guided Example
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: '#dcfce7',
                  color: '#15803d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  Sample Case
                </span>
              </div>
              <p style={{
                fontSize: 14,
                color: '#6b7280',
                margin: 0,
                lineHeight: 1.55,
              }}>
                Walk through a pre-filled sample case to see how the assessment works. Review and adjust responses, then view the determination.
              </p>
              <p style={{
                fontSize: 12,
                color: '#9ca3af',
                margin: '10px 0 0',
                lineHeight: 1.5,
                paddingTop: 10,
                borderTop: '1px solid #f3f4f6',
              }}>
                Example: New clinical sites with different scanners and demographics, no PCCP established.
              </p>
            </div>
            <Icon name="arrow" size={18} color="#9ca3af" style={{ marginTop: 4 }} />
          </button>

          {/* Full Assessment */}
          <button
            onClick={onFullAssessment}
            data-testid="full-assessment-btn"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 20,
              padding: '24px 28px',
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            {...hoverHandlers('#d1d5db', '#e5e7eb')}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="fileText" size={20} color="#4b5563" />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#111827',
                display: 'block',
                marginBottom: 6,
              }}>
                Full Assessment
              </span>
              <p style={{
                fontSize: 14,
                color: '#6b7280',
                margin: 0,
                lineHeight: 1.55,
              }}>
                Complete the full regulatory workflow for your device. Includes U.S. pathway determination and non-U.S. escalation cues.
              </p>
            </div>
            <Icon name="arrow" size={18} color="#9ca3af" style={{ marginTop: 4 }} />
          </button>

          {/* Resume Session */}
          {hasSavedSession && (
            <button
              onClick={onResume}
              data-testid="resume-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 28px',
                borderRadius: 8,
                background: '#fefce8',
                border: '1px solid #fef08a',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
              {...hoverHandlers('#fde047', '#fef08a')}
            >
              <Icon name="clock" size={18} color="#ca8a04" />
              <div style={{ flex: 1 }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#854d0e',
                }}>
                  Resume In-Progress Assessment
                </span>
              </div>
              <Icon name="arrow" size={16} color="#ca8a04" />
            </button>
          )}
        </div>

        {/* How It Works */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <h2 style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#9ca3af',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Assessment Workflow
            </h2>
            <div style={{
              height: 1,
              flex: 1,
              background: '#e5e7eb',
              marginLeft: 20,
            }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            background: '#e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {[
              {
                step: '1',
                title: 'Device Profile',
                desc: 'Authorization pathway, PCCP status, target markets, safety classification',
              },
              {
                step: '2',
                title: 'Change Assessment',
                desc: 'Change classification, intended use impact, significance, PCCP scope, and supplemental checks',
              },
              {
                step: '3',
                title: 'Bias & Jurisdictions',
                desc: 'Population impact, subgroup equity, plus escalation cues for EU, UK, Canada, Japan, and China',
              },
              {
                step: '4',
                title: 'Determination',
                desc: 'Pathway recommendation, regulatory reasoning, consistency checks, and documentation requirements',
              },
            ].map((s, i) => (
              <div
                key={s.step}
                style={{
                  padding: '24px 20px',
                  background: '#ffffff',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#9ca3af',
                    letterSpacing: '0.02em',
                  }}>
                    STEP {s.step}
                  </span>
                  {i < 3 && (
                    <div style={{
                      flex: 1,
                      height: 1,
                      background: '#e5e7eb',
                    }} />
                  )}
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: 6,
                }}>
                  {s.title}
                </div>
                <div style={{
                  fontSize: 13,
                  color: '#6b7280',
                  lineHeight: 1.5,
                }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Note */}
        <div style={{
          marginTop: 48,
          padding: '16px 20px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
        }}>
          <p style={{
            fontSize: 12,
            color: '#6b7280',
            margin: 0,
            lineHeight: 1.6,
          }}>
            <strong style={{ color: '#374151', fontWeight: 600 }}>Decision support only — not a regulatory determination.</strong>{' '}
            This tool supports internal change-control planning and regulatory strategy discussions.
            It does not replace expert regulatory judgment, legal advice, or formal submission decisions.
            All outputs require review by qualified regulatory and clinical professionals before action.
          </p>
        </div>
      </main>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          main {
            padding: 32px 20px 60px !important;
          }
          header {
            padding: 0 20px !important;
          }
          [style*="grid-template-columns: repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          [style*="grid-template-columns: repeat(4, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
