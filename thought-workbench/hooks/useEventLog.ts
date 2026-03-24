import { useCallback } from "react";
import type { EventLogEntry, EventKind, AppState } from "../types";
import { newId } from "../utils/id";

/** イベントログの最大保持数 */
const MAX_LOG_SIZE = 500;

export function useEventLog(
  stateRef: React.MutableRefObject<AppState>,
  updateState: (updater: (prev: AppState) => AppState) => void,
) {
  const pushEvent = useCallback(
    (
      kind: EventKind,
      opts?: {
        topicId?: string;
        targetId?: string;
        targetLabel?: string;
        detail?: Record<string, unknown>;
      },
    ) => {
      const entry: EventLogEntry = {
        id: newId("evt"),
        ts: new Date().toISOString(),
        kind,
        topicId: opts?.topicId,
        targetId: opts?.targetId,
        targetLabel: opts?.targetLabel,
        detail: opts?.detail,
      };

      updateState((prev) => {
        const prevLog = prev.eventLog || [];
        const nextLog = [entry, ...prevLog].slice(0, MAX_LOG_SIZE);
        return { ...prev, eventLog: nextLog };
      });
    },
    [updateState],
  );

  return { pushEvent };
}
