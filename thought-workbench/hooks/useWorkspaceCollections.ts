import { useCallback, useState } from "react";
import type { AppState, BundleItem, CanvasBookmark, ConversionItem, ConversionRule, LayoutPreset, LayoutPresetPurpose, Material, SmartFolder, Snapshot, SnapshotScope, TopicItem, URLRecord, VocabTerm, WorkspaceViewport } from "../types";
import type { ManagementMethod } from "../types";
import type { ViewType } from "../constants/views";
import type { PaneState, PaneSyncMode, SplitMode } from "../components/MultiPaneLayout";
import { createBundle, addBundleToState, removeBundleFromState, updateBundleInState, addNodeToBundle, removeNodeFromBundle, addTopicToBundle, removeTopicFromBundle } from "../graph-ops/bundle-crud";
import { newId } from "../utils/id";
import { inferLayoutPresetPurpose } from "../utils/layout-preset";
import { applyWorkspaceLayoutSnapshot, buildWorkspaceLayoutSnapshot } from "../utils/workspace-preset";

const DEFAULT_PANE_VIEWS: ViewType[] = ["sphere", "table", "network", "diff"];

/** AppState の軽量ハッシュ（差分検出用） */
function computeStateHash(state: AppState): string {
  const key = [
    state.topics.length,
    state.topics.reduce((s, t) => s + t.nodes.length + t.edges.length, 0),
    state.topicLinks.length,
    (state.journals || []).length,
  ].join(":");
  // 直近ノードIDの末尾4文字を結合して疑似ハッシュにする
  const nodeIds = state.topics.flatMap((t) => t.nodes.map((n) => n.id)).slice(-8).join("");
  return `${key}|${nodeIds.slice(-12)}`;
}

function getPaneCountForSplitMode(mode: SplitMode): number {
  switch (mode) {
    case "single": return 1;
    case "vertical-2":
    case "horizontal-2": return 2;
    case "triple": return 3;
    case "quad": return 4;
  }
}

function ensurePaneCount(mode: SplitMode, panes: PaneState[]): PaneState[] {
  const count = getPaneCountForSplitMode(mode);
  return Array.from({ length: count }, (_, index) => panes[index] || { view: DEFAULT_PANE_VIEWS[index] || "sphere", syncMode: "global" });
}

