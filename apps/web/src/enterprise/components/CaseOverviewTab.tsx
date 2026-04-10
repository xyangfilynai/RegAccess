import React from 'react';

interface CaseData {
  id: string;
  caseNumber: string;
  title: string;
  changeSummary: string | null;
  changeType: string | null;
  status: string;
  priority: string;
  currentDecision: string | null;
  currentVersion: number;
  engineVersion: string;
  dueDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  product: { productName: string };
  caseOwner: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
}

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

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 14 }}>{children}</div>
  </div>
);

export const CaseOverviewTab: React.FC<{ changeCase: CaseData }> = ({ changeCase }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
      <div>
        <Field label="Status">
          <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 500, background: '#f3f4f6' }}>
            {STATUS_LABELS[changeCase.status] ?? changeCase.status}
          </span>
        </Field>
        <Field label="Current Decision">
          <span style={{ fontWeight: 600, color: changeCase.currentDecision ? '#059669' : '#9ca3af' }}>
            {changeCase.currentDecision ?? 'Not yet determined'}
          </span>
        </Field>
        <Field label="Change Summary">
          {changeCase.changeSummary ?? '—'}
        </Field>
        <Field label="Change Type">
          {changeCase.changeType ?? '—'}
        </Field>
        <Field label="Priority">
          <span style={{ fontWeight: 500 }}>{changeCase.priority}</span>
        </Field>
      </div>
      <div>
        <Field label="Product">{changeCase.product.productName}</Field>
        <Field label="Case Owner">{changeCase.caseOwner?.name ?? '—'}</Field>
        <Field label="Created By">{changeCase.createdBy?.name ?? '—'}</Field>
        <Field label="Engine Version">{changeCase.engineVersion}</Field>
        <Field label="Version">{changeCase.currentVersion}</Field>
        <Field label="Due Date">
          {changeCase.dueDate ? new Date(changeCase.dueDate).toLocaleDateString() : '—'}
        </Field>
        <Field label="Created">
          {new Date(changeCase.createdAt).toLocaleDateString()}
        </Field>
      </div>
    </div>
  );
};
