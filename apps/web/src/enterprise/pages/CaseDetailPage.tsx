import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', color: '#6b7280' }}>Loading case...</div>
    );
  }

  if (error || !changeCase) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <p style={{ color: '#dc2626' }}>Case not found.</p>
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/" style={{ fontSize: 13, color: '#6b7280' }}>
          &larr; All Cases
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 4px' }}>{changeCase.title}</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
          {changeCase.caseNumber} &middot; {changeCase.product.productName}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.id ? '#2563eb' : 'transparent',
              cursor: 'pointer',
            }}
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
