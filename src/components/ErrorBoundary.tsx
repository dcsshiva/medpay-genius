import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center p-8 bg-card rounded-lg shadow-lg max-w-md border">
            <h1 className="text-xl font-bold text-destructive mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-2 text-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-2 justify-center mt-6">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded bg-secondary text-secondary-foreground hover:opacity-90 text-sm"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 text-sm"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
