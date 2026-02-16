import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 px-8 text-center">
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-[hsl(var(--text-secondary))]">
            Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-press px-8 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wide glow-primary"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
