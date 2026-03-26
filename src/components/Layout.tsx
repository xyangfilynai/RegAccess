import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { BrandMark } from './BrandMark';
import type { Block } from '../lib/assessment-engine';

interface SummaryItem {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'success' | 'info';
}

interface LayoutProps {
  children: React.ReactNode;
  blocks: Block[];
  currentBlockIndex: number;
  onBlockSelect: (index: number) => void;
  completedBlocks: Set<string>;
  answeredCounts: Record<string, number>;
  totalCounts: Record<string, number>;
  requiredAnsweredCounts?: Record<string, number>;
  requiredCounts?: Record<string, number>;
  overallAnswered?: number;
  overallTotal?: number;
  overallRequiredAnswered?: number;
  overallRequiredTotal?: number;
  caseSummary?: SummaryItem[];
  onReset?: () => void;
  onHome?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  blocks,
  currentBlockIndex,
  onBlockSelect,
  completedBlocks,
  answeredCounts,
  totalCounts,
  requiredAnsweredCounts = {},
  requiredCounts = {},
  overallAnswered = 0,
  overallTotal = 0,
  overallRequiredAnswered = 0,
  overallRequiredTotal = 0,
  caseSummary = [],
  onReset,
  onHome,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Scroll main content to top when block changes
  useEffect(() => {
    if (typeof mainRef.current?.scrollTo === 'function') {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentBlockIndex]);

  const currentBlock = blocks[currentBlockIndex];
  const progress = overallRequiredTotal > 0
    ? Math.round((overallRequiredAnswered / overallRequiredTotal) * 100)
    : 0;
  const currentRequiredAnswered = currentBlock ? (requiredAnsweredCounts[currentBlock.id] || 0) : 0;
  const currentRequiredTotal = currentBlock ? (requiredCounts[currentBlock.id] || 0) : 0;
  const currentMissingRequired = Math.max(0, currentRequiredTotal - currentRequiredAnswered);
  const isReviewBlock = currentBlock?.id === 'review';
  const reviewReady = overallRequiredTotal > 0 && overallRequiredAnswered === overallRequiredTotal;

  const summaryToneStyles: Record<NonNullable<SummaryItem['tone']>, { bg: string; color: string; border: string }> = {
    default: {
      bg: 'var(--color-bg-card)',
      color: 'var(--color-text)',
      border: 'var(--color-border)',
    },
    warning: {
      bg: 'var(--color-warning-bg)',
      color: 'var(--color-warning)',
      border: 'var(--color-warning-border)',
    },
    success: {
      bg: 'var(--color-success-bg)',
      color: 'var(--color-success)',
      border: 'var(--color-success-border)',
    },
    info: {
      bg: 'var(--color-info-bg)',
      color: 'var(--color-info)',
      border: 'var(--color-info-border)',
    },
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
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
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: 'none',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              background: 'transparent',
            }}
            className="mobile-menu-btn"
            aria-label="Toggle navigation"
          >
            <Icon name={sidebarOpen ? 'x' : 'menu'} size={20} />
          </button>
          
          {/* Logo */}
          <BrandMark />
        </div>

