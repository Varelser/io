import React from "react";
import { AppErrorBoundary } from "./components/ErrorBoundary";
import { ThoughtWorkbenchCleanApp } from "./App";

export type AppMeta = {
  version: string;
  buildTime: string;
};

export type PwaState = {
  offlineReady: boolean;
  needRefresh: boolean;
  onRefresh?: () => void;
};

export default function ThoughtWorkbenchClean({
  appMeta,
  pwaState,
}: {
  appMeta?: AppMeta;
  pwaState?: PwaState;
}) {
  return (
    <AppErrorBoundary>
      <ThoughtWorkbenchCleanApp appMeta={appMeta} pwaState={pwaState} />
    </AppErrorBoundary>
  );
}
