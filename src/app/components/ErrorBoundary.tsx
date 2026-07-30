import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <span className="text-3xl">⚠️</span>
            <h2 className="text-lg font-bold text-slate-900 mt-4">Something went wrong</h2>
            <p className="text-sm text-slate-500 mt-2 mb-6">
              The application encountered an unexpected error. Please try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-primary-foreground font-semibold h-10 rounded-[10px] hover:bg-primary/95 transition-colors"
            >
              Reload Page
            </button>
            {this.state.error && (
              <pre className="text-left text-[10px] bg-slate-100 border border-slate-200 p-3 rounded-lg overflow-auto max-h-32 mt-6 font-mono text-slate-600">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
