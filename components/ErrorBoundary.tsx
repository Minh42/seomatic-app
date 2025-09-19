'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-zinc-900">
                Something went wrong
              </h2>
              <p className="text-sm text-zinc-500">
                We encountered an unexpected error. Please try refreshing the
                page or contact support if the problem persists.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-900">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 text-xs bg-zinc-100 p-2 rounded overflow-auto max-h-40">
                    {this.state.error.stack || this.state.error.message}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="cursor-pointer"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Async error boundary for React Suspense
export function AsyncErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}
