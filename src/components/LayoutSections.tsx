import React from 'react';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { useLayoutContext } from '../contexts/LayoutContext';
import type { Block } from '../lib/assessment-engine';

export interface LayoutSummaryItem {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'success' | 'info';
}

interface LayoutHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSaveAssessment?: () => void;
  canSaveAssessment: boolean;
  saveLabel: string;
  onHome?: () => void;
  overallRequiredAnswered: number;
  overallRequiredTotal: number;
  overallAnswered: number;
  overallTotal: number;
  onReset?: () => void;
}

export const LayoutHeader: React.FC<LayoutHeaderProps> = React.memo(
  ({
    sidebarOpen,
    onToggleSidebar,
    onSaveAssessment,
    canSaveAssessment,
    saveLabel,
    onHome,
    overallRequiredAnswered,
    overallRequiredTotal,
    overallAnswered,
    overallTotal,
    onReset,
  }) => (
    <header
      style={{
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            display: 'none',
            padding: 'var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            background: 'transparent',
          }}
          className="mobile-menu-btn"
          aria-label="Open or close navigation"
        >
          <Icon name={sidebarOpen ? 'x' : 'menu'} size={20} />
        </button>

        <BrandMark />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {onSaveAssessment && (
          <button
            onClick={onSaveAssessment}
            disabled={!canSaveAssessment}
            data-testid="save-assessment-btn"
            className={`btn-sm ${canSaveAssessment ? 'btn-sm-primary' : ''}`}
            style={
              canSaveAssessment
                ? undefined
                : {
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    opacity: 0.7,
                    cursor: 'not-allowed',
                  }
            }
            title={saveLabel}
          >
            <Icon name="fileText" size={14} color={canSaveAssessment ? '#fff' : 'var(--color-text-muted)'} />
            <span className="hide-mobile">{saveLabel}</span>
          </button>
        )}
        {onHome && (
          <button onClick={onHome} className="btn-sm btn-sm-ghost" title="Return to dashboard">
            <Icon name="home" size={14} />
            <span className="hide-mobile">Home</span>
          </button>
        )}
        <div className="header-chip">
          <span className="header-chip-label">Pathway-critical</span>
          <span className="header-chip-value">
            {overallRequiredAnswered}/{overallRequiredTotal || 0}
          </span>
        </div>
        <div className="header-chip">
          <span className="header-chip-label">Responses</span>
          <span className="header-chip-value">
            {overallAnswered}/{overallTotal || 0}
          </span>
        </div>
        {onReset && (
          <button onClick={onReset} className="btn-sm btn-sm-danger-ghost" title="Reset assessment">
            <Icon name="refresh" size={14} />
            <span className="hide-mobile">Reset</span>
          </button>
        )}
      </div>
    </header>
  ),
);

interface LayoutSidebarProps {
  progress: number;
  currentMissingRequired: number;
  isReviewBlock: boolean;
  reviewReady: boolean;
  sidebarOpen: boolean;
}

