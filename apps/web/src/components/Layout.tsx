import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLayoutContext } from '../contexts/LayoutContext';
import { LayoutBlockHeader, LayoutHeader, LayoutMobileOverlay, LayoutSidebar } from './LayoutSections';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const ctx = useLayoutContext();
  const {
    blocks,
    currentBlockIndex,
    requiredAnsweredCounts,
    requiredCounts,
    overallAnswered,
    overallTotal,
    overallRequiredAnswered,
    overallRequiredTotal,
    caseSummary,
    onReset,
    onHome,
    onSaveAssessment,
    canSaveAssessment,
    saveLabel,
  } = ctx;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Scroll main content to top when block changes
  useEffect(() => {
    if (typeof mainRef.current?.scrollTo === 'function') {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentBlockIndex]);

  const currentBlock = blocks[currentBlockIndex];
  const progress = overallRequiredTotal > 0 ? Math.round((overallRequiredAnswered / overallRequiredTotal) * 100) : 0;
  const currentRequiredAnswered = currentBlock ? requiredAnsweredCounts[currentBlock.id] || 0 : 0;
  const currentRequiredTotal = currentBlock ? requiredCounts[currentBlock.id] || 0 : 0;
  const currentMissingRequired = Math.max(0, currentRequiredTotal - currentRequiredAnswered);
  const isReviewBlock = currentBlock?.id === 'review';
  const reviewReady = overallRequiredTotal > 0 && overallRequiredAnswered === overallRequiredTotal;

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleResetRequest = useCallback(() => {
    if (!onReset) return;
    if (
      window.confirm(
        'Reset all assessment answers and return to the dashboard? Saved assessments and sample cases are not affected. This cannot be undone.',
      )
    ) {
      onReset();
    }
  }, [onReset]);

  return (
    <div className="layout-root">
      <LayoutHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onSaveAssessment={onSaveAssessment}
        canSaveAssessment={canSaveAssessment}
        saveLabel={saveLabel}
        onHome={onHome}
        overallRequiredAnswered={overallRequiredAnswered}
        overallRequiredTotal={overallRequiredTotal}
        overallAnswered={overallAnswered}
        overallTotal={overallTotal}
        onReset={onReset ? handleResetRequest : undefined}
      />

      <div className="layout-body">
        <LayoutSidebar
          progress={progress}
          currentMissingRequired={currentMissingRequired}
          isReviewBlock={Boolean(isReviewBlock)}
          reviewReady={reviewReady}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={handleCloseSidebar}
        />

        <main ref={mainRef} className="layout-main">
          {currentBlock && (
            <LayoutBlockHeader
              currentBlock={currentBlock}
              isReviewBlock={Boolean(isReviewBlock)}
              caseSummary={caseSummary}
              overallAnswered={overallAnswered}
              overallTotal={overallTotal}
              overallRequiredAnswered={overallRequiredAnswered}
              overallRequiredTotal={overallRequiredTotal}
              reviewReady={reviewReady}
            />
          )}

          <div className="layout-content">{children}</div>
        </main>
      </div>

      {sidebarOpen && <LayoutMobileOverlay onClose={handleCloseSidebar} />}
    </div>
  );
};
