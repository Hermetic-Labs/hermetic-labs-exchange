import React from 'react';

/**
 * ErrorBoundary - Reusable error boundary component
 *
 * Catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * EXPORT PATTERN (CRITICAL):
 * - Named export: `export class ErrorBoundary` (for selective imports)
 * - Default export: `export default ErrorBoundary` (for index.ts re-exports)
 *
 * Both are required for the plugin loader to work correctly.
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Serialize error for display
 */
const serializeError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.message}\n${error.stack || ''}`;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

/**
 * ErrorBoundary class component
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Allow custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <div style={styles.icon}>⚠️</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              An error occurred while rendering this component.
            </p>
            <pre style={styles.errorDetails}>
              {serializeError(this.state.error)}
            </pre>
            <button style={styles.retryButton} onClick={this.handleRetry}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles for portability
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '24px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    margin: '16px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '500px',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ef4444',
    margin: '0 0 8px 0',
  },
  message: {
    fontSize: '14px',
    color: '#888',
    margin: '0 0 16px 0',
  },
  errorDetails: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '12px',
    borderRadius: '8px',
    textAlign: 'left',
    overflow: 'auto',
    maxHeight: '150px',
    marginBottom: '16px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  retryButton: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// CRITICAL: Default export required for index.ts re-exports
// The pattern `export { default as ErrorBoundary } from './ErrorBoundary'`
// requires a default export in this file
export default ErrorBoundary;
