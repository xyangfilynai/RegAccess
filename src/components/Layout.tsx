import React, { useState } from 'react';
import { Icon } from './Icon';
import type { Block } from '../lib/assessment-engine';

interface LayoutProps {
  children: React.ReactNode;
  blocks: Block[];
  currentBlockIndex: number;
  onBlockSelect: (index: number) => void;
  completedBlocks: Set<string>;
  answeredCounts: Record<string, number>;
  totalCounts: Record<string, number>;
  onReset?: () => void;
  onHome?: () => void;
  onSave?: () => void;
  onSaveAndNew?: () => void;
  saveNotice?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  blocks,
  currentBlockIndex,
  onBlockSelect,
  completedBlocks,
  answeredCounts,
  totalCounts,
  onReset,
  onHome,
  onSave,
  onSaveAndNew,
  saveNotice,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentBlock = blocks[currentBlockIndex];
  const progress = blocks.length > 0 
    ? Math.round((currentBlockIndex / (blocks.length - 1)) * 100) 
    : 0;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <img 
              src="/logo.png" 
              alt="RegAssess Logo" 
              style={{
                width: 36,
                height: 36,
                objectFit: 'contain',
              }}
            />
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}>
              RegAssess
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary-muted)',
              color: 'var(--color-primary)',
              marginLeft: 4,
            }}>
              AI/ML
            </span>
          </div>
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
          {onSave && (
            <button
              onClick={onSave}
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
              title="Save assessment"
            >
              <Icon name="check" size={14} />
              <span className="hide-mobile">Save</span>
            </button>
          )}
          {onSaveAndNew && (
            <button
              onClick={onSaveAndNew}
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
              title="Save current assessment and start a new one"
            >
              <Icon name="fileText" size={14} />
              <span className="hide-mobile">Save &amp; New</span>
            </button>
          )}
          {saveNotice && (
            <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 500 }}>
              {saveNotice}
            </span>
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
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Progress</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{progress}%</span>
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
                Assessment Progress
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                {currentBlockIndex + 1} of {blocks.length}
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
                background: 'var(--color-primary)',
                borderRadius: 2,
                transition: 'width var(--transition-slow)',
              }} />
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, overflow: 'auto', padding: 'var(--space-sm)' }}>
            {blocks.map((block, index) => {
              const isCurrent = index === currentBlockIndex;
              const isCompleted = completedBlocks.has(block.id);
              const isPast = index < currentBlockIndex;
              const answered = answeredCounts[block.id] || 0;
              const total = totalCounts[block.id] || 0;
              const isReview = block.id === 'review';
              const canNavigate = isPast || isCurrent || isCompleted;

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
                    background: isCurrent ? '#ecfeff' : 'transparent',
                    border: isCurrent ? '1px solid #a5f3fc' : '1px solid transparent',
                    boxShadow: isCurrent ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                    opacity: canNavigate ? 1 : 0.5,
                    cursor: canNavigate ? 'pointer' : 'not-allowed',
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
                    background: isCompleted || isPast
                      ? 'var(--color-success)'
                      : isCurrent
                        ? 'var(--color-primary)'
                        : 'var(--color-bg-card)',
                    border: isCompleted || isPast || isCurrent
                      ? 'none'
                      : '1px solid var(--color-border)',
                    transition: 'all var(--transition-fast)',
                  }}>
                    {isCompleted || isPast ? (
                      <Icon name="check" size={14} color="#fff" />
                    ) : (
                      <Icon 
                        name={block.icon} 
                        size={14} 
                        color={isCurrent ? '#fff' : 'var(--color-text-muted)'} 
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
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                      }}>
                        {answered} of {total} answered
                      </div>
                    )}
                    {isReview && (
                      <div style={{
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                      }}>
                        Review assessment
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
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-xs)',
              }}>
                <Icon name="alertCircle" size={14} color="var(--color-warning)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-warning)' }}>
                  Advisory Tool
                </span>
              </div>
              <p style={{
                fontSize: 10,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}>
                For internal use only. Not for formal regulatory submissions.
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{
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
