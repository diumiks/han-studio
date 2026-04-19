import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Route render error:', error, info);
  }

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <div style={{
          border: '0.5px solid var(--rule)',
          padding: 24,
          borderRadius: 2,
          background: 'var(--paper)',
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            marginBottom: 8,
          }}>
            Page error
          </div>
          <div className="font-serif" style={{
            fontSize: 20,
            fontStyle: 'italic',
            marginBottom: 10,
          }}>
            This page hit a runtime error.
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
          }}>
            {error.message || 'Unknown error'}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
