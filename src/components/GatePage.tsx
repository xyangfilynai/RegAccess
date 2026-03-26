import React, { useState } from 'react';
import { Icon } from './Icon';

interface GatePageProps {
  onEnter: () => void;
}

export const GatePage: React.FC<GatePageProps> = ({ onEnter }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter your invite code.');
      return;
    }
    if (trimmed.length < 3) {
      setError("That doesn\u2019t look like a valid invite code.");
      return;
    }
    onEnter();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f0fdfa 100%)',
      padding: 'var(--space-xl)',
    }}>
      <div style={{
        maxWidth: 980,
        width: '100%',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'stretch',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 36px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(8,145,178,0.08), rgba(16,185,129,0.08))',
          border: '1px solid #bae6fd',
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 28,
            }}>
              <img
                src="/logo.png"
                alt="RegAssess"
                style={{
                  width: 42,
                  height: 42,
                  objectFit: 'contain',
                }}
              />
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}>
                  <span style={{
                    fontSize: 21,
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                  }}>
                    RegAssess
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: '#dcfce7',
                    color: '#15803d',
                    letterSpacing: '0.03em',
                  }}>
                    AI/ML
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#475569' }}>
                  Internal regulatory change-assessment workspace
                </div>
              </div>
            </div>

            <h1 style={{
              fontSize: 34,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: '0 0 14px',
            }}>
              Review AI/ML model changes against the authorized baseline.
            </h1>
            <p style={{
              fontSize: 15,
              color: '#475569',
              lineHeight: 1.7,
              margin: '0 0 24px',
              maxWidth: 560,
            }}>
              Designed for regulatory, ML, quality, and clinical experts who need a clear internal workflow for pathway analysis, evidence gaps, review notes, and documentation planning.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}>
            {[
              {
                title: 'Restricted access',
                body: 'Invite code controls access to internal evaluation builds and regulated workflow content.',
                icon: 'lock',
              },
              {
                title: 'Expert-use workflow',
                body: 'Outputs are structured for expert review, not autonomous submission decisions.',
                icon: 'users',
              },
              {
                title: 'Decision support only',
                body: 'Use for internal planning, documentation, and escalation tracking before formal RA sign-off.',
                icon: 'shield',
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.72)',
                  border: '1px solid rgba(186,230,253,0.9)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}>
                  <Icon name={item.icon} size={14} color="#0891b2" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                    {item.title}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, margin: 0 }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: '32px 28px',
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid #dbeafe',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}>
            <Icon name="lock" size={15} color="#0891b2" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0891b2', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              Access RegAssess
            </span>
          </div>

          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 10px',
            lineHeight: 1.2,
          }}>
            Enter your invite code
          </h2>
          <p style={{
            fontSize: 14,
            color: '#6b7280',
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}>
            Use the access code provided by your organization or pilot administrator to enter the assessment workspace.
          </p>

          <label style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#475569',
            marginBottom: 8,
          }}>
            Invite code
          </label>
          <div style={{
            display: 'flex',
            gap: 10,
            marginBottom: 12,
          }}>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. RA-7K2M"
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 8,
                border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
                fontSize: 14,
                outline: 'none',
                background: '#ffffff',
                transition: 'border-color 0.15s ease',
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                background: '#0f172a',
                border: 'none',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0f172a';
              }}
            >
              Continue
            </button>
          </div>

          {error && (
            <p style={{
              fontSize: 13,
              color: '#ef4444',
              margin: '0 0 14px',
            }}>
              {error}
            </p>
          )}

          <div style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Intended users
            </div>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55, margin: 0 }}>
              Regulatory affairs, ML engineering, quality, clinical, and safety reviewers evaluating post-market AI/ML device changes.
            </p>
          </div>

          <p style={{
            fontSize: 12,
            color: '#94a3b8',
            margin: 0,
            lineHeight: 1.55,
          }}>
            Decision support only. Invite codes are distributed through the pilot or organization onboarding process.
          </p>
        </div>
      </div>
    </div>
  );
};