        {/* Header right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {onHome && (
            <button
              onClick={onHome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              title="Return to dashboard"
            >
              <Icon name="home" size={14} />
              <span className="hide-mobile">Home</span>
            </button>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Required completion</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              {overallRequiredAnswered}/{overallRequiredTotal || 0}
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Responses</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              {overallAnswered}/{overallTotal || 0}
            </span>
          </div>
          {onReset && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to reset all answers and start over? This cannot be undone.')) {
                  onReset();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-danger)';
                e.currentTarget.style.color = 'var(--color-danger)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
              title="Reset assessment"
            >
              <Icon name="refresh" size={14} />
              <span className="hide-mobile">Reset</span>
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 280,
            borderRight: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'transform var(--transition-base)',
          }}
          className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        >
          {/* Progress bar */}
          <div style={{
            padding: 'var(--space-md)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-sm)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                Assessment Readiness
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                {progress}%
              </span>
            </div>
            <div style={{
              height: 4,
              borderRadius: 2,
              background: 'var(--color-border)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: currentMissingRequired > 0 && !isReviewBlock
                  ? 'var(--color-warning)'
                  : reviewReady
                    ? 'var(--color-success)'
                    : 'var(--color-primary)',
                borderRadius: 2,
                transition: 'width var(--transition-slow)',
              }} />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-sm)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
            }}>
              <span>{overallRequiredAnswered}/{overallRequiredTotal || 0} required answered</span>
              <span>{overallAnswered}/{overallTotal || 0} total responses</span>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, overflow: 'auto', padding: 'var(--space-sm)' }}>
            {blocks.map((block, index) => {
              const isCurrent = index === currentBlockIndex;
              const answered = answeredCounts[block.id] || 0;
              const total = totalCounts[block.id] || 0;
              const requiredAnswered = requiredAnsweredCounts[block.id] || 0;
              const requiredTotal = requiredCounts[block.id] || 0;
              const missingRequired = Math.max(0, requiredTotal - requiredAnswered);
              const isReview = block.id === 'review';
              const isCompleted = isReview
                ? reviewReady
                : completedBlocks.has(block.id);
              const canNavigate = true;
              const isStarted = answered > 0 || isCurrent || isCompleted;
              const statusLabel = isReview
                ? reviewReady
                  ? 'Ready for final review'
                  : 'Use to inspect blockers and the final determination'
                : missingRequired > 0
                  ? `${missingRequired} blocker${missingRequired === 1 ? '' : 's'} remaining`
                  : total > 0 && answered < total
                    ? 'Required complete; optional context available'
                    : 'Complete';
              const indicatorBg = isCompleted
                ? 'var(--color-success)'
                : isCurrent
                  ? 'var(--color-primary)'
                  : isStarted
                    ? 'var(--color-warning-bg)'
                    : 'var(--color-bg-card)';
              const indicatorBorder = isCompleted || isCurrent
                ? 'none'
                : isStarted
                  ? '1px solid var(--color-warning-border)'
                  : '1px solid var(--color-border)';
              const indicatorColor = isCompleted
                ? '#fff'
                : isCurrent
                  ? '#fff'
                  : isStarted
                    ? 'var(--color-warning)'
                    : 'var(--color-text-muted)';

              return (
                <button
                  key={block.id}
                  onClick={() => canNavigate && onBlockSelect(index)}
                  disabled={!canNavigate}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-md)',
                    width: '100%',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'left',
                    background: isCurrent ? '#ecfeff' : isStarted ? '#ffffff' : 'transparent',
                    border: isCurrent ? '1px solid #a5f3fc' : isStarted ? '1px solid var(--color-border-subtle)' : '1px solid transparent',
                    boxShadow: isCurrent ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                    opacity: 1,
                    cursor: 'pointer',
                    marginBottom: 'var(--space-xs)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {/* Step indicator */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: indicatorBg,
                    border: indicatorBorder,
                    transition: 'all var(--transition-fast)',
                  }}>
                    {isCompleted ? (
                      <Icon name="check" size={14} color="#fff" />
                    ) : (
                      <Icon 
                        name={block.icon} 
                        size={14} 
                        color={indicatorColor} 
                      />
                    )}
                  </div>

                  {/* Block info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isCurrent ? 'var(--color-text)' : 'var(--color-text-secondary)',
                      marginBottom: 2,
                      lineHeight: 1.3,
                    }}>
                      {block.shortLabel}
                    </div>
                    {!isReview && total > 0 && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                      }}>
                        <span>{statusLabel}</span>
                        <span>{requiredAnswered}/{requiredTotal || 0} required, {answered}/{total} total</span>
                      </div>
                    )}
                    {isReview && (
                      <div style={{
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                      }}>
                        {statusLabel}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div style={{
            padding: 'var(--space-md)',
            borderTop: '1px solid var(--color-border)',
          }}>
            <div style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: reviewReady ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
              border: `1px solid ${reviewReady ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-xs)',
              }}>
                <Icon
                  name={reviewReady ? 'checkCircle' : 'alertCircle'}
                  size={14}
                  color={reviewReady ? 'var(--color-success)' : 'var(--color-warning)'}
                />
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: reviewReady ? 'var(--color-success)' : 'var(--color-warning)',
                }}>
                  {reviewReady ? 'Ready For Review' : 'Expert Review Needed'}
                </span>
              </div>
              <p style={{
                fontSize: 10,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}>
                {reviewReady
                  ? 'All visible pathway-critical questions are answered. Review reasoning, evidence gaps, and documentation needs before relying on the result.'
                  : 'Resolve remaining blockers and then complete final review before relying on the pathway recommendation.'}
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main ref={mainRef} style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Block header */}
          {currentBlock && (
            <div style={{
              padding: 'var(--space-lg) var(--space-xl)',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-xs)',
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Block {currentBlock.id}
                </span>
              </div>
              <h1 style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: 0,
                lineHeight: 1.3,
              }}>
                {currentBlock.label}
              </h1>
              {currentBlock.description && (
                <p style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.65,
                  maxWidth: 840,
                  margin: '10px 0 0',
                }}>
                  {currentBlock.description}
                </p>
              )}
              {isReviewBlock && (
                <div style={{
                  marginTop: 'var(--space-md)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                }}>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-sm)',
                    marginBottom: caseSummary.length > 0 ? 'var(--space-sm)' : 0,
                  }}>
                    {[
                      {
                        label: 'Required completion',
                        value: `${overallRequiredAnswered}/${overallRequiredTotal || 0}`,
                        tone: 'default' as const,
                      },
                      {
                        label: 'Responses',
                        value: `${overallAnswered}/${overallTotal || 0}`,
                        tone: 'default' as const,
                      },
                      {
                        label: 'Review status',
                        value: reviewReady ? 'All required questions answered' : 'Required questions still open',
                        tone: reviewReady ? 'success' as const : 'warning' as const,
                      },
                    ].map((item) => {
                      const tone = summaryToneStyles[item.tone];
                      return (
                        <div
                          key={item.label}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 10px',
                            borderRadius: '999px',
                            background: tone.bg,
                            border: `1px solid ${tone.border}`,
                          }}
                        >
                          <span style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>{item.label}</span>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: tone.color === 'var(--color-text)' ? 'var(--color-text)' : tone.color,
                          }}>
                            {item.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {caseSummary.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--space-sm)',
                    }}>
                      {caseSummary.map((item) => {
                        const tone = summaryToneStyles[item.tone || 'default'];
                        return (
                          <div
                            key={item.label}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 10px',
                              borderRadius: '999px',
                              background: tone.bg,
                              border: `1px solid ${tone.border}`,
                              maxWidth: '100%',
                            }}
                          >
                            <span style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>{item.label}</span>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: tone.color === 'var(--color-text)' ? 'var(--color-text)' : tone.color,
                              lineHeight: 1.4,
                            }}>
                              {item.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content area */}
          <div style={{
            flex: 1,
            padding: 'var(--space-xl)',
            maxWidth: 800,
            width: '100%',
            margin: '0 auto',
          }}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.3)',
            zIndex: 40,
          }}
          className="sidebar-overlay"
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
          .sidebar {
            position: fixed;
            left: 0;
            top: 64px;
            bottom: 0;
            z-index: 50;
            transform: translateX(-100%);
          }
          .sidebar-open {
            transform: translateX(0) !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
