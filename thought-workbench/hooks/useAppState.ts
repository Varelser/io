import { useState, useEffect, useRef } from "react";
import type { AppState, TopicItem, TopicLinkItem, NodeItem } from "../types";
import { deepClone } from "../utils/clone";
import { SAVE_DEBOUNCE_MS } from "../constants/defaults";
import { loadStateFromStorage, persistState } from "../storage/persist";
import { parsePersistEnvelope } from "../storage/envelope";
import { STORAGE_KEY } from "../constants/defaults";
import { safeReadStorage } from "../storage/read-write";
import { normalizeState } from "../normalize/state";
import { canUseIndexedDB, persistStateToIndexedDB, loadStateWithFallback } from "../storage/indexeddb";
import { updateTopicListById } from "../graph-ops/topic-crud";
import { mapSelectedNodesInTopic } from "../graph-ops/node-crud";
import { resolveSelectionIds } from "../graph-ops/selection";

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadStateFromStorage());
  const stateRef = useRef(state);
  const saveTimerRef = useRef<number | null>(null);
  const undoStackRef = useRef<AppState[]>([]);
  const redoStackRef = useRef<AppState[]>([]);
  const isTimeTravelRef = useRef(false);

  // --- cross-tab storage 同期: 別タブの変更をリアルタイムに反映 ---
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const envelope = parsePersistEnvelope(e.newValue);
      if (!envelope) return;
      // 自分の直近 save より新しい場合のみ適用（自タブの書き込みエコーは無視）
      setState((current) => {
        const currentEnvelope = parsePersistEnvelope(safeReadStorage(STORAGE_KEY));
        const currentTime = currentEnvelope ? new Date(currentEnvelope.savedAt).getTime() : 0;
        const newTime = new Date(envelope.savedAt).getTime();
        return newTime > currentTime ? envelope.state : current;
      });
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // --- IndexedDB 起動時ロード: savedAt timestamp で IDB vs localStorage を比較して新しい方を適用 ---
  useEffect(() => {
    if (!canUseIndexedDB()) return;
    const lsEnvelopeLoader = () => parsePersistEnvelope(safeReadStorage(STORAGE_KEY));
    loadStateWithFallback(loadStateFromStorage, lsEnvelopeLoader).then((resolved) => {
      setState(resolved);
    }).catch(() => {
      // IDB 読み込み失敗 → localStorage のままで問題なし
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (typeof window === "undefined") return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      persistState(state);
      // IndexedDB デュアルライト（非同期、失敗してもローカルストレージに影響しない）
      if (canUseIndexedDB()) {
        persistStateToIndexedDB(state).catch(() => {});
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state]);

  const updateState = (updater: (draft: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(deepClone(prev));
      if (!isTimeTravelRef.current) {
        undoStackRef.current.push(deepClone(prev));
        if (undoStackRef.current.length > 60) undoStackRef.current.shift();
        redoStackRef.current = [];
      }
      return next;
    });
  };

  const updateSelectedTopicState = (selectedTopicId: string | null, updater: (topic: TopicItem) => TopicItem) => {
    if (!selectedTopicId) return;
    updateState((prev) => {
      prev.topics = updateTopicListById(prev.topics, selectedTopicId, updater);
      return prev;
    });
  };

  const updateTopicLinksState = (updater: (links: TopicLinkItem[]) => TopicLinkItem[]) => {
    updateState((prev) => {
      prev.topicLinks = updater(prev.topicLinks);
      return prev;
    });
  };

  const mapSelectedMultiNodesState = (selectedTopicId: string | null, selectedIds: Set<string>, mapper: (node: NodeItem) => NodeItem) => {
    updateSelectedTopicState(selectedTopicId, (topic) => mapSelectedNodesInTopic(topic, selectedIds, mapper));
  };

  const resetUndoRedoStacks = () => {
    undoStackRef.current = [];
    redoStackRef.current = [];
  };

  const undoState = (selectedTopicId: string | null, selectedNodeId: string | null, setSelectedTopicId: (id: string | null) => void, setSelectedNodeId: (id: string | null) => void, setRepairMessage: (msg: string) => void) => {
    if (!undoStackRef.current.length) {
      setRepairMessage("undo not available");
      return;
    }
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    isTimeTravelRef.current = true;
    redoStackRef.current.push(deepClone(stateRef.current));
    const resolved = resolveSelectionIds(previous, selectedTopicId, selectedNodeId);
    setState(previous);
    setSelectedTopicId(resolved.topicId);
    setSelectedNodeId(resolved.nodeId);
    setRepairMessage(`undo ${new Date().toLocaleTimeString()}`);
    queueMicrotask(() => { isTimeTravelRef.current = false; });
  };

  const redoState = (selectedTopicId: string | null, selectedNodeId: string | null, setSelectedTopicId: (id: string | null) => void, setSelectedNodeId: (id: string | null) => void, setRepairMessage: (msg: string) => void) => {
    if (!redoStackRef.current.length) {
      setRepairMessage("redo not available");
      return;
    }
    const next = redoStackRef.current.pop();
    if (!next) return;
    isTimeTravelRef.current = true;
    undoStackRef.current.push(deepClone(stateRef.current));
    const resolved = resolveSelectionIds(next, selectedTopicId, selectedNodeId);
    setState(next);
    setSelectedTopicId(resolved.topicId);
    setSelectedNodeId(resolved.nodeId);
    setRepairMessage(`redo ${new Date().toLocaleTimeString()}`);
    queueMicrotask(() => { isTimeTravelRef.current = false; });
  };

  const applyResolvedSelectionState = (nextState: AppState, preferredTopicId: string | null, preferredNodeId: string | null, setSelectedTopicId: (id: string | null) => void, setSelectedNodeId: (id: string | null) => void) => {
    const resolved = resolveSelectionIds(nextState, preferredTopicId, preferredNodeId);
    setState(nextState);
    setSelectedTopicId(resolved.topicId);
    setSelectedNodeId(resolved.nodeId);
  };

  const repairCurrentState = (setRepairMessage: (msg: string) => void) => {
    updateState((prev) => normalizeState(prev));
    setRepairMessage(`repaired ${new Date().toLocaleTimeString()}`);
  };

  return {
    state,
    stateRef,
    updateState,
    updateSelectedTopicState,
    updateTopicLinksState,
    mapSelectedMultiNodesState,
    resetUndoRedoStacks,
    undoState,
    redoState,
    applyResolvedSelectionState,
    repairCurrentState,
    canUndo: () => undoStackRef.current.length > 0,
    canRedo: () => redoStackRef.current.length > 0,
  };
}
