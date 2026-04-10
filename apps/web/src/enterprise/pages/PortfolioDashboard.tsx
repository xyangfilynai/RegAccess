import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCases, useProducts, useMe } from '../../api/hooks';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_authoring: 'In Authoring',
  in_cross_functional_review: 'In Review',
  changes_requested: 'Changes Requested',
  approval_pending: 'Approval Pending',
  approved: 'Approved',
  exported: 'Exported',
  reopened: 'Reopened',
  archived: 'Archived',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  medium: '#2563eb',
  high: '#d97706',
  critical: '#dc2626',
};

export const PortfolioDashboard: React.FC = () => {
  const { data: me } = useMe();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const { data: cases, isLoading: casesLoading } = useCases({
    status: statusFilter || undefined,
    productId: productFilter || undefined,
  });
  const { data: products } = useProducts();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Change Cases</h1>
          {me && (
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 14 }}>
              {me.organization.name} &middot; {me.user.name}
            </p>
          )}
        </div>
        <Link to="/cases/new" className="btn-continue" style={{ textDecoration: 'none' }}>
          + New Case
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
        >
          <option value="">All products</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.productName}
            </option>
          ))}
        </select>
      </div>

      {/* Cases table */}
      {casesLoading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Loading cases...</div>
      ) : !cases?.length ? (
        <div className="card-sm" style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
          No cases found. <Link to="/cases/new">Create one</Link> to get started.
        </div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Case #</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Title</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Product</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Decision</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Priority</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Owner</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <Link to={`/cases/${c.id}`} style={{ fontWeight: 500 }}>
                      {c.caseNumber}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <Link to={`/cases/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {c.title}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7280' }}>{c.product.productName}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: '#f3f4f6',
                      }}
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 13 }}>{c.currentDecision ?? '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ color: PRIORITY_COLORS[c.priority] ?? '#6b7280', fontWeight: 500, fontSize: 13 }}>
                      {c.priority}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7280' }}>{c.caseOwner?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
