import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100dvh', padding: '24px',
        textAlign: 'center', gap: '16px', color: 'var(--text-1)',
      }}>
        <div style={{ fontSize: '48px' }}>:(</div>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Something went wrong</div>
        <div style={{ fontSize: '14px', color: 'var(--text-3)', maxWidth: '400px' }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </div>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: '8px', padding: '12px 28px', borderRadius: '999px',
            background: 'var(--accent)', color: '#fff', fontSize: '15px',
            fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
