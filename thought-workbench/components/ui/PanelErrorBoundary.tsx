import React from "react";

type PanelErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class PanelErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  PanelErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; label?: string }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): PanelErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  componentDidCatch(error: unknown) {
    console.error(`[PanelErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`, error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        className="rounded-md border px-2 py-2 text-[8px] leading-4"
        style={{ borderColor: "var(--tw-border)", background: "color-mix(in srgb, #f87171 8%, var(--tw-bg-card))", color: "var(--tw-text-muted)" }}
      >
        <div style={{ color: "#f87171" }}>
          {this.props.label ? `${this.props.label}: ` : ""}パネルエラー
        </div>
        <div className="mt-1 break-all">{this.state.message}</div>
        <button
          onClick={this.handleRetry}
          className="mt-2 rounded border px-2 py-0.5 text-[8px] transition-colors hover:bg-white/5"
          style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-dim)" }}
        >
          再試行
        </button>
      </div>
    );
  }
}
