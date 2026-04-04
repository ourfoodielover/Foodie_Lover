'use client';
import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error: string; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack?.slice(0, 300));
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg,#fff8f3,#fff0e8)', fontFamily: 'Poppins,sans-serif',
          padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#1A0800', fontWeight: 900, fontSize: '1.3rem', margin: '0 0 0.6rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#666', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {this.state.error}
            </p>
            <p style={{ color: '#999', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
              Your data is safe. This is usually a temporary issue.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: '' });
                window.location.reload();
              }}
              style={{
                background: '#E65C00', color: 'white', border: 'none', borderRadius: 10,
                padding: '0.75rem 1.75rem', fontWeight: 700, cursor: 'pointer',
                fontSize: '0.9rem', fontFamily: 'Poppins,sans-serif',
              }}
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