export function useWorkspaceCollections({
  selectedTopicId,
  selectedNodeId,
  selectedTopic,
  topics,
  view,
  workspaceViewport,
  workspaceArrangeMeta,
  setWorkspaceArrangeMeta,
  setWorkspaceViewport,
  openInSphere,
  setView,
  splitMode,
  panes,
  setSplitMode,
  setPanes,
  updateState,
  showToast,
  lang,
}: {
  selectedTopicId: string | null;
  selectedNodeId: string | null;
  selectedTopic: TopicItem | null;
  topics: TopicItem[];
  view: ViewType;
  workspaceViewport: WorkspaceViewport;
  workspaceArrangeMeta?: { mode: string; groupBy?: string; topicCount?: number } | null;
  setWorkspaceArrangeMeta?: (meta: { mode: string; groupBy?: string; topicCount?: number } | null) => void;
  setWorkspaceViewport: (viewport: WorkspaceViewport) => void;
  openInSphere: (topicId: string, nodeId: string | null) => void;
  setView: (view: ViewType) => void;
  splitMode: SplitMode;
  panes: PaneState[];
  setSplitMode: (mode: SplitMode) => void;
  setPanes: React.Dispatch<React.SetStateAction<PaneState[]>>;
  updateState: (updater: (prev: AppState) => AppState) => void;
  showToast: (message: string, tone?: "success" | "error" | "info") => void;
  lang: "ja" | "en";
}) {
  const [recentLayoutTransition, setRecentLayoutTransition] = useState<{
    previous: LayoutPreset;
    applied: LayoutPreset;
  } | null>(null);

  const captureCurrentLayoutPreset = useCallback((label: string): LayoutPreset => ({
    id: newId("runtime-layout"),
    label,
    splitMode,
    panes: panes.map((pane) => ({ view: pane.view, syncMode: pane.syncMode || "global" })),
    workspaceSnapshot: buildWorkspaceLayoutSnapshot(topics, workspaceViewport),
    workspaceArrangement: workspaceArrangeMeta || undefined,
    purpose: inferLayoutPresetPurpose(panes, workspaceArrangeMeta),
  }), [splitMode, panes, topics, workspaceViewport, workspaceArrangeMeta]);

  const applyLayoutState = useCallback((layoutPreset: LayoutPreset) => {
    setSplitMode(layoutPreset.splitMode as SplitMode);
    setPanes(ensurePaneCount(
      layoutPreset.splitMode as SplitMode,
      layoutPreset.panes.map((pane) => ({ view: pane.view as ViewType, syncMode: (pane.syncMode as PaneSyncMode | undefined) || "global" }))
    ));
    if (layoutPreset.workspaceSnapshot?.viewport) setWorkspaceViewport(layoutPreset.workspaceSnapshot.viewport);
    if (layoutPreset.workspaceSnapshot?.topics?.length) {
      updateState((prev) => ({
        ...prev,
        topics: applyWorkspaceLayoutSnapshot(prev.topics, layoutPreset.workspaceSnapshot),
      }));
    }
    setWorkspaceArrangeMeta?.(layoutPreset.workspaceArrangement || null);
  }, [setSplitMode, setPanes, setWorkspaceViewport, updateState, setWorkspaceArrangeMeta]);

  const addBookmark = useCallback((label: string) => {
    if (!selectedTopicId) return;
    const bookmark: CanvasBookmark = {
      id: newId("bm"),
      label,
      topicId: selectedTopicId,
      nodeId: selectedNodeId || undefined,
      viewType: view,
      workspaceViewport: view === "workspace" ? workspaceViewport : undefined,
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({ ...prev, bookmarks: [bookmark, ...(prev.bookmarks || [])] }));
    showToast(lang === "ja" ? "ブックマーク追加" : "Bookmark added", "success");
  }, [selectedTopicId, selectedNodeId, view, workspaceViewport, updateState, showToast, lang]);

  const deleteBookmark = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, bookmarks: (prev.bookmarks || []).filter((bookmark) => bookmark.id !== id) }));
  }, [updateState]);

  const renameBookmark = useCallback((id: string, label: string) => {
    updateState((prev) => ({ ...prev, bookmarks: (prev.bookmarks || []).map((bookmark) => bookmark.id === id ? { ...bookmark, label } : bookmark) }));
  }, [updateState]);

  const navigateBookmark = useCallback((bookmark: CanvasBookmark) => {
    if (bookmark.workspaceViewport) setWorkspaceViewport(bookmark.workspaceViewport);
    openInSphere(bookmark.topicId, bookmark.nodeId || null);
    setView(bookmark.viewType as ViewType);
    showToast(bookmark.label, "info");
  }, [setWorkspaceViewport, openInSphere, setView, showToast]);

  const bookmarkWorkspaceViewport = useCallback(() => {
    if (!selectedTopicId) return;
    const topicTitle = selectedTopic?.title || (lang === "ja" ? "マップ" : "Map");
    addBookmark(`${topicTitle} - workspace`);
  }, [selectedTopicId, selectedTopic, lang, addBookmark]);

  const saveLayoutPreset = useCallback((label: string) => {
    const layoutPreset: LayoutPreset = {
      id: newId("lp"),
      label,
      splitMode,
      panes: panes.map((pane) => ({ view: pane.view, syncMode: pane.syncMode || "global" })),
      workspaceSnapshot: buildWorkspaceLayoutSnapshot(topics, workspaceViewport),
      workspaceArrangement: workspaceArrangeMeta || undefined,
      purpose: inferLayoutPresetPurpose(panes, workspaceArrangeMeta),
    };
    updateState((prev) => ({ ...prev, layoutPresets: [layoutPreset, ...(prev.layoutPresets || [])] }));
    showToast(lang === "ja" ? "レイアウト保存" : "Layout saved", "success");
  }, [splitMode, panes, topics, workspaceViewport, workspaceArrangeMeta, updateState, showToast, lang]);

  const deleteLayoutPreset = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, layoutPresets: (prev.layoutPresets || []).filter((preset) => preset.id !== id) }));
  }, [updateState]);

  const renameLayoutPreset = useCallback((id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    updateState((prev) => ({
      ...prev,
      layoutPresets: (prev.layoutPresets || []).map((preset) => preset.id === id ? { ...preset, label: trimmed } : preset),
    }));
  }, [updateState]);

  const updateLayoutPresetPurpose = useCallback((id: string, purpose: LayoutPresetPurpose) => {
    updateState((prev) => ({
      ...prev,
      layoutPresets: (prev.layoutPresets || []).map((preset) => preset.id === id ? { ...preset, purpose } : preset),
    }));
  }, [updateState]);

  const toggleLayoutPresetPinned = useCallback((id: string) => {
    updateState((prev) => ({
      ...prev,
      layoutPresets: (prev.layoutPresets || []).map((preset) => preset.id === id ? { ...preset, pinned: !preset.pinned } : preset),
    }));
  }, [updateState]);

  const applyLayoutPreset = useCallback((layoutPreset: LayoutPreset) => {
    setRecentLayoutTransition({
      previous: captureCurrentLayoutPreset(lang === "ja" ? "直前レイアウト" : "Previous Layout"),
      applied: layoutPreset,
    });
    applyLayoutState(layoutPreset);
    updateState((prev) => ({
      ...prev,
      layoutPresets: (prev.layoutPresets || []).map((preset) => preset.id === layoutPreset.id
        ? { ...preset, lastUsedAt: new Date().toISOString() }
        : preset),
    }));
    showToast(layoutPreset.label, "info");
  }, [captureCurrentLayoutPreset, applyLayoutState, updateState, showToast, lang]);

  const revertRecentLayoutPreset = useCallback(() => {
    if (!recentLayoutTransition) return;
    applyLayoutState(recentLayoutTransition.previous);
    showToast(lang === "ja" ? "直前レイアウトへ戻しました" : "Reverted to previous layout", "info");
    setRecentLayoutTransition(null);
  }, [recentLayoutTransition, applyLayoutState, showToast, lang]);

  const updateVocabulary = useCallback((vocab: VocabTerm[]) => {
    updateState((prev) => ({ ...prev, vocabulary: vocab }));
  }, [updateState]);

  const addSmartFolder = useCallback((folder: SmartFolder) => {
    updateState((prev) => ({ ...prev, smartFolders: [folder, ...(prev.smartFolders || [])] }));
  }, [updateState]);

  const updateSmartFolder = useCallback((id: string, patch: Partial<SmartFolder>) => {
    updateState((prev) => ({
      ...prev,
      smartFolders: (prev.smartFolders || []).map((folder) => folder.id === id ? { ...folder, ...patch } : folder),
    }));
  }, [updateState]);

  const deleteSmartFolder = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, smartFolders: (prev.smartFolders || []).filter((folder) => folder.id !== id) }));
  }, [updateState]);

  const addToConversionQueue = useCallback((item: Omit<ConversionItem, "id" | "createdAt">) => {
    const queueItem: ConversionItem = { ...item, id: newId("cq"), createdAt: new Date().toISOString() };
    updateState((prev) => ({ ...prev, conversionQueue: [queueItem, ...(prev.conversionQueue || [])] }));
    showToast(lang === "ja" ? "変換キューに追加" : "Added to queue", "success");
  }, [updateState, showToast, lang]);

  const updateConversionStatus = useCallback((id: string, status: ConversionItem["status"]) => {
    updateState((prev) => ({ ...prev, conversionQueue: (prev.conversionQueue || []).map((item) => item.id === id ? { ...item, status } : item) }));
  }, [updateState]);

  const removeFromConversionQueue = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, conversionQueue: (prev.conversionQueue || []).filter((item) => item.id !== id) }));
  }, [updateState]);

  const addUserMethod = useCallback((method: ManagementMethod) => {
    updateState((prev) => ({ ...prev, userMethods: [method, ...(prev.userMethods || [])] }));
    showToast(lang === "ja" ? "メソッド追加" : "Method added", "success");
  }, [updateState, showToast, lang]);

  const updateUserMethod = useCallback((id: string, patch: Partial<ManagementMethod>) => {
    updateState((prev) => ({
      ...prev,
      userMethods: (prev.userMethods || []).map((m) => m.id === id ? { ...m, ...patch } : m),
    }));
  }, [updateState]);

  const deleteUserMethod = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, userMethods: (prev.userMethods || []).filter((m) => m.id !== id) }));
  }, [updateState]);

  const addConversionRule = useCallback((rule: Omit<ConversionRule, "id" | "createdAt">) => {
    const newRule: ConversionRule = { ...rule, id: newId("cr"), createdAt: new Date().toISOString() };
    updateState((prev) => ({ ...prev, conversionRules: [newRule, ...(prev.conversionRules || [])] }));
  }, [updateState]);

  const updateConversionRule = useCallback((id: string, patch: Partial<ConversionRule>) => {
    updateState((prev) => ({
      ...prev,
      conversionRules: (prev.conversionRules || []).map((r) => r.id === id ? { ...r, ...patch } : r),
    }));
  }, [updateState]);

  const deleteConversionRule = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, conversionRules: (prev.conversionRules || []).filter((r) => r.id !== id) }));
  }, [updateState]);

  const createWorkspaceBundle = useCallback((title: string, bundleType: BundleItem["bundleType"]) => {
    const bundle = createBundle(title, bundleType);
    updateState((prev) => addBundleToState(prev, bundle));
    showToast(lang === "ja" ? "Bundle 作成" : "Bundle created", "success");
  }, [updateState, showToast, lang]);

  const deleteWorkspaceBundle = useCallback((id: string) => {
    updateState((prev) => removeBundleFromState(prev, id));
  }, [updateState]);

  const updateWorkspaceBundle = useCallback((id: string, patch: Partial<BundleItem>) => {
    updateState((prev) => updateBundleInState(prev, id, patch));
  }, [updateState]);

  const addCurrentNodeToBundle = useCallback((bundleId: string) => {
    if (!selectedNodeId) return;
    updateState((prev) => addNodeToBundle(prev, bundleId, selectedNodeId));
    showToast(lang === "ja" ? "ノードを Bundle に追加" : "Node added to bundle", "success");
  }, [selectedNodeId, updateState, showToast, lang]);

  const addCurrentTopicToBundle = useCallback((bundleId: string) => {
    if (!selectedTopicId) return;
    updateState((prev) => addTopicToBundle(prev, bundleId, selectedTopicId));
    showToast(lang === "ja" ? "球体を Bundle に追加" : "Topic added to bundle", "success");
  }, [selectedTopicId, updateState, showToast, lang]);

  const removeNodeFromWorkspaceBundle = useCallback((bundleId: string, nodeId: string) => {
    updateState((prev) => removeNodeFromBundle(prev, bundleId, nodeId));
  }, [updateState]);

  const removeTopicFromWorkspaceBundle = useCallback((bundleId: string, topicId: string) => {
    updateState((prev) => removeTopicFromBundle(prev, bundleId, topicId));
  }, [updateState]);

  const updateMaterials = useCallback((materials: Material[]) => {
    updateState((prev) => ({ ...prev, materials }));
  }, [updateState]);

  const updateURLRecords = useCallback((urlRecords: URLRecord[]) => {
    updateState((prev) => ({ ...prev, urlRecords }));
  }, [updateState]);

  const captureSnapshot = useCallback((label: string, scope: SnapshotScope) => {
    updateState((prev) => {
      const snap: Snapshot = {
        id: newId("snap"),
        label,
        scope,
        triggeredBy: "manual",
        topicId: scope === "topic" ? (selectedTopicId || undefined) : undefined,
        stateHash: computeStateHash(prev),
        createdAt: new Date().toISOString(),
      };
      return { ...prev, snapshots: [snap, ...(prev.snapshots || [])] };
    });
    showToast(lang === "ja" ? "スナップショット保存" : "Snapshot captured", "success");
  }, [selectedTopicId, updateState, showToast, lang]);

  const deleteSnapshot = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, snapshots: (prev.snapshots || []).filter((s) => s.id !== id) }));
  }, [updateState]);

  const setCurrentBundleId = useCallback((id: string | undefined) => {
    updateState((prev) => ({ ...prev, currentBundleId: id }));
  }, [updateState]);

  const setCurrentViewContext = useCallback((ctx: { viewType: "smartFolder" | "layoutPreset" | "bookmark"; id: string } | undefined) => {
    updateState((prev) => ({ ...prev, currentViewContext: ctx }));
  }, [updateState]);

  return {
    addBookmark,
    deleteBookmark,
    renameBookmark,
    navigateBookmark,
    bookmarkWorkspaceViewport,
    saveLayoutPreset,
    deleteLayoutPreset,
    renameLayoutPreset,
    updateLayoutPresetPurpose,
    toggleLayoutPresetPinned,
    applyLayoutPreset,
    recentLayoutTransition,
    revertRecentLayoutPreset,
    updateVocabulary,
    addSmartFolder,
    updateSmartFolder,
    deleteSmartFolder,
    addToConversionQueue,
    updateConversionStatus,
    removeFromConversionQueue,
    addUserMethod,
    updateUserMethod,
    deleteUserMethod,
    addConversionRule,
    updateConversionRule,
    deleteConversionRule,
    createWorkspaceBundle,
    deleteWorkspaceBundle,
    updateWorkspaceBundle,
    addCurrentNodeToBundle,
    addCurrentTopicToBundle,
    removeNodeFromWorkspaceBundle,
    removeTopicFromWorkspaceBundle,
    updateMaterials,
    updateURLRecords,
    captureSnapshot,
    deleteSnapshot,
    setCurrentBundleId,
    setCurrentViewContext,
  };
}
