import React from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useCase, FEATURE_FLAGS } from '../../api/hooks';
import { CaseOverviewTab } from '../components/CaseOverviewTab';
import { CaseAssessmentTab } from '../components/CaseAssessmentTab';
import { CaseHistoryTab } from '../components/CaseHistoryTab';
import { CasePlaceholderTab } from '../components/CasePlaceholderTab';

type TabId = 'overview' | 'assessment' | 'evidence' | 'comments' | 'reviews' | 'history' | 'export';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'comments', label: 'Comments' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'history', label: 'History' },
  { id: 'export', label: 'Export' },
];

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: changeCase, isLoading, error } = useCase(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabId = TABS.some((tab) => tab.id === tabParam) ? (tabParam as TabId) : 'overview';

  if (isLoading) {
    return <div className="case-detail-page loading-text">Loading case...</div>;
  }

  if (error || !changeCase) {
    return (
      <div className="case-detail-page">
        <p style={{ color: '#dc2626' }}>Case not found.</p>
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="case-detail-page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/" className="case-detail-back-link">
          &larr; All Cases
        </Link>
        <h1 className="case-detail-title">{changeCase.title}</h1>
        <p className="case-detail-subtitle">
          {changeCase.caseNumber} &middot; {changeCase.product.productName}
        </p>
      </div>

      {/* Tabs */}
      <div className="case-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSearchParams({ tab: tab.id })}
            className={`case-tab${activeTab === tab.id ? ' case-tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <CaseOverviewTab changeCase={changeCase} />}
      {activeTab === 'assessment' && id && <CaseAssessmentTab caseId={id} />}
      {activeTab === 'evidence' && (
        <CasePlaceholderTab
          title="Evidence"
          description="Upload supporting documents, link to test reports, and reference predicate device data. Coming in Phase 3."
          flagKey={FEATURE_FLAGS.EvidenceUploads}
        />
      )}
      {activeTab === 'comments' && (
        <CasePlaceholderTab
          title="Comments"
          description="Threaded discussion with @mentions and resolutions. Coming in Phase 3."
          flagKey={FEATURE_FLAGS.Comments}
        />
      )}
      {activeTab === 'reviews' && (
        <CasePlaceholderTab
          title="Reviews"
          description="Reviewer assignment, signoff workflow, and dual-signature approvals. Coming in Phase 4."
          flagKey={FEATURE_FLAGS.Reviews}
        />
      )}
      {activeTab === 'history' && id && <CaseHistoryTab caseId={id} />}
      {activeTab === 'export' && (
        <CasePlaceholderTab
          title="Export"
          description="Generate FDA-formatted PDF reports and audit-ready ZIP bundles. Coming in Phase 5."
          flagKey={FEATURE_FLAGS.Exports}
        />
      )}
    </div>
  );
};