export const LayoutSidebar: React.FC<LayoutSidebarProps> = React.memo(
  ({ progress, currentMissingRequired, isReviewBlock, reviewReady, sidebarOpen }) => {
    const {
      blocks,
      currentBlockIndex,
      onBlockSelect,
      completedBlocks,
      answeredCounts,
      totalCounts,
      requiredAnsweredCounts,
      requiredCounts,
      overallAnswered,
      overallTotal,
      overallRequiredAnswered,
      overallRequiredTotal,
    } = useLayoutContext();

    return (
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
        <div
          style={{
            padding: 'var(--space-md)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-sm)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Pathway-critical completion
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{progress}%</span>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: 'var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background:
                  currentMissingRequired > 0 && !isReviewBlock
                    ? 'var(--color-warning)'
                    : reviewReady
                      ? 'var(--color-success)'
                      : 'var(--color-primary)',
                borderRadius: 2,
                transition: 'width var(--transition-slow)',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-sm)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
            }}
          >
            <span>
              {overallRequiredAnswered}/{overallRequiredTotal || 0} pathway-critical
            </span>
            <span>
              {overallAnswered}/{overallTotal || 0} total responses
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, overflow: 'auto', padding: 'var(--space-sm)' }}>
          {blocks.map((block, index) => (
            <LayoutSidebarNavItem
              key={block.id}
              block={block}
              isCurrent={index === currentBlockIndex}
              onSelect={() => onBlockSelect(index)}
              answered={answeredCounts[block.id] || 0}
              total={totalCounts[block.id] || 0}
              requiredAnswered={requiredAnsweredCounts[block.id] || 0}
              requiredTotal={requiredCounts[block.id] || 0}
              isCompleted={block.id === 'review' ? reviewReady : completedBlocks.has(block.id)}
            />
          ))}
        </nav>

        <div
          style={{
            padding: 'var(--space-md)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: reviewReady ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
              border: `1px solid ${reviewReady ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              <Icon
                name={reviewReady ? 'checkCircle' : 'alertCircle'}
                size={14}
                color={reviewReady ? 'var(--color-success)' : 'var(--color-warning)'}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: reviewReady ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              >
                {reviewReady ? 'Fields complete — review available' : 'Pathway-critical fields remain'}
              </span>
            </div>
            <p
              style={{
                fontSize: 10,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {reviewReady
                ? 'All pathway-critical fields are answered. Review the determination, evidence gaps, and documentation needs before relying on the output.'
                : 'Complete remaining pathway-critical fields, then perform final review before relying on the determined pathway.'}
            </p>
          </div>
        </div>
      </aside>
    );
  },
);

interface LayoutSidebarNavItemProps {
  block: Block;
  isCurrent: boolean;
  onSelect: () => void;
  answered: number;
  total: number;
  requiredAnswered: number;
  requiredTotal: number;
  isCompleted: boolean;
}

const LayoutSidebarNavItem: React.FC<LayoutSidebarNavItemProps> = React.memo(
  ({ block, isCurrent, onSelect, answered, total, requiredAnswered, requiredTotal, isCompleted }) => {
    const missingRequired = Math.max(0, requiredTotal - requiredAnswered);
    const isReview = block.id === 'review';
    const isStarted = answered > 0 || isCurrent || isCompleted;
    const statusLabel = isReview
      ? isCompleted
        ? 'Fields complete — ready for final review'
        : 'Complete pathway-critical fields first'
      : missingRequired > 0
        ? `${missingRequired} pathway-critical field${missingRequired === 1 ? '' : 's'} open`
        : total > 0 && answered < total
          ? 'Pathway-critical complete; optional fields remain'
          : 'Complete';
    const indicatorBg = isCompleted
      ? 'var(--color-success)'
      : isCurrent
        ? 'var(--color-primary)'
        : isStarted
          ? 'var(--color-warning-bg)'
          : 'var(--color-bg-card)';
    const indicatorBorder =
      isCompleted || isCurrent
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
        onClick={onSelect}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-md)',
          width: '100%',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'left',
          background: isCurrent ? '#ecfeff' : isStarted ? '#ffffff' : 'transparent',
          border: isCurrent
            ? '1px solid #a5f3fc'
            : isStarted
              ? '1px solid var(--color-border-subtle)'
              : '1px solid transparent',
          boxShadow: isCurrent ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
          opacity: 1,
          cursor: 'pointer',
          marginBottom: 'var(--space-xs)',
          transition: 'all var(--transition-fast)',
        }}
      >
        <div
          style={{
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
          }}
        >
          {isCompleted ? (
            <Icon name="check" size={14} color="#fff" />
          ) : (
            <Icon name={block.icon} size={14} color={indicatorColor} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isCurrent ? 'var(--color-text)' : 'var(--color-text-secondary)',
              marginBottom: 2,
              lineHeight: 1.3,
            }}
          >
            {block.shortLabel}
          </div>
          {!isReview && total > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                fontSize: 11,
                color: 'var(--color-text-muted)',
              }}
            >
              <span>{statusLabel}</span>
              <span>
                {requiredAnswered}/{requiredTotal || 0} pathway-critical, {answered}/{total} total
              </span>
            </div>
          )}
          {isReview && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
              }}
            >
              {statusLabel}
            </div>
          )}
        </div>
      </button>
    );
  },
);

const summaryToneStyles: Record<
  NonNullable<LayoutSummaryItem['tone']>,
  { bg: string; color: string; border: string }
> = {
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

interface LayoutBlockHeaderProps {
  currentBlock: Block;
  isReviewBlock: boolean;
  caseSummary: LayoutSummaryItem[];
  overallAnswered: number;
  overallTotal: number;
  overallRequiredAnswered: number;
  overallRequiredTotal: number;
  reviewReady: boolean;
}

export const LayoutBlockHeader: React.FC<LayoutBlockHeaderProps> = React.memo(
  ({
    currentBlock,
    isReviewBlock,
    caseSummary,
    overallAnswered,
    overallTotal,
    overallRequiredAnswered,
    overallRequiredTotal,
    reviewReady,
  }) => (
    <div
      style={{
        padding: 'var(--space-lg) var(--space-xl)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-xs)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Block {currentBlock.id}
        </span>
      </div>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-text)',
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {currentBlock.label}
      </h1>
      {currentBlock.description && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.65,
            maxWidth: 840,
            margin: '10px 0 0',
          }}
        >
          {currentBlock.description}
        </p>
      )}
      {isReviewBlock && (
        <LayoutReviewSummary
          caseSummary={caseSummary}
          overallAnswered={overallAnswered}
          overallTotal={overallTotal}
          overallRequiredAnswered={overallRequiredAnswered}
          overallRequiredTotal={overallRequiredTotal}
          reviewReady={reviewReady}
        />
      )}
    </div>
  ),
);

interface LayoutReviewSummaryProps {
  caseSummary: LayoutSummaryItem[];
  overallAnswered: number;
  overallTotal: number;
  overallRequiredAnswered: number;
  overallRequiredTotal: number;
  reviewReady: boolean;
}

const LayoutReviewSummary: React.FC<LayoutReviewSummaryProps> = ({
  caseSummary,
  overallAnswered,
  overallTotal,
  overallRequiredAnswered,
  overallRequiredTotal,
  reviewReady,
}) => (
  <div
    style={{
      marginTop: 'var(--space-md)',
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
    }}
  >
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-sm)',
        marginBottom: caseSummary.length > 0 ? 'var(--space-sm)' : 0,
      }}
    >
      {[
        {
          label: 'Pathway-critical',
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
          value: reviewReady ? 'All pathway-critical fields complete' : 'Pathway-critical fields remain',
          tone: reviewReady ? ('success' as const) : ('warning' as const),
        },
      ].map((item) => (
        <LayoutSummaryPill key={item.label} item={item} />
      ))}
    </div>
    {caseSummary.length > 0 && (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
        }}
      >
        {caseSummary.map((item) => (
          <LayoutSummaryPill key={item.label} item={item} />
        ))}
      </div>
    )}
  </div>
);

const LayoutSummaryPill: React.FC<{ item: LayoutSummaryItem }> = ({ item }) => {
  const tone = summaryToneStyles[item.tone || 'default'];

  return (
    <div
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
      <span
        style={{
          fontSize: 12,
          fontWeight: item.label === 'Review status' ? 700 : 600,
          color: tone.color === 'var(--color-text)' ? 'var(--color-text)' : tone.color,
          lineHeight: 1.4,
        }}
      >
        {item.value}
      </span>
    </div>
  );
};

export const LayoutMobileOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.3)',
      zIndex: 40,
    }}
    className="sidebar-overlay"
  />
);
