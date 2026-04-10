import React from 'react';
import { Icon } from './Icon';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const section = this.props.section || 'This section';

    return (
      <div
        style={{
          padding: 'var(--space-xl)',
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-danger-border)',
            background: 'var(--color-danger-bg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-md)',
            }}
          >
            <Icon name="alertCircle" size={18} color="var(--color-danger)" />
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--color-danger)',
                margin: 0,
              }}
            >
              {section} encountered an error
            </h3>
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: '0 0 var(--space-md) 0',
            }}
          >
            An unexpected error occurred. Your assessment data is safe. Try retrying, or navigate to a different
            section.
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-sm)',
                overflow: 'auto',
                maxHeight: 120,
                marginBottom: 'var(--space-md)',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button onClick={this.handleRetry} className="btn-outline" style={{ fontSize: 13 }}>
            <Icon name="refresh" size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }
}
