import React from 'react';
import { useCaseHistory } from '../../api/hooks';

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
};

export const CaseHistoryTab: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { data: events, isLoading } = useCaseHistory(caseId);

  if (isLoading) {
    return <div style={{ padding: 32, color: '#6b7280' }}>Loading history...</div>;
  }

  if (!events?.length) {
    return <div style={{ padding: 32, color: '#6b7280' }}>No audit events recorded yet.</div>;
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Audit Trail</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((event, idx) => (
          <div
            key={event.id}
            style={{
              display: 'flex',
              gap: 16,
              padding: '12px 0',
              borderBottom: idx < events.length - 1 ? '1px solid #f3f4f6' : undefined,
            }}
          >
            {/* Timeline dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 20 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: event.action === 'create' ? '#2563eb' : '#9ca3af',
                marginTop: 4,
              }} />
              {idx < events.length - 1 && (
                <div style={{ width: 1, flex: 1, background: '#e5e7eb', marginTop: 4 }} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>
                <strong>{event.performedBy.name}</strong>{' '}
                <span style={{ color: '#6b7280' }}>
                  {ACTION_LABELS[event.action] ?? event.action}
                </span>{' '}
                <span style={{ color: '#6b7280' }}>{event.entityType.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                {new Date(event.performedAt).toLocaleString()}
              </div>
              {event.reason && (
                <div style={{ fontSize: 13, color: '#374151', marginTop: 4, fontStyle: 'italic' }}>
                  {event.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
