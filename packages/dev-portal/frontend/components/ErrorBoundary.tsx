/**
 * Error Boundary for Developer Portal
 * Catches and displays errors gracefully
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[DevPortal] Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="dev-portal-error">
                    <div className="dev-portal-error__content">
                        <span className="dev-portal-error__icon">⚠️</span>
                        <h2 className="dev-portal-error__title">Something went wrong</h2>
                        <p className="dev-portal-error__message">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            className="dev-portal-error__retry"
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
