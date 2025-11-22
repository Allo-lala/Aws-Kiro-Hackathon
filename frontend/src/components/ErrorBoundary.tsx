import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors
 * Prevents the entire app from crashing when a component error occurs
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <h1 style={styles.title}>Oops! Something went wrong</h1>
            <p style={styles.message}>
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Development Only)</summary>
                <pre style={styles.errorText}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <button onClick={this.handleReset} style={styles.button}>
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles for the error boundary
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  content: {
    maxWidth: '600px',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#d32f2f',
    marginBottom: '16px',
  },
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  details: {
    textAlign: 'left' as const,
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    maxHeight: '300px',
    overflow: 'auto',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    marginBottom: '8px',
  },
  errorText: {
    fontSize: '12px',
    color: '#d32f2f',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: 'white',
    backgroundColor: '#1976d2',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    backgroundColor: '#757575',
  },
};
