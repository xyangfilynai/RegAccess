import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCase } from '../../api/hooks';
import { CaseOverviewTab } from '../components/CaseOverviewTab';
import { CaseAssessmentTab } from '../components/CaseAssessmentTab';
import { CaseHistoryTab } from '../components/CaseHistoryTab';

type TabId = 'overview' | 'assessment' | 'history';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'history', label: 'History' },
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
      {activeTab === 'history' && id && <CaseHistoryTab caseId={id} />}
    </div>
  );
};
