import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useCreateCase, useMe } from '../../api/hooks';

export const CreateCasePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: me } = useMe();
  const createCase = useCreateCase();

  const [title, setTitle] = useState('');
  const [productId, setProductId] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [changeType, setChangeType] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createCase.mutateAsync({
        productId,
        title,
        changeSummary: changeSummary || null,
        changeType: changeType || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      navigate(`/cases/${result.id}`);
    } catch {
      // Error is in createCase.error
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Create Change Case</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Describe the change..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
              Product *
            </label>
            {productsLoading ? (
              <p style={{ color: '#6b7280' }}>Loading products...</p>
            ) : (
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="">Select a product...</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>{p.productName}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
              Change Summary
            </label>
            <textarea
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              rows={3}
              placeholder="Brief description of what is changing and why..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
              Change Type
            </label>
            <input
              type="text"
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              placeholder="e.g., Training Data, Model Architecture..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              />
            </div>
          </div>

          <div style={{ color: '#6b7280', fontSize: 13 }}>
            Case owner: <strong>{me?.user.name ?? 'Loading...'}</strong> (you)
          </div>

          {createCase.error && (
            <div style={{ color: '#dc2626', fontSize: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>
              {createCase.error.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCase.isPending}
              className="btn-continue"
            >
              {createCase.isPending ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
