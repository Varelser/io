import React from "react";
import { STORAGE_BACKUP_KEY } from "../constants/defaults";
import { safeReadStorage } from "../storage/read-write";
import { parsePersistEnvelope } from "../storage/envelope";
import { persistState } from "../storage/persist";

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  handleRecover = () => {
    const backup = parsePersistEnvelope(safeReadStorage(STORAGE_BACKUP_KEY));
    if (backup) persistState(backup.state);
    if (typeof window !== "undefined") window.location.reload();
  };

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#050505] p-5">
          <div className="text-sm text-white">表示エラーが発生しました。</div>
          <div className="mt-2 text-xs leading-5 text-white/58 break-all">{this.state.message || "Unknown error"}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={this.handleRecover} className="rounded-md border border-white bg-white px-3 py-2 text-sm text-black">バックアップ復旧</button>
            <button onClick={this.handleReload} className="rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white">再読込</button>
          </div>
        </div>
      </div>
    );
  }
}
