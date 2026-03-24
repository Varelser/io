import React, { useState, useMemo, useCallback } from "react";
import { AppProvider } from "./hooks/AppContext";
import type { AppMeta, PwaState } from "./index";
import { UI_TEXT } from "./constants/ui-text";
import { normalizeNodeToSphere } from "./projection/sphere";
import { computeBetweennessCentrality, computeCommunityClusters, computeDegreeCentrality, computeHITS } from "./graph-analytics/centrality";
import { computePageRankAnalysis } from "./pagerank/compute";
import { collectUniqueNodeFieldValues, filterTopicNodes, searchNodesInTopic, buildSphereTopic, selectTopicLinksForTopic } from "./graph-ops/filter";
import { buildHistorySnapshotFrame, appendHistoryFrameToTopic, applyHistoryFrameToTopic, removeHistoryFrameByIdFromTopic } from "./graph-ops/history-ops";
import { applyPresetToTopic, appendSeedBundleToTopic } from "./graph-ops/preset-ops";
import { VIEW_LABELS, VIEW_TYPES } from "./constants/views";
import type { ViewType } from "./constants/views";

import { useAppState } from "./hooks/useAppState";
import { useSelection } from "./hooks/useSelection";
import { useMultiSelect } from "./hooks/useMultiSelect";
import { useMarkdownIO } from "./hooks/useMarkdownIO";
import { useEdgeEditor } from "./hooks/useEdgeEditor";
import { useTopicLinkEditor } from "./hooks/useTopicLinkEditor";
import { useKeyboard } from "./hooks/useKeyboard";
import { useTopicCrud } from "./hooks/useTopicCrud";
import { useNodeCrud } from "./hooks/useNodeCrud";
import { useEdgeCrud } from "./hooks/useEdgeCrud";
import { useTopicLinkCrud } from "./hooks/useTopicLinkCrud";
import { useBulkOps } from "./hooks/useBulkOps";
import { useJournal } from "./hooks/useJournal";
import { useTheme } from "./hooks/useTheme";
import { useEventLog } from "./hooks/useEventLog";
import { useSampleWorkspace } from "./hooks/useSampleWorkspace";
import { useScenarioBranches } from "./hooks/useScenarioBranches";
import { useWorkspaceCollections } from "./hooks/useWorkspaceCollections";
import { useWorkspaceIO } from "./hooks/useWorkspaceIO";
import { useDraggablePosition } from "./hooks/useDraggablePosition";
import { AppChrome } from "./components/AppChrome";
import { LeftSidebar } from "./components/LeftSidebar";
import { MainViewport } from "./components/MainViewport";
import { RightInspector } from "./components/RightInspector";
import { TimelineScrubber } from "./components/TimelineScrubber";
import { Minimap } from "./components/Minimap";
import { MultiPaneLayout } from "./components/MultiPaneLayout";
import { SettingsModal } from "./components/SettingsModal";
import { ImportExportModal } from "./components/ImportExportModal";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { TopicTabBar } from "./components/TopicTabBar";
import type { SplitMode, PaneState, PaneSyncMode } from "./components/MultiPaneLayout";
import { useTopicTabs } from "./hooks/useTopicTabs";
import { BUILTIN_METHODS } from "./constants/builtin-methods";
import { useToast } from "./hooks/useToast";
import { useConfirm } from "./hooks/useConfirm";
import { useContextMenu } from "./hooks/useContextMenu";
import { ToastContainer } from "./components/ui/Toast";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { ContextMenu } from "./components/ui/ContextMenu";
import type { ContextMenuItem } from "./components/ui/ContextMenu";
import { CommandPalette } from "./components/ui/CommandPalette";
import type { CommandPaletteAction } from "./components/ui/CommandPalette";
import type { NodeSelectionSet, SmartFolder, TopicItem, TopicLinkItem, WorkspaceViewport } from "./types";
import { buildDuplicatedTopicItem, appendTopicItemsToState, removeSelectedTopicInState, patchTopicItem } from "./graph-ops/topic-crud";
import { evaluateConversionRules, buildConversionItemsFromCandidates } from "./utils/conversion-rules";
import { appendNodesToTopic, updateNodeByIdInTopic, createDuplicatedNodeItem, removeSelectedNodesInTopic } from "./graph-ops/node-crud";
import { splitNodeInTopic, mergeNodesInTopic } from "./graph-ops/node-split-merge";
import { SAMPLE_WORKSPACE_PRESETS } from "./utils/sample-state";
import { newId } from "./utils/id";
import { appendMustOneHistory, buildParaFolderPath, collectTopicSubtreeIds } from "./utils/topic-organization";
import { arrangeWorkspaceTopics } from "./utils/workspace-layout";
import type { WorkspaceArrangeGroupBy, WorkspaceArrangeMode } from "./utils/workspace-layout";
import { findFirstSmartFolderMatch } from "./utils/smart-folder";
import { buildNodeColorOverrides } from "./utils/method-color";

const DEFAULT_WORKSPACE_VIEWPORT: WorkspaceViewport = { x: 0, y: 0, w: 100, h: 100 };
const WORKSPACE_VIEWPORT_STORAGE_KEY = "tw-workspace-viewport";

function loadSavedWorkspaceViewport(): WorkspaceViewport {
  try {
    const raw = localStorage.getItem(WORKSPACE_VIEWPORT_STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE_VIEWPORT;
    const parsed = JSON.parse(raw);
    if (typeof parsed.x === "number" && typeof parsed.y === "number" &&
        typeof parsed.w === "number" && typeof parsed.h === "number" &&
        parsed.w > 0 && parsed.h > 0) {
      return parsed as WorkspaceViewport;
    }
  } catch {}
  return DEFAULT_WORKSPACE_VIEWPORT;
}
const DEFAULT_PANE_VIEWS: ViewType[] = ["sphere", "table", "network", "diff"];
const SELECTION_SET_COLORS = ["#f59e0b", "#38bdf8", "#34d399", "#f472b6", "#a78bfa", "#fb7185"] as const;

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

export function ThoughtWorkbenchCleanApp({
  appMeta = { version: "dev", buildTime: new Date(0).toISOString() },
  pwaState = { offlineReady: false, needRefresh: false },
}: {
  appMeta?: AppMeta;
  pwaState?: PwaState;
}) {
  const appState = useAppState();
  const { state, stateRef, updateState, updateSelectedTopicState, updateTopicLinksState, mapSelectedMultiNodesState, resetUndoRedoStacks, applyResolvedSelectionState, repairCurrentState } = appState;
  const theme = useTheme();

  const [view, setView] = useState<ViewType>("sphere");
  const [preset, setPreset] = useState("free");
  const [lang, setLangState] = useState<"ja" | "en">(() => {
    try { const v = localStorage.getItem("tw-lang"); if (v === "en" || v === "ja") return v; } catch {}
    return "ja";
  });
  const setLang = useCallback((l: "ja" | "en") => {
    try { localStorage.setItem("tw-lang", l); } catch {}
    setLangState(l);
  }, []);
  const [repairMessage, setRepairMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [layerFilter, setLayerFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [scrubberCollapsed, setScrubberCollapsed] = useState(true);
  const topicTabs = useTopicTabs();
  const [splitMode, setSplitMode] = useState<SplitMode>(topicTabs.activeTab?.splitMode ?? "single");
  const [panes, setPanes] = useState<PaneState[]>(() => {
    const tab = topicTabs.activeTab;
    if (tab) return ensurePaneCount(tab.splitMode, tab.panes);
    return [{ view: "sphere" }, { view: "table" }, { view: "network" }];
  });
  const [workspaceViewport, setWorkspaceViewportState] = useState<WorkspaceViewport>(loadSavedWorkspaceViewport);
  const setWorkspaceViewport = useCallback((viewport: WorkspaceViewport) => {
    setWorkspaceViewportState(viewport);
    try { localStorage.setItem(WORKSPACE_VIEWPORT_STORAGE_KEY, JSON.stringify(viewport)); } catch {}
  }, []);
  const [workspaceArrangeMeta, setWorkspaceArrangeMeta] = useState<{ mode: string; groupBy?: string; topicCount?: number } | null>(null);
  const [samplePresetId, setSamplePresetId] = useState<(typeof SAMPLE_WORKSPACE_PRESETS)[number]["id"]>("story-branch");
  const [inspectorTabRequest, setInspectorTabRequest] = useState<"edit" | "analyze" | "workspace">("edit");
  const [lockedEditTarget, setLockedEditTarget] = useState<{ topicId: string | null; nodeId: string | null } | null>(null);
  const [selectionSetCompareId, setSelectionSetCompareId] = useState<string>("");
  const {
    position: scrubberPosition,
    startDrag: startScrubberDrag,
    resetPosition: resetScrubberPosition,
  } = useDraggablePosition("tw-overlay-scrubber", { x: 0, y: 0 }, "y");
  const handlePaneViewChange = useCallback((index: number, v: ViewType) => {
    setPanes((prev) => {
      const next = ensurePaneCount(splitMode, prev);
      next[index] = { ...next[index], view: v };
      topicTabs.updateActiveTabState({ panes: next });
      return next;
    });
  }, [splitMode, topicTabs]);
  const handleSplitModeChange = useCallback((mode: SplitMode) => {
    setSplitMode(mode);
    setPanes((prev) => {
      const next = ensurePaneCount(mode, prev);
      topicTabs.updateActiveTabState({ splitMode: mode, panes: next });
      return next;
    });
  }, [topicTabs]);

  const selection = useSelection(state);
  const { selectedTopicId, setSelectedTopicId, selectedNodeId, setSelectedNodeId, selectedTopic, selectedNode, openTopicInSphere, focusNodeInSphere } = selection;
  const handlePaneSyncModeChange = useCallback((index: number, syncMode: PaneSyncMode) => {
    setPanes((prev) => {
      const next = ensurePaneCount(splitMode, prev);
      const current = next[index] || { view: DEFAULT_PANE_VIEWS[index] || "sphere", syncMode: "global" };
      next[index] = syncMode === "isolated"
        ? {
            ...current,
            syncMode,
            topicId: current.topicId ?? selectedTopicId,
            nodeId: current.nodeId ?? selectedNodeId,
          }
        : {
            ...current,
            syncMode: "global",
            topicId: undefined,
            nodeId: undefined,
          };
      return next;
    });
  }, [splitMode, selectedTopicId, selectedNodeId]);
  const handlePaneSelectionChange = useCallback((index: number, topicId: string | null, nodeId: string | null) => {
    setPanes((prev) => {
      const next = ensurePaneCount(splitMode, prev);
      next[index] = { ...next[index], topicId, nodeId };
      return next;
    });
  }, [splitMode]);

  const multiSelect = useMultiSelect(selectedTopic);
  const { multiNodeIds, setMultiNodeIds, multiNodeIdSet, bulkMessage, setBulkMessage, toggleMultiNode, clearMultiSelection, selectFilteredNodes } = multiSelect;

  const edgeEditor = useEdgeEditor();
  const topicLinkEditor = useTopicLinkEditor();
  const markdownIO = useMarkdownIO();

  const topics = state.topics;
  const topicLinks = state.topicLinks;
  const ui = UI_TEXT[lang];

  const doUpdateSelectedTopic = (updater: (t: TopicItem) => TopicItem) => updateSelectedTopicState(selectedTopicId, updater);
  const setViewStr = (v: string) => setView(v as ViewType);
  const openInSphere = (tid: string, nid: string | null) => {
    const restored = topicTabs.openTab(tid, nid, splitMode, panes, selectedNodeId);
    if (restored) {
      setSplitMode(restored.splitMode);
      setPanes(ensurePaneCount(restored.splitMode, restored.panes));
      setSelectedNodeId(restored.selectedNodeId);
    }
    openTopicInSphere(tid, nid ?? restored?.selectedNodeId ?? null, stateRef, setViewStr);
  };
  const focusInSphere = (nid: string) => focusNodeInSphere(nid, setViewStr);

  // --- Event Log ---
  const { pushEvent } = useEventLog(stateRef, updateState);

  // --- Extracted CRUD hooks ---
  const topicCrud = useTopicCrud({ topics, selectedTopic, selectedTopicId, updateState, doUpdateSelectedTopic, openInSphere, setSelectedTopicId, setSelectedNodeId, pushEvent });
  const nodeCrud = useNodeCrud({ selectedTopic, selectedNode, doUpdateSelectedTopic, setSelectedNodeId, pushEvent });
  const edgeCrud = useEdgeCrud({ selectedTopic, doUpdateSelectedTopic, edgeEditor, pushEvent });
  const topicLinkCrudOps = useTopicLinkCrud({ selectedTopic, selectedUnresolvedTopicLinks: selectedTopic?.unresolvedTopicLinks || [], updateTopicLinksState, updateState, topicLinkEditor });
  const bulkOps = useBulkOps({ selectedTopic, selectedTopicId, selectedNodeId, setSelectedNodeId, doUpdateSelectedTopic, mapSelectedMultiNodesState, multiNodeIds, setMultiNodeIds, setBulkMessage, edgeEditor });
  const journal = useJournal({ state, updateState });
  const { toasts, showToast } = useToast();
  const { confirmState, confirm } = useConfirm();
  const { menu: ctxMenu, openMenu: openCtxMenu, closeMenu: closeCtxMenu } = useContextMenu();

  const handleActivateTab = useCallback((tabId: string) => {
    const tab = topicTabs.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    topicTabs.snapshotActiveTab(splitMode, panes, selectedNodeId);
    topicTabs.setActiveTabId(tabId);
    setSplitMode(tab.splitMode);
    setPanes(ensurePaneCount(tab.splitMode, tab.panes));
    setSelectedTopicId(tab.topicId);
    setSelectedNodeId(tab.selectedNodeId);
    openTopicInSphere(tab.topicId, tab.selectedNodeId, stateRef, setViewStr);
  }, [topicTabs, splitMode, panes, selectedNodeId, setSelectedTopicId, setSelectedNodeId, stateRef]);

  const openTopicProperties = useCallback((topicId: string, preferredNodeId: string | null = null) => {
    const topic = topics.find((item) => item.id === topicId);
    const nextNodeId = preferredNodeId && topic?.nodes.some((node) => node.id === preferredNodeId)
      ? preferredNodeId
      : topic?.nodes[0]?.id || null;
    setSelectedTopicId(topicId);
    setSelectedNodeId(nextNodeId);
    setRightOpen(true);
    setInspectorTabRequest("edit");
    if (lockedEditTarget) {
      setLockedEditTarget({ topicId, nodeId: nextNodeId });
    }
  }, [lockedEditTarget, topics, setSelectedTopicId, setSelectedNodeId]);

  const openNodeProperties = useCallback((topicId: string, nodeId: string) => {
    setSelectedTopicId(topicId);
    setSelectedNodeId(nodeId);
    setRightOpen(true);
    setInspectorTabRequest("edit");
    if (lockedEditTarget) {
      setLockedEditTarget({ topicId, nodeId });
    }
  }, [lockedEditTarget, setSelectedTopicId, setSelectedNodeId]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, topicId: string, nodeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    openCtxMenu(event.clientX, event.clientY, { topicId, nodeId });
  }, [openCtxMenu]);

  const handleTopicContextMenu = useCallback((event: React.MouseEvent, topicId: string) => {
    event.preventDefault();
    event.stopPropagation();
    openCtxMenu(event.clientX, event.clientY, { topicId });
  }, [openCtxMenu]);

  const toggleEditLock = useCallback(() => {
    if (lockedEditTarget) {
      setLockedEditTarget(null);
      return;
    }
    if (!selectedTopicId) return;
    setLockedEditTarget({ topicId: selectedTopicId, nodeId: selectedNodeId });
    setRightOpen(true);
    setInspectorTabRequest("edit");
  }, [lockedEditTarget, selectedNodeId, selectedTopicId]);

  const pinEditTarget = useCallback((topicId: string, nodeId: string | null) => {
    setLockedEditTarget({ topicId, nodeId });
    setRightOpen(true);
    setInspectorTabRequest("edit");
  }, []);

  React.useEffect(() => {
    if (!lockedEditTarget?.topicId) return;
    const topic = topics.find((item) => item.id === lockedEditTarget.topicId);
    if (!topic) {
      setLockedEditTarget(null);
      return;
    }
    if (lockedEditTarget.nodeId && !topic.nodes.some((node) => node.id === lockedEditTarget.nodeId)) {
      setLockedEditTarget({ topicId: topic.id, nodeId: topic.nodes[0]?.id || null });
    }
  }, [lockedEditTarget, topics]);

  React.useEffect(() => {
    if (!selectionSetCompareId) return;
    const compareSet = (state.nodeSelectionSets || []).find((item) => item.id === selectionSetCompareId);
    const currentInspectorTopicId = lockedEditTarget?.topicId || selectedTopic?.id || null;
    if (!compareSet || (currentInspectorTopicId && compareSet.topicId !== currentInspectorTopicId)) {
      setSelectionSetCompareId("");
    }
  }, [lockedEditTarget, selectedTopic, selectionSetCompareId, state.nodeSelectionSets]);

  // --- localStorage QuotaExceededError listener ---
  React.useEffect(() => {
    const handler = () => showToast(lang === "ja" ? "ストレージ容量超過: JSON エクスポートでバックアップしてください" : "Storage quota exceeded: please export JSON backup", "error");
    window.addEventListener("storage-quota-exceeded", handler);
    return () => window.removeEventListener("storage-quota-exceeded", handler);
  }, [showToast, lang]);
  const seenOfflineReadyRef = React.useRef(false);
  const seenNeedRefreshRef = React.useRef(false);
  React.useEffect(() => {
    if (pwaState.offlineReady && !seenOfflineReadyRef.current) {
      seenOfflineReadyRef.current = true;
      showToast(lang === "ja" ? "オフライン利用の準備ができました" : "Offline cache ready", "success");
    }
  }, [pwaState.offlineReady, showToast, lang]);
  React.useEffect(() => {
    if (pwaState.needRefresh && !seenNeedRefreshRef.current) {
      seenNeedRefreshRef.current = true;
      showToast(lang === "ja" ? "新しいバージョンがあります" : "New version available", "info");
    }
  }, [pwaState.needRefresh, showToast, lang]);

  // --- Derived data ---
  const selectedTopicLinks = useMemo(() => selectTopicLinksForTopic(selectedTopic, topicLinks), [selectedTopic, topicLinks]);
  const selectedUnresolvedTopicLinks = useMemo(() => selectedTopic?.unresolvedTopicLinks || [], [selectedTopic]);
  const uniqueLayers = useMemo(() => collectUniqueNodeFieldValues(selectedTopic?.nodes, "layer"), [selectedTopic]);
  const uniqueGroups = useMemo(() => collectUniqueNodeFieldValues(selectedTopic?.nodes, "group"), [selectedTopic]);
  const filteredTopic = useMemo(() => filterTopicNodes(selectedTopic, searchQuery, layerFilter, groupFilter), [selectedTopic, searchQuery, layerFilter, groupFilter]);
  const inspectorTopic = useMemo(() => {
    if (!lockedEditTarget?.topicId) return selectedTopic;
    return topics.find((topic) => topic.id === lockedEditTarget.topicId) || null;
  }, [lockedEditTarget, selectedTopic, topics]);
  const inspectorNode = useMemo(() => {
    if (!inspectorTopic) return null;
    if (!lockedEditTarget) return selectedNode;
    if (!lockedEditTarget.nodeId) return inspectorTopic.nodes[0] || null;
    return inspectorTopic.nodes.find((node) => node.id === lockedEditTarget.nodeId) || inspectorTopic.nodes[0] || null;
  }, [inspectorTopic, lockedEditTarget, selectedNode]);
  const compareSelectionSet = useMemo(
    () => (state.nodeSelectionSets || []).find((item) => item.id === selectionSetCompareId) || null,
    [selectionSetCompareId, state.nodeSelectionSets]
  );
  const currentTopicCompareState = useMemo<Record<string, "shared" | "current-only" | "set-only">>(() => {
    if (!selectedTopic || !compareSelectionSet || compareSelectionSet.topicId !== selectedTopic.id) return {};
    const current = new Set(multiNodeIds.filter((nodeId) => selectedTopic.nodes.some((node) => node.id === nodeId)));
    const target = new Set(compareSelectionSet.nodeIds.filter((nodeId) => selectedTopic.nodes.some((node) => node.id === nodeId)));
    const result: Record<string, "shared" | "current-only" | "set-only"> = {};
    current.forEach((nodeId) => {
      result[nodeId] = target.has(nodeId) ? "shared" : "current-only";
    });
    target.forEach((nodeId) => {
      if (!current.has(nodeId)) result[nodeId] = "set-only";
    });
    return result;
  }, [compareSelectionSet, multiNodeIds, selectedTopic]);
  const allMethods = useMemo(
    () => [...BUILTIN_METHODS, ...(state.userMethods || [])],
    [state.userMethods]
  );
  const nodeColorOverrides = useMemo(
    () => selectedTopic ? buildNodeColorOverrides(selectedTopic, allMethods) : new Map<string, string>(),
    [selectedTopic, allMethods]
  );
  const { balancedMap: pageRankMap, flowMap: pageRankFlowMap, focusMap: pageRankFocusMap, focusSignals } = useMemo(
    () => computePageRankAnalysis(selectedTopic),
    [selectedTopic]
  );
  const betweennessMap = useMemo(() => computeBetweennessCentrality(selectedTopic), [selectedTopic]);
  const degreeMap = useMemo(() => computeDegreeCentrality(selectedTopic), [selectedTopic]);
  const { hubMap, authorityMap } = useMemo(() => computeHITS(selectedTopic), [selectedTopic]);
  const { communities, communityMap } = useMemo(() => computeCommunityClusters(selectedTopic), [selectedTopic]);
  const searchResults = useMemo(() => searchNodesInTopic(selectedTopic, searchQuery), [selectedTopic, searchQuery]);
  const sphereTopic = useMemo(() => buildSphereTopic(selectedTopic, filteredTopic), [selectedTopic, filteredTopic]);
  const selectedTopicEdges = useMemo(() => selectedTopic?.edges || [], [selectedTopic]);
  const filteredNodeIds = useMemo(() => filteredTopic?.nodes.map((node) => node.id) || [], [filteredTopic]);
  // 管理法推奨ビュー: アクティブな管理法の recommendedViews を集約
  const recommendedViews = useMemo<Set<ViewType>>(() => {
    const set = new Set<ViewType>();
    (selectedTopic?.activeMethods || []).forEach((mid) => {
      const method = allMethods.find((m) => m.id === mid);
      method?.displayRules?.recommendedViews?.forEach((v) => {
        if (VIEW_TYPES.includes(v as ViewType)) set.add(v as ViewType);
      });
    });
    return set;
  }, [selectedTopic, allMethods]);
  const canUndo = appState.canUndo();
  const canRedo = appState.canRedo();
  const buildStamp = useMemo(() => {
    const time = new Date(appMeta.buildTime);
    if (Number.isNaN(time.getTime())) return appMeta.version;
    return `${appMeta.version} / ${time.toLocaleString(lang === "ja" ? "ja-JP" : "en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [appMeta.buildTime, appMeta.version, lang]);
  const commandPaletteActions = useMemo<CommandPaletteAction[]>(() => [
    {
      id: "toggle-focus",
      label: focusMode ? (lang === "ja" ? "集中モードを終了" : "Exit focus mode") : (lang === "ja" ? "集中モードを開始" : "Enter focus mode"),
      hint: lang === "ja" ? "余計なパネルを隠す" : "Hide side panels and timeline",
      keywords: ["focus", "zen", "集中", "mode"],
      run: () => setFocusMode((prev) => !prev),
    },
    {
      id: "toggle-edit-lock",
      label: lockedEditTarget ? (lang === "ja" ? "プロパティ固定を解除" : "Unlock properties") : (lang === "ja" ? "現在のプロパティを固定" : "Lock current properties"),
      hint: lang === "ja" ? "Edit タブの topic / node を固定" : "Pin the Edit tab target",
      keywords: ["lock", "pin", "inspector", "properties", "固定"],
      run: () => toggleEditLock(),
    },
    {
      id: "show-left",
      label: lang === "ja" ? "左パネルを開く" : "Show left panel",
      hint: lang === "ja" ? "Map / Workspace" : "Map / Workspace",
      keywords: ["sidebar", "left", "map", "workspace"],
      run: () => {
        setFocusMode(false);
        setLeftOpen(true);
      },
    },
    {
      id: "show-right",
      label: lang === "ja" ? "右インスペクタを開く" : "Show inspector",
      hint: lang === "ja" ? "Edit / Analyze / Library" : "Edit / Analyze / Library",
      keywords: ["inspector", "right", "library", "analyze", "edit"],
      run: () => {
        setFocusMode(false);
        setRightOpen(true);
      },
    },
    {
      id: "new-topic",
      label: lang === "ja" ? "新しいトピックを作成" : "Create topic",
      hint: lang === "ja" ? "空の topic を追加" : "Add a blank topic",
      keywords: ["topic", "create", "new", "add"],
      run: () => topicCrud.addTopic(),
    },
    {
      id: "new-child-topic",
      label: lang === "ja" ? "子トピックを追加" : "Add child topic",
      hint: selectedTopic ? selectedTopic.title : (lang === "ja" ? "トピック未選択" : "No topic selected"),
      keywords: ["topic", "child", "subtopic", "add"],
      run: () => {
        if (!selectedTopic) return;
        topicCrud.addChildTopic();
      },
    },
    {
      id: "new-node",
      label: lang === "ja" ? "ノードを追加" : "Add node",
      hint: selectedTopic ? selectedTopic.title : (lang === "ja" ? "トピック未選択" : "No topic selected"),
      keywords: ["node", "add", "new"],
      run: () => {
        if (!selectedTopic) return;
        nodeCrud.addNode();
        setFocusMode(false);
        setRightOpen(true);
        setInspectorTabRequest("edit");
      },
    },
    {
      id: "open-edit",
      label: lang === "ja" ? "Edit を開く" : "Open Edit",
      hint: lang === "ja" ? "トピック / ノード編集" : "Topic / node editing",
      keywords: ["edit", "properties", "node", "topic"],
      run: () => {
        setFocusMode(false);
        setRightOpen(true);
        setInspectorTabRequest("edit");
      },
    },
    {
      id: "open-analyze",
      label: lang === "ja" ? "Analyze を開く" : "Open Analyze",
      hint: lang === "ja" ? "検索 / 関係 / 解析" : "Search / links / analytics",
      keywords: ["analyze", "analytics", "network", "search"],
      run: () => {
        setFocusMode(false);
        setRightOpen(true);
        setInspectorTabRequest("analyze");
      },
    },
    {
      id: "open-library",
      label: lang === "ja" ? "Library を開く" : "Open Library",
      hint: lang === "ja" ? "入出力 / ブックマーク / 分岐" : "IO / bookmarks / branches",
      keywords: ["library", "workspace", "import", "export", "bookmark"],
      run: () => {
        setFocusMode(false);
        setRightOpen(true);
        setInspectorTabRequest("workspace");
      },
    },
    ...VIEW_TYPES.map((targetView) => ({
      id: `view-${targetView}`,
      label: lang === "ja" ? `${VIEW_LABELS[targetView].ja} を開く` : `Open ${VIEW_LABELS[targetView].en}`,
      hint: targetView,
      keywords: [targetView, VIEW_LABELS[targetView].ja, VIEW_LABELS[targetView].en],
      run: () => setView(targetView),
    })),
  ], [focusMode, lang, lockedEditTarget, nodeCrud, selectedTopic, toggleEditLock, topicCrud]);
  const effectiveLeftOpen = leftOpen && !focusMode;
  const effectiveRightOpen = rightOpen && !focusMode;
  const sidePanelBottomInset = focusMode ? 0 : (scrubberCollapsed ? 52 : 104) + Math.max(0, -scrubberPosition.y);
  const {
    sampleActionPreview,
    selectedSamplePreset,
    samplePresetStats,
    selectedSampleStats,
    currentWorkspaceStats,
    recommendedSampleAction,
    openReplaceSamplePreview,
    openAppendSamplePreview,
    confirmSampleAction,
    downloadSampleJson,
    clearSampleActionPreview,
    changeSamplePreviewTargetView,
  } = useSampleWorkspace({
    state,
    topics,
    samplePresetId,
    lang,
    resetUndoRedoStacks,
    applyResolvedSelectionState,
    setSelectedTopicId,
    setSelectedNodeId,
    updateState,
    setView,
    showToast,
  });
  const {
    restoreFromBackupNow,
    exportNodesCsvFile,
    exportEdgesCsvFile,
    exportObsidianZip,
    exportStandaloneHtml,
  } = useWorkspaceIO({
    topics,
    stateRef,
    selectedTopicId,
    selectedNodeId,
    resetUndoRedoStacks,
    applyResolvedSelectionState,
    setSelectedTopicId,
    setSelectedNodeId,
    setRepairMessage,
    showToast,
    lang,
  });
  const {
    branchDiffs,
    branchReviews,
    branchConflicts,
    createScenarioBranch,
    deleteScenarioBranch,
    updateScenarioBranchStatus,
    updateScenarioBranch,
    captureScenarioBranchSnapshot,
    materializeScenarioBranch,
    syncScenarioBranchFromSource,
    backportScenarioBranch,
    backportScenarioBranchNode,
    navigateScenarioBranch,
  } = useScenarioBranches({
    state,
    topics,
    lang,
    updateState,
    openInSphere,
    showToast,
  });
  const {
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
    addConversionRule,
    updateConversionRule,
    deleteConversionRule,
    addUserMethod,
    deleteUserMethod,
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
  } = useWorkspaceCollections({
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
  });

  // --- Undo / Redo ---
  const undoHandler = useCallback(() => appState.undoState(selectedTopicId, selectedNodeId, setSelectedTopicId, setSelectedNodeId, setRepairMessage), [selectedTopicId, selectedNodeId]);
  const redoHandler = useCallback(() => appState.redoState(selectedTopicId, selectedNodeId, setSelectedTopicId, setSelectedNodeId, setRepairMessage), [selectedTopicId, selectedNodeId]);

  const handleSelectSmartFolder = useCallback((folder: SmartFolder) => {
    const match = findFirstSmartFolderMatch(topics, folder.filter);
    if (!match) {
      showToast(lang === "ja" ? "一致ノードがありません" : "No matching nodes", "info");
      return;
    }
    openInSphere(match.topicId, match.nodeId);
  }, [topics, showToast, lang, openInSphere]);

  useKeyboard(undoHandler, redoHandler, {
    onEsc: () => {
      if (shortcutsModalOpen) { setShortcutsModalOpen(false); return; }
      if (commandPaletteOpen) { setCommandPaletteOpen(false); return; }
      if (focusMode) { setFocusMode(false); return; }
      if (rightOpen) { setRightOpen(false); return; }
      if (leftOpen) { setLeftOpen(false); return; }
      if (selectedNodeId) { setSelectedNodeId(null); return; }
    },
    onSpace: () => setScrubberCollapsed((v) => !v),
    onFocusSelected: () => {
      if (selectedNodeId && selectedTopic) {
        setView("sphere");
      }
    },
    onCommandPalette: () => setCommandPaletteOpen(true),
    onShowShortcuts: () => setShortcutsModalOpen((v) => !v),
  });

  // --- History ---
  const captureHistoryFrame = () => { if (!selectedTopic) return; doUpdateSelectedTopic((t) => appendHistoryFrameToTopic(t, buildHistorySnapshotFrame(t), 24)); };
  const applyHistoryFrame = (fid: string) => { if (!selectedTopic) return; const f = selectedTopic.history.find((i) => i.id === fid); if (!f) return; doUpdateSelectedTopic((t) => applyHistoryFrameToTopic(t, f)); };
  const deleteHistoryFrame = async (fid: string) => {
    const ok = await confirm({
      title: lang === "ja" ? "フレーム削除" : "Delete frame",
      message: lang === "ja" ? "このヒストリーフレームを削除しますか？この操作は元に戻せません。" : "Delete this history frame? This cannot be undone.",
      confirmLabel: lang === "ja" ? "削除" : "Delete",
      cancelLabel: lang === "ja" ? "キャンセル" : "Cancel",
      danger: true,
    });
    if (ok) doUpdateSelectedTopic((t) => removeHistoryFrameByIdFromTopic(t, fid));
  };

  // --- Presets ---
  const applyPreset = () => doUpdateSelectedTopic((t) => applyPresetToTopic(t, preset));
  const generatePresetSeed = () => doUpdateSelectedTopic((t) => appendSeedBundleToTopic(t, preset));

  // --- Node Split / Merge ---
  const handleSplitNode = useCallback(() => {
    if (!selectedTopic || !selectedNodeId) return;
    const result = splitNodeInTopic(selectedTopic, selectedNodeId);
    if (!result) return;
    doUpdateSelectedTopic(() => result.topic);
    setSelectedNodeId(result.newNodeIds[0]);
    showToast(lang === "ja" ? "ノードを分割しました" : "Node split", "success");
    pushEvent("node:update", { topicId: selectedTopic.id, targetId: selectedNodeId, detail: { action: "split" } });
  }, [selectedTopic, selectedNodeId, doUpdateSelectedTopic, setSelectedNodeId, showToast, lang, pushEvent]);

  const handleMergeNodes = useCallback(() => {
    if (!selectedTopic || multiNodeIds.length !== 2) {
      showToast(lang === "ja" ? "統合には2ノードを選択してください" : "Select exactly 2 nodes to merge", "error");
      return;
    }
    const result = mergeNodesInTopic(selectedTopic, multiNodeIds[0], multiNodeIds[1]);
    if (!result) return;
    doUpdateSelectedTopic(() => result.topic);
    setSelectedNodeId(result.mergedNodeId);
    clearMultiSelection();
    showToast(lang === "ja" ? "ノードを統合しました" : "Nodes merged", "success");
    pushEvent("node:create", { topicId: selectedTopic.id, targetId: result.mergedNodeId, detail: { action: "merge" } });
  }, [selectedTopic, multiNodeIds, doUpdateSelectedTopic, setSelectedNodeId, clearMultiSelection, showToast, lang, pushEvent]);

  // --- Suggestion: merge from panel (SuggestionPanel → handleMergeNodes 相当、トピックを指定) ---
  const handleSuggestionMerge = useCallback((topicId: string, nodeIdA: string, nodeIdB: string) => {
    const topic = state.topics.find((t) => t.id === topicId);
    if (!topic) return;
    const result = mergeNodesInTopic(topic, nodeIdA, nodeIdB);
    if (!result) return;
    updateState((prev) => ({ ...prev, topics: prev.topics.map((t) => t.id === topicId ? result.topic : t) }));
    openInSphere(topicId, result.mergedNodeId);
    showToast(lang === "ja" ? "ノードを統合しました" : "Nodes merged", "success");
    pushEvent("node:create", { topicId, targetId: result.mergedNodeId, detail: { action: "merge" } });
  }, [state.topics, updateState, openInSphere, showToast, lang, pushEvent]);

  // --- Suggestion: auto-link from panel (両ノード間に「参照」エッジを自動作成) ---
  const handleSuggestionLink = useCallback((topicIdA: string, nodeIdA: string, topicIdB: string, nodeIdB: string) => {
    if (topicIdA !== topicIdB) {
      // 異なる球体 → TopicLink を作成
      updateState((prev) => ({
        ...prev,
        topicLinks: [...prev.topicLinks, { id: newId("tl"), from: topicIdA, to: topicIdB, relation: "参照", meaning: nodeIdA + " → " + nodeIdB }],
      }));
      showToast(lang === "ja" ? "球体リンクを追加しました" : "Topic link added", "success");
    } else {
      // 同一球体 → 通常エッジを追加
      const { newId: edgeId } = { newId: newId("edge") };
      updateState((prev) => ({
        ...prev,
        topics: prev.topics.map((t) =>
          t.id === topicIdA
            ? { ...t, edges: [...t.edges, { id: edgeId, from: nodeIdA, to: nodeIdB, relation: "参照", meaning: "auto-linked", weight: 1, visible: true }] }
            : t
        ),
      }));
      showToast(lang === "ja" ? "リンクを追加しました" : "Edge added", "success");
    }
    pushEvent("edge:create", { topicId: topicIdA, targetId: nodeIdA, detail: { action: "auto-link" } });
  }, [updateState, showToast, lang, pushEvent]);

  // --- Context menu items ---
  const ctxMenuItems = useMemo<ContextMenuItem[]>(() => {
    const targetTopic = ctxMenu?.topicId ? topics.find((topic) => topic.id === ctxMenu.topicId) || null : null;
    const targetNode = ctxMenu?.nodeId && targetTopic ? targetTopic.nodes.find((node) => node.id === ctxMenu.nodeId) || null : null;
    if (targetNode && targetTopic) {
      return [
        { label: lang === "ja" ? "ノードのプロパティ" : "Node Properties", icon: "◫", onClick: () => openNodeProperties(targetTopic.id, targetNode.id) },
        { label: lang === "ja" ? "インスペクタに固定" : "Pin in Inspector", icon: "⌘", onClick: () => pinEditTarget(targetTopic.id, targetNode.id) },
        { label: lang === "ja" ? "球体で開く" : "Open in Sphere", icon: "◎", onClick: () => openInSphere(targetTopic.id, targetNode.id) },
        { label: lang === "ja" ? "ブックマーク" : "Bookmark", icon: "★", onClick: () => { openNodeProperties(targetTopic.id, targetNode.id); addBookmark(targetNode.label); } },
      ];
    }
    if (targetTopic) {
      return [
        { label: lang === "ja" ? "トピックのプロパティ" : "Topic Properties", icon: "▣", onClick: () => openTopicProperties(targetTopic.id, targetTopic.nodes[0]?.id || null) },
        { label: lang === "ja" ? "インスペクタに固定" : "Pin in Inspector", icon: "⌘", onClick: () => pinEditTarget(targetTopic.id, targetTopic.nodes[0]?.id || null) },
        { label: lang === "ja" ? "球体で開く" : "Open in Sphere", icon: "◎", onClick: () => openInSphere(targetTopic.id, targetTopic.nodes[0]?.id || null) },
        { label: lang === "ja" ? "ブックマーク" : "Bookmark", icon: "★", onClick: () => { openTopicProperties(targetTopic.id, targetTopic.nodes[0]?.id || null); addBookmark(targetTopic.title); } },
      ];
    }
    return [];
  }, [ctxMenu, topics, lang, openNodeProperties, openTopicProperties, pinEditTarget, openInSphere, addBookmark]);

  // --- Cross-topic node update (for IntakeView etc.) ---
  const updateNodeInTopic = useCallback((topicId: string, nodeId: string, patch: Record<string, unknown>) => {
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((t) =>
        t.id === topicId
          ? { ...t, nodes: t.nodes.map((n) => n.id === nodeId ? { ...n, ...patch } : n) }
          : t
      ),
    }));
  }, [updateState]);

  const updateEdgeInTopic = useCallback((topicId: string, edgeId: string, patch: Record<string, unknown>) => {
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((t) =>
        t.id === topicId
          ? { ...t, edges: t.edges.map((e) => e.id === edgeId ? { ...e, ...patch } : e) }
          : t
      ),
    }));
  }, [updateState]);

  const updateInspectorTopic = useCallback((patch: Partial<TopicItem>) => {
    if (!inspectorTopic) return;
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) => topic.id === inspectorTopic.id ? patchTopicItem(topic, patch) : topic),
    }));
  }, [inspectorTopic, updateState]);

  const duplicateInspectorTopic = useCallback(() => {
    if (!inspectorTopic) return;
    const duplicated = buildDuplicatedTopicItem(inspectorTopic);
    updateState((prev) => appendTopicItemsToState(prev, [duplicated.topic]));
    openInSphere(duplicated.topic.id, duplicated.firstNodeId);
  }, [inspectorTopic, openInSphere, updateState]);

  const deleteInspectorTopic = useCallback(() => {
    if (!inspectorTopic) return;
    const deletingSelected = selectedTopicId === inspectorTopic.id;
    let nextTopicId: string | null = null;
    let nextNodeId: string | null = null;
    updateState((prev) => {
      const result = removeSelectedTopicInState(prev, inspectorTopic.id);
      nextTopicId = result.nextTopicId;
      nextNodeId = result.nextNodeId;
      prev.topics = result.state.topics;
      prev.topicLinks = result.state.topicLinks;
      return prev;
    });
    if (deletingSelected) {
      setSelectedTopicId(nextTopicId);
      setSelectedNodeId(nextNodeId);
    }
    setLockedEditTarget(null);
  }, [inspectorTopic, selectedTopicId, setSelectedNodeId, setSelectedTopicId, updateState]);

  const applyParaCategoryToInspectorSubtree = useCallback((category: string) => {
    if (!inspectorTopic) return;
    const subtreeIds = collectTopicSubtreeIds(topics, inspectorTopic.id);
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) => {
        if (!subtreeIds.has(topic.id)) return topic;
        const parent = topic.parentTopicId ? prev.topics.find((item) => item.id === topic.parentTopicId) : null;
        return patchTopicItem(topic, {
          paraCategory: category,
          folder: buildParaFolderPath(category, topic.title, parent?.folder),
        });
      }),
    }));
  }, [inspectorTopic, topics, updateState]);

  const updateInspectorNode = useCallback((patch: Record<string, unknown>) => {
    if (!inspectorTopic || !inspectorNode) return;
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) =>
        topic.id === inspectorTopic.id
          ? updateNodeByIdInTopic(topic, inspectorNode.id, (node) => ({ ...node, ...patch }))
          : topic
      ),
    }));
  }, [inspectorNode, inspectorTopic, updateState]);

  const duplicateInspectorNode = useCallback(() => {
    if (!inspectorTopic || !inspectorNode) return;
    const duplicatedId = newId("node");
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) =>
        topic.id === inspectorTopic.id
          ? appendNodesToTopic(topic, [createDuplicatedNodeItem(inspectorNode, { id: duplicatedId, labelSuffix: " copy", dx: 0.35, dy: 0.2, dz: 0.15 })])
          : topic
      ),
    }));
    setLockedEditTarget({ topicId: inspectorTopic.id, nodeId: duplicatedId });
    setSelectedTopicId(inspectorTopic.id);
    setSelectedNodeId(duplicatedId);
  }, [inspectorNode, inspectorTopic, setSelectedNodeId, setSelectedTopicId, updateState]);

  const deleteInspectorNode = useCallback(() => {
    if (!inspectorTopic || !inspectorNode) return;
    let nextNodeId: string | null = null;
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) => {
        if (topic.id !== inspectorTopic.id) return topic;
        const result = removeSelectedNodesInTopic(topic, new Set([inspectorNode.id]));
        nextNodeId = result.nextSelectedNodeId;
        return result.topic;
      }),
    }));
    if (selectedTopicId === inspectorTopic.id && selectedNodeId === inspectorNode.id) {
      setSelectedNodeId(nextNodeId);
    }
    setLockedEditTarget({ topicId: inspectorTopic.id, nodeId: nextNodeId });
  }, [inspectorNode, inspectorTopic, selectedNodeId, selectedTopicId, setSelectedNodeId, updateState]);

  const toggleMustOneOnInspectorNode = useCallback(() => {
    if (!inspectorTopic || !inspectorNode) return;
    const today = new Date().toISOString().slice(0, 10);
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) => {
        if (topic.id !== inspectorTopic.id) return topic;
        const nextMustOneId = topic.mustOneNodeId === inspectorNode.id ? null : inspectorNode.id;
        return patchTopicItem(topic, {
          mustOneNodeId: nextMustOneId,
          mustOneDate: nextMustOneId ? today : null,
          mustOneHistory: nextMustOneId
            ? appendMustOneHistory(topic.mustOneHistory, inspectorNode.id, inspectorNode.label, today)
            : topic.mustOneHistory,
        });
      }),
    }));
  }, [inspectorNode, inspectorTopic, updateState]);

  const saveNodeSelectionSet = useCallback((label: string) => {
    if (!inspectorTopic) return;
    const uniqueNodeIds = Array.from(new Set(multiNodeIds.filter((nodeId) => inspectorTopic.nodes.some((node) => node.id === nodeId))));
    if (uniqueNodeIds.length === 0) return;
    const topicSets = (state.nodeSelectionSets || []).filter((set) => set.topicId === inspectorTopic.id);
    const trimmedLabel = label.trim() || `${inspectorTopic.title} set ${topicSets.length + 1}`;
    const color = SELECTION_SET_COLORS[topicSets.length % SELECTION_SET_COLORS.length];
    updateState((prev) => ({
      ...prev,
      nodeSelectionSets: [
        {
          id: newId("selset"),
          label: trimmedLabel,
          topicId: inspectorTopic.id,
          nodeIds: uniqueNodeIds,
          color,
          createdAt: new Date().toISOString(),
        },
        ...(prev.nodeSelectionSets || []),
      ],
    }));
  }, [inspectorTopic, multiNodeIds, state.nodeSelectionSets, updateState]);

  const applyNodeSelectionSet = useCallback((setId: string) => {
    const set = (state.nodeSelectionSets || []).find((item) => item.id === setId);
    if (!set) return;
    const topic = topics.find((item) => item.id === set.topicId);
    if (!topic) return;
    const validNodeIds = set.nodeIds.filter((nodeId) => topic.nodes.some((node) => node.id === nodeId));
    openInSphere(topic.id, validNodeIds[0] || topic.nodes[0]?.id || null);
    setMultiNodeIds(validNodeIds);
  }, [openInSphere, setMultiNodeIds, state.nodeSelectionSets, topics]);

  const deleteNodeSelectionSet = useCallback((setId: string) => {
    updateState((prev) => ({
      ...prev,
      nodeSelectionSets: (prev.nodeSelectionSets || []).filter((item) => item.id !== setId),
    }));
  }, [updateState]);

  const renameNodeSelectionSet = useCallback((setId: string, label: string) => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    updateState((prev) => ({
      ...prev,
      nodeSelectionSets: (prev.nodeSelectionSets || []).map((item) => item.id === setId ? { ...item, label: trimmedLabel } : item),
    }));
  }, [updateState]);

  const cycleNodeSelectionSetColor = useCallback((setId: string) => {
    updateState((prev) => ({
      ...prev,
      nodeSelectionSets: (prev.nodeSelectionSets || []).map((item) => {
        if (item.id !== setId) return item;
        const currentIndex = SELECTION_SET_COLORS.indexOf((item.color || SELECTION_SET_COLORS[0]) as typeof SELECTION_SET_COLORS[number]);
        const nextColor = SELECTION_SET_COLORS[(Math.max(0, currentIndex) + 1) % SELECTION_SET_COLORS.length];
        return { ...item, color: nextColor };
      }),
    }));
  }, [updateState]);

  const arrangeWorkspaceTopicGroup = useCallback((topicIds: string[], mode: WorkspaceArrangeMode, groupBy: WorkspaceArrangeGroupBy = "folder") => {
    if (topicIds.length < 2) return;
    updateState((prev) => ({
      ...prev,
      topics: arrangeWorkspaceTopics(prev.topics, topicIds, mode, groupBy),
    }));
    setWorkspaceArrangeMeta({ mode, groupBy, topicCount: topicIds.length });
  }, [updateState]);

  // Build breadcrumb: walk parent chain → folder → topic → node
  const breadcrumbSegments: { label: string; sub?: string; onClick?: () => void }[] = [];
  if (selectedTopic) {
    // Collect ancestor chain
    const ancestors: TopicItem[] = [];
    let current: TopicItem | undefined = selectedTopic;
    while (current?.parentTopicId) {
      const parent = topics.find((t) => t.id === current!.parentTopicId);
      if (!parent || ancestors.includes(parent)) break;
      ancestors.unshift(parent);
      current = parent;
    }
    // Root folder
    const rootFolder = ancestors.length > 0 ? ancestors[0].folder : selectedTopic.folder;
    breadcrumbSegments.push({ label: rootFolder || "---", sub: "folder" });
    // Ancestor spheres
    ancestors.forEach((a) => {
      breadcrumbSegments.push({ label: a.title, sub: "sphere", onClick: () => openInSphere(a.id, a.nodes[0]?.id || null) });
    });
    // Current topic
    breadcrumbSegments.push({ label: selectedTopic.title, sub: "topic", onClick: () => openInSphere(selectedTopic.id, selectedTopic.nodes[0]?.id || null) });
    // Selected node
    if (selectedNode) {
      breadcrumbSegments.push({ label: selectedNode.label, sub: [selectedNode.layer, selectedNode.group].filter(Boolean).join(" / ") || "node" });
    }
  }

  return (
    <AppProvider value={{ state, updateState, showToast, lang, setLang }}>
      {/* Full-screen viewport (single or multi-pane) */}
      <MultiPaneLayout primaryView={view} splitMode={splitMode} panes={panes} onPaneViewChange={handlePaneViewChange} onPaneSyncModeChange={handlePaneSyncModeChange} onPaneSelectionChange={handlePaneSelectionChange} sphereTopic={sphereTopic} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} onMoveSelectedNode={(pos) => nodeCrud.updateSelectedNode({ position: pos })} topics={topics} topicLinks={topicLinks} selectedTopicId={selectedTopicId} onSelectTopic={(tid: string, nid: string | null) => openInSphere(tid, nid)} onUpdateNode={updateNodeInTopic} onUpdateEdge={updateEdgeInTopic} journal={journal} leftOpen={effectiveLeftOpen} rightOpen={effectiveRightOpen} leftWidth={theme.settings.leftPanelWidth} rightWidth={theme.settings.rightPanelWidth} workspaceViewport={workspaceViewport} onWorkspaceViewportChange={setWorkspaceViewport} onBookmarkWorkspaceViewport={bookmarkWorkspaceViewport} onArrangeWorkspaceTopics={arrangeWorkspaceTopicGroup} multiNodeIdSet={multiNodeIdSet} compareNodeState={currentTopicCompareState} onNodeContextMenu={handleNodeContextMenu} onTopicContextMenu={handleTopicContextMenu} lang={lang} nodeColorOverrides={nodeColorOverrides} />

      <AppChrome
        breadcrumbSegments={breadcrumbSegments}
        leftOpen={effectiveLeftOpen}
        rightOpen={effectiveRightOpen}
        focusMode={focusMode}
        onToggleLeft={() => setLeftOpen((v) => !v)}
        onToggleRight={() => setRightOpen((v) => !v)}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        lang={lang}
      />

      {/* Topic tab bar */}
      {topicTabs.tabs.length > 0 && (
        <div
          className="pointer-events-auto absolute z-20"
          style={{
            bottom: 0,
            left: theme.settings.leftPanelWidth,
            right: theme.settings.rightPanelWidth,
          }}
        >
          <TopicTabBar
            tabs={topicTabs.tabs}
            activeTabId={topicTabs.activeTabId}
            topics={topics}
            onActivate={handleActivateTab}
            onClose={topicTabs.closeTab}
            lang={lang}
          />
        </div>
      )}

      {/* Left sidebar - floating overlay */}
      <LeftSidebar
        open={effectiveLeftOpen}
        width={theme.settings.leftPanelWidth}
        bottomInset={sidePanelBottomInset}
        panelZoom={theme.panelZoom}
        lang={lang}
        ui={ui}
        topics={topics}
        selectedTopicId={selectedTopicId}
        onSelectTopic={(tid: string, nid: string | null) => openInSphere(tid, nid)}
        onTopicContextMenu={handleTopicContextMenu}
        onAddTopic={topicCrud.addTopic}
        onAddChildTopic={topicCrud.addChildTopic}
        onAddNode={nodeCrud.addNode}
        onDuplicateSelectedTopic={topicCrud.duplicateSelectedTopic}
        onDeleteSelectedTopic={topicCrud.deleteSelectedTopic}
        view={view}
        onChangeView={setView}
        recommendedViews={recommendedViews}
        splitMode={splitMode}
        onChangeSplitMode={handleSplitModeChange}
        preset={preset}
        onChangePreset={setPreset}
        onApplyPreset={applyPreset}
        onGeneratePresetSeed={generatePresetSeed}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undoHandler}
        onRedo={redoHandler}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenImportExport={() => setImportExportModalOpen(true)}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        lang={lang}
        onChangeLang={setLang}
        themeSettings={theme.settings}
        onUpdateTheme={theme.setSettings}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undoHandler}
        onRedo={redoHandler}
        onRepair={() => repairCurrentState(setRepairMessage)}
        onRestore={restoreFromBackupNow}
        repairMessage={repairMessage}
        buildStamp={buildStamp}
        offlineReady={pwaState.offlineReady}
        needRefresh={pwaState.needRefresh}
        onRefresh={pwaState.onRefresh}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        open={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
        lang={lang}
        importReport={markdownIO.importReport}
        mdImportMode={markdownIO.mdImportMode}
        onChangeMdImportMode={markdownIO.setMdImportMode}
        fileInputRef={markdownIO.fileInputRef}
        onImportFiles={(e) => markdownIO.handleImportMarkdownFiles(e, updateState, stateRef, selectedTopicId, selectedNodeId, openInSphere, setViewStr, setRepairMessage)}
        onExportNodesCsv={exportNodesCsvFile}
        onExportEdgesCsv={exportEdgesCsvFile}
        onExportObsidianZip={exportObsidianZip}
        onExportStandaloneHtml={exportStandaloneHtml}
        samplePresetId={samplePresetId}
        onChangeSamplePresetId={setSamplePresetId}
        samplePresetStats={samplePresetStats}
        selectedSamplePreset={selectedSamplePreset}
        selectedSampleStats={selectedSampleStats}
        currentWorkspaceStats={currentWorkspaceStats}
        recommendedSampleAction={recommendedSampleAction}
        sampleActionPreview={sampleActionPreview}
        onOpenReplaceSamplePreview={openReplaceSamplePreview}
        onOpenAppendSamplePreview={openAppendSamplePreview}
        onDownloadSampleJson={downloadSampleJson}
        onConfirmSampleAction={confirmSampleAction}
        onClearSamplePreview={clearSampleActionPreview}
        onChangeSamplePreviewTargetView={changeSamplePreviewTargetView}
      />

      <KeyboardShortcutsModal open={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} lang={lang} />

        {/* Right inspector - floating overlay */}
        <RightInspector
          open={effectiveRightOpen}
          width={theme.settings.rightPanelWidth}
          bottomInset={sidePanelBottomInset}
          panelZoom={theme.panelZoom}
          lang={lang}
          editLocked={!!lockedEditTarget}
          editLockLabel={lockedEditTarget ? [inspectorTopic?.title, inspectorNode?.label].filter(Boolean).join(" / ") : ""}
          onToggleEditLock={toggleEditLock}
          requestedTab={inspectorTabRequest}
          selectedTopic={inspectorTopic}
          selectedNode={inspectorNode}
          ui={ui}
          topicPanelProps={{
            topic: inspectorTopic!,
            selectedNode: inspectorNode,
            topics,
            topicLinks,
            lang,
            onDuplicateTopic: duplicateInspectorTopic,
            onDeleteTopic: deleteInspectorTopic,
            onUpdateTopic: updateInspectorTopic,
            onToggleMustOne: toggleMustOneOnInspectorNode,
            onApplyParaToSubtree: applyParaCategoryToInspectorSubtree,
            onSelectMustOneHistory: (nodeId: string) => inspectorTopic && openInSphere(inspectorTopic.id, nodeId),
            allMethods,
          }}
          nodeOutlinerPanelProps={inspectorTopic ? {
            nodes: inspectorTopic.nodes,
            selectedNodeId: selectedTopicId === inspectorTopic.id ? selectedNodeId : null,
            lockedNodeId: lockedEditTarget?.topicId === inspectorTopic.id ? (lockedEditTarget.nodeId || null) : null,
            multiSelectedNodeIds: multiNodeIds.filter((nodeId) => inspectorTopic.nodes.some((node) => node.id === nodeId)),
            savedSets: (state.nodeSelectionSets || []).filter((set) => set.topicId === inspectorTopic.id),
            compareSetId: selectionSetCompareId,
            lang,
            onSelectNode: (nodeId: string) => openInSphere(inspectorTopic.id, nodeId),
            onPinNode: (nodeId: string) => pinEditTarget(inspectorTopic.id, nodeId),
            onSaveSelectionSet: saveNodeSelectionSet,
            onApplySelectionSet: applyNodeSelectionSet,
            onRenameSelectionSet: renameNodeSelectionSet,
            onCycleSelectionSetColor: cycleNodeSelectionSetColor,
            onDeleteSelectionSet: deleteNodeSelectionSet,
            onChangeCompareSetId: setSelectionSetCompareId,
            onUpdateSelectionSet: (setId: string, patch: Partial<NodeSelectionSet>) => {
              updateState((prev) => ({
                ...prev,
                nodeSelectionSets: (prev.nodeSelectionSets || []).map((item) =>
                  item.id === setId ? { ...item, ...patch } : item
                ),
              }));
            },
            recommendedSortKey: inspectorTopic
              ? (inspectorTopic.activeMethods || [])
                  .map((mid) => allMethods.find((m) => m.id === mid)?.displayRules?.defaultSortKey)
                  .find(Boolean)
              : undefined,
          } : null}
          methodSelectorProps={{
            lang,
            activeMethods: inspectorTopic?.activeMethods || [],
            userMethods: state.userMethods || [],
            onToggleMethod: (mid) => {
              const prev = inspectorTopic?.activeMethods || [];
              const next = prev.includes(mid) ? prev.filter((m) => m !== mid) : [...prev, mid];
              updateInspectorTopic({ activeMethods: next });
            },
            onAddUserMethod: addUserMethod,
            onDeleteUserMethod: deleteUserMethod,
          }}
          nodePanelProps={inspectorNode ? {
            ui,
            node: inspectorNode,
            lang,
            activeMethods: inspectorTopic?.activeMethods,
            allMethods,
            topics,
            vocabulary: state.vocabulary || [],
            currentNodeColor: inspectorNode ? nodeColorOverrides.get(inspectorNode.id) : undefined,
            onDuplicateNode: duplicateInspectorNode,
            onDeleteNode: deleteInspectorNode,
            onUpdateNode: updateInspectorNode,
            onSnapToSphere: () => updateInspectorNode({ position: normalizeNodeToSphere(inspectorNode.position) }),
            onNavigateNode: (tid: string, nid: string | null) => openInSphere(tid, nid),
          } : null}
          searchPanelProps={{
            searchQuery,
            onChangeSearchQuery: setSearchQuery,
            searchResults,
            onFocusNode: focusInSphere,
            lang,
          }}
          searchFilterPanelProps={{
            layerFilter,
            onChangeLayerFilter: setLayerFilter,
            groupFilter,
            onChangeGroupFilter: setGroupFilter,
            uniqueLayers,
            uniqueGroups,
            onSelectFiltered: () => selectFilteredNodes(filteredNodeIds),
            onClearSelected: clearMultiSelection,
            filteredNodes: filteredTopic?.nodes || [],
            multiNodeIdSet,
            onToggleMultiNode: toggleMultiNode,
            onFocusNode: focusInSphere,
            lang,
          }}
          bulkOpsPanelProps={{
            multiNodeIdsCount: multiNodeIds.length,
            onBulkSnap: bulkOps.bulkSnapSelectedNodesToSphere,
            onBulkCopy: bulkOps.bulkDuplicateSelectedNodes,
            onBulkDelete: async () => {
              const ok = await confirm({
                title: lang === "ja" ? "一括削除" : "Bulk delete",
                message: lang === "ja" ? `選択中の ${multiNodeIds.length} ノードを削除しますか？` : `Delete ${multiNodeIds.length} selected nodes?`,
                confirmLabel: lang === "ja" ? "削除" : "Delete",
                cancelLabel: lang === "ja" ? "キャンセル" : "Cancel",
                danger: true,
              });
              if (ok) bulkOps.bulkDeleteSelectedNodes();
            },
            bulkGroupValue: bulkOps.bulkGroupValue,
            onChangeBulkGroupValue: bulkOps.setBulkGroupValue,
            onApplyBulkGroup: bulkOps.bulkApplyGroupToSelectedNodes,
            bulkLayerValue: bulkOps.bulkLayerValue,
            onChangeBulkLayerValue: bulkOps.setBulkLayerValue,
            onApplyBulkLayer: bulkOps.bulkApplyLayerToSelectedNodes,
            bulkTypeValue: bulkOps.bulkTypeValue,
            onChangeBulkTypeValue: bulkOps.setBulkTypeValue,
            onApplyBulkType: bulkOps.bulkApplyTypeToSelectedNodes,
            bulkTenseValue: bulkOps.bulkTenseValue,
            onChangeBulkTenseValue: bulkOps.setBulkTenseValue,
            onApplyBulkTense: bulkOps.bulkApplyTenseToSelectedNodes,
            bulkNodeSizeValue: bulkOps.bulkNodeSizeValue,
            onChangeBulkNodeSizeValue: bulkOps.setBulkNodeSizeValue,
            onApplyBulkNodeSize: bulkOps.bulkApplyNodeSizeToSelectedNodes,
            bulkFrameScaleValue: bulkOps.bulkFrameScaleValue,
            onChangeBulkFrameScaleValue: bulkOps.setBulkFrameScaleValue,
            onApplyBulkFrameScale: bulkOps.bulkApplyFrameScaleToSelectedNodes,
            bulkOffsetX: bulkOps.bulkOffsetX,
            onChangeBulkOffsetX: bulkOps.setBulkOffsetX,
            bulkOffsetY: bulkOps.bulkOffsetY,
            onChangeBulkOffsetY: bulkOps.setBulkOffsetY,
            bulkOffsetZ: bulkOps.bulkOffsetZ,
            onChangeBulkOffsetZ: bulkOps.setBulkOffsetZ,
            onBulkMove: bulkOps.bulkOffsetSelectedNodes,
            bulkAddTagValue: bulkOps.bulkAddTagValue,
            onChangeBulkAddTagValue: bulkOps.setBulkAddTagValue,
            onApplyBulkAddTag: bulkOps.bulkAddTagToSelectedNodes,
            bulkRemoveTagValue: bulkOps.bulkRemoveTagValue,
            onChangeBulkRemoveTagValue: bulkOps.setBulkRemoveTagValue,
            onApplyBulkRemoveTag: bulkOps.bulkRemoveTagFromSelectedNodes,
            bulkMessage,
            lang,
          }}
          bulkConnectPanelProps={{
            bulkConnectMode: bulkOps.bulkConnectMode,
            onChangeBulkConnectMode: bulkOps.setBulkConnectMode,
            onBulkConnect: bulkOps.bulkConnectSelectedNodes,
            lang,
          }}
          historyPanelProps={{
            title: ui.history,
            frames: selectedTopic?.history || [],
            applyLabel: ui.applyFrame,
            onCapture: captureHistoryFrame,
            onApply: applyHistoryFrame,
            onDelete: deleteHistoryFrame,
          }}
          nodeNetworkPanelProps={{
            title: lang === "ja" ? "ノード関係" : "Node Network",
            nodes: selectedTopic?.nodes || [],
            edges: selectedTopicEdges,
            lang,
            relationLabel: ui.relation,
            meaningLabel: ui.meaning,
            newEdgeFrom: edgeEditor.newEdgeFrom,
            onChangeNewEdgeFrom: edgeEditor.setNewEdgeFrom,
            newEdgeTo: edgeEditor.newEdgeTo,
            onChangeNewEdgeTo: edgeEditor.setNewEdgeTo,
            newEdgeRelation: edgeEditor.newEdgeRelation,
            onChangeNewEdgeRelation: edgeEditor.setNewEdgeRelation,
            newEdgeMeaning: edgeEditor.newEdgeMeaning,
            onChangeNewEdgeMeaning: edgeEditor.setNewEdgeMeaning,
            newEdgeWeight: edgeEditor.newEdgeWeight,
            onChangeNewEdgeWeight: edgeEditor.setNewEdgeWeight,
            newEdgeContradictionType: edgeEditor.newEdgeContradictionType,
            onChangeNewEdgeContradictionType: edgeEditor.setNewEdgeContradictionType,
            newEdgeTransformOp: edgeEditor.newEdgeTransformOp,
            onChangeNewEdgeTransformOp: edgeEditor.setNewEdgeTransformOp,
            onAddEdge: edgeCrud.addNodeEdge,
            onToggleEdgeVisible: edgeCrud.toggleEdgeVisible,
            onDuplicateEdge: edgeCrud.duplicateNodeEdge,
            onReverseEdge: edgeCrud.reverseNodeEdge,
            onDeleteEdge: edgeCrud.deleteNodeEdge,
            onUpdateEdgeWeight: edgeCrud.updateNodeEdgeWeight,
            onUpdateEdge: edgeCrud.updateEdge,
            onAllOn: () => edgeCrud.setAllSelectedTopicEdgesVisible(true),
            onAllOff: () => edgeCrud.setAllSelectedTopicEdgesVisible(false),
            edgeMessage: edgeEditor.edgeMessage,
            preferredRelations: (selectedTopic?.activeMethods || [])
              .flatMap((mid) => allMethods.find((m) => m.id === mid)?.preferredRelations || [])
              .filter((v, i, a) => a.indexOf(v) === i),
          }}
          topicLinksPanelProps={{
            title: ui.topicLinks,
            topics,
            selectedTopicId: selectedTopic?.id || "",
            links: selectedTopicLinks,
            unresolvedRefs: selectedUnresolvedTopicLinks,
            resolveLabel: ui.resolve,
            targetLabel: ui.target,
            relationLabel: ui.relation,
            meaningLabel: ui.meaning,
            newTarget: topicLinkEditor.newTopicLinkTarget,
            onChangeNewTarget: topicLinkEditor.setNewTopicLinkTarget,
            newRelation: topicLinkEditor.newTopicLinkRelation,
            onChangeNewRelation: topicLinkEditor.setNewTopicLinkRelation,
            newMeaning: topicLinkEditor.newTopicLinkMeaning,
            onChangeNewMeaning: topicLinkEditor.setNewTopicLinkMeaning,
            onAddLink: topicLinkCrudOps.addTopicLink,
            onDeleteLink: topicLinkCrudOps.deleteTopicLink,
            onResolveUnresolved: topicLinkCrudOps.resolveUnresolvedTopicLink,
            onResolveAllUnresolved: () => topicLinkCrudOps.resolveAllUnresolvedTopicLinks(topics),
            onUpdateLink: (linkId: string, patch: Partial<TopicLinkItem>) => {
              updateState((prev) => ({
                ...prev,
                topicLinks: (prev.topicLinks || []).map((l) => l.id === linkId ? { ...l, ...patch } : l),
              }));
            },
            lang,
          }}
          markdownJsonPanelProps={{
            title: ui.markdownJson,
            ioText: markdownIO.ioText,
            onChangeIoText: markdownIO.setIoText,
            onExportJson: () => markdownIO.handleExportJson(stateRef),
            onImportJson: () => markdownIO.handleImportJson(updateState, stateRef, resetUndoRedoStacks, (ns, ti, ni) => applyResolvedSelectionState(ns, ti, ni, setSelectedTopicId, setSelectedNodeId), selectedTopicId, selectedNodeId, setViewStr, setRepairMessage),
            onExportMarkdown: () => markdownIO.handleExportMarkdown(selectedTopic, stateRef),
            onDownloadMarkdown: () => markdownIO.handleDownloadMarkdown(selectedTopic, stateRef),
            onExportAllMarkdown: () => markdownIO.handleExportAllMarkdown(stateRef),
            onDownloadAllMarkdown: () => markdownIO.handleDownloadAllMarkdown(stateRef),
            lang,
          }}
          pageRankPanelProps={{
            title: ui.pageRank,
            nodes: selectedTopic?.nodes || [],
            pageRankMap,
            pageRankFlowMap,
            pageRankFocusMap,
            focusSignals,
            betweennessMap,
            hubMap,
            authorityMap,
            degreeMap,
            communities,
            communityMap,
            onSelectNode: focusInSphere,
            lang,
          }}
          queryPanelProps={{ topics, onSelectNode: (tid: string, nid: string | null) => openInSphere(tid, nid), onSaveAsSmartFolder: (folder: { label: string; filter: SmartFolder["filter"] }) => addSmartFolder({ ...folder, id: newId("sf") }), lang }}
          bookmarkPanelProps={{
            bookmarks: state.bookmarks || [],
            currentTopicId: selectedTopicId,
            currentNodeId: selectedNodeId,
            currentView: view,
            topics: topics.map((t) => ({ id: t.id, title: t.title })),
            onAddBookmark: addBookmark,
            onDeleteBookmark: deleteBookmark,
            onRenameBookmark: renameBookmark,
            onNavigate: navigateBookmark,
            lang,
          }}
          layoutPresetPanelProps={{
            presets: state.layoutPresets || [],
            currentPrimaryView: view,
            currentSplitMode: splitMode,
            currentPanes: panes.map((p) => ({ view: p.view })),
            currentArrangement: workspaceArrangeMeta,
            currentWorkspaceTopicCount: topics.length,
            recentLayoutTransition,
            onSavePreset: saveLayoutPreset,
            onDeletePreset: deleteLayoutPreset,
            onRenamePreset: renameLayoutPreset,
            onCyclePurpose: updateLayoutPresetPurpose,
            onTogglePinned: toggleLayoutPresetPinned,
            onApplyPreset: applyLayoutPreset,
            onRevertRecentLayout: revertRecentLayoutPreset,
            lang,
          }}
          smartFolderPanelProps={{
            folders: state.smartFolders || [],
            topics,
            vocabulary: state.vocabulary || [],
            onAddFolder: addSmartFolder,
            onUpdateFolder: updateSmartFolder,
            onDeleteFolder: deleteSmartFolder,
            onSelectFolder: handleSelectSmartFolder,
            lang,
          }}
          vocabularyPanelProps={{
            vocabulary: state.vocabulary || [],
            lang,
            onUpdate: updateVocabulary,
          }}
          integrityPanelProps={{
            topics,
            topicLinks,
            onSelectNode: (tid: string, nid: string | null) => openInSphere(tid, nid),
            onRemoveBrokenEdges: () => updateState((prev) => ({
              ...prev,
              topics: prev.topics.map((t) => {
                const nodeIds = new Set(t.nodes.map((n) => n.id));
                const cleaned = t.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
                return cleaned.length === t.edges.length ? t : { ...t, edges: cleaned };
              }),
            })),
            lang,
          }}
          suggestionPanelProps={{ topics, onNavigateNode: (tid: string, nid: string | null) => openInSphere(tid, nid), onMergeNodes: handleSuggestionMerge, onLinkNodes: handleSuggestionLink, lang }}
          reviewQueuePanelProps={{
            topics,
            lang,
            onNavigateNode: (tid, nid) => openInSphere(tid, nid),
            onUpdateNode: updateNodeInTopic,
          }}
          materialPanelProps={{
            materials: state.materials || [],
            topics: topics.map((t) => ({ id: t.id, title: t.title })),
            fullTopics: topics,
            lang,
            onUpdate: updateMaterials,
          }}
          urlRecordPanelProps={{
            urlRecords: state.urlRecords || [],
            lang,
            onUpdate: updateURLRecords,
          }}
          snapshotPanelProps={{
            snapshots: state.snapshots || [],
            lang,
            onCapture: captureSnapshot,
            onDelete: deleteSnapshot,
          }}
          journalPanelProps={{
            journals: journal.journals,
            selectedDate: journal.selectedDate,
            todayEntry: journal.todayEntry,
            topics: topics.map((t) => ({ id: t.id, title: t.title })),
            lang,
            onSelectDate: journal.setSelectedDate,
            onAddOrUpdate: journal.addOrUpdateEntry,
            onDelete: journal.deleteEntry,
          }}
          recoveryPanelProps={{
            canUndo,
            canRedo,
            onUndo: undoHandler,
            onRedo: redoHandler,
            onRepair: () => repairCurrentState(setRepairMessage),
            onRestore: restoreFromBackupNow,
            repairMessage,
            importReport: markdownIO.importReport,
          }}
          bundlePanelProps={{
            bundles: state.bundles || [],
            topics,
            selectedTopicId,
            selectedNodeId,
            onCreateBundle: createWorkspaceBundle,
            onDeleteBundle: deleteWorkspaceBundle,
            onUpdateBundle: updateWorkspaceBundle,
            onAddCurrentNodeToBundle: addCurrentNodeToBundle,
            onAddCurrentTopicToBundle: addCurrentTopicToBundle,
            onRemoveNodeFromBundle: removeNodeFromWorkspaceBundle,
            onRemoveTopicFromBundle: removeTopicFromWorkspaceBundle,
            onNavigateNode: (tid: string, nid: string | null) => openInSphere(tid, nid),
            currentBundleId: state.currentBundleId,
            onSetCurrentBundle: setCurrentBundleId,
            lang,
          }}
          conversionQueuePanelProps={{ queue: state.conversionQueue || [], rules: state.conversionRules || [], topics, selectedNodeId, selectedTopicId, onAddToQueue: addToConversionQueue, onUpdateStatus: updateConversionStatus, onRemoveFromQueue: removeFromConversionQueue, onNavigate: (tid: string, nid: string | null) => openInSphere(tid, nid), onAddRule: addConversionRule, onUpdateRule: updateConversionRule, onDeleteRule: deleteConversionRule, onRunRules: () => { const candidates = evaluateConversionRules(topics, state.conversionRules || [], state.conversionQueue || []); if (candidates.length > 0) { const items = buildConversionItemsFromCandidates(candidates); updateState((prev) => ({ ...prev, conversionQueue: [...(prev.conversionQueue || []), ...items] })); showToast(lang === "ja" ? `${items.length}件をキューに追加` : `${items.length} added to queue`, "success"); } else { showToast(lang === "ja" ? "該当ノードなし" : "No matching nodes", "info"); } }, lang }}
          eventLogPanelProps={{ events: state.eventLog || [], lang }}
          scenarioBranchPanelProps={{
            branches: state.scenarioBranches || [],
            topics: topics.map((t) => ({ id: t.id, title: t.title })),
            branchDiffs,
            branchReviews,
            branchConflicts,
            onNavigate: navigateScenarioBranch,
            onDelete: deleteScenarioBranch,
            onUpdateStatus: updateScenarioBranchStatus,
            onUpdateBranch: updateScenarioBranch,
            onCaptureSnapshot: captureScenarioBranchSnapshot,
            onMaterialize: materializeScenarioBranch,
            onSyncFromSource: syncScenarioBranchFromSource,
            onBackport: backportScenarioBranch,
            onBackportNode: backportScenarioBranchNode,
            lang,
          }}
        />

        {/* Minimap overlay — visible on spatial views */}
        {(view === "sphere" || view === "canvas2d" || view === "workspace" || view === "network") && (
          <Minimap
            topic={sphereTopic}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        )}

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} />

        {/* Confirm dialog */}
        {confirmState && (
          <ConfirmDialog
            open
            title={confirmState.title}
            message={confirmState.message}
            confirmLabel={confirmState.confirmLabel}
            cancelLabel={confirmState.cancelLabel}
            danger={confirmState.danger}
            onConfirm={() => confirmState.resolve(true)}
            onCancel={() => confirmState.resolve(false)}
          />
        )}

        {/* Context menu */}
        {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenuItems} onClose={closeCtxMenu} />}

        <CommandPalette
          open={commandPaletteOpen}
          title={lang === "ja" ? "Quick Actions" : "Quick Actions"}
          placeholder={lang === "ja" ? "操作や view を検索..." : "Search actions or views..."}
          emptyLabel={lang === "ja" ? "該当する操作がありません" : "No matching actions"}
          actions={commandPaletteActions}
          onClose={() => setCommandPaletteOpen(false)}
        />

        {/* 4D Timeline Scrubber - bottom bar */}
        {!focusMode ? (
          <TimelineScrubber
            events={state.eventLog || []}
            historyFrames={selectedTopic?.history || []}
            branches={state.scenarioBranches || []}
            dragOffsetY={scrubberPosition.y}
            onStartDrag={startScrubberDrag}
            onResetPosition={resetScrubberPosition}
            onScrubToEvent={(ev) => {
              if (ev.topicId) {
                const topic = topics.find((t) => t.id === ev.topicId);
                if (topic && ev.targetId) {
                  openInSphere(ev.topicId, ev.targetId);
                }
              }
            }}
            onApplyFrame={(fid) => {
              if (!selectedTopic) return;
              const f = selectedTopic.history.find((i) => i.id === fid);
              if (f) doUpdateSelectedTopic((t) => applyHistoryFrameToTopic(t, f));
            }}
            onCreateBranch={createScenarioBranch}
            collapsed={scrubberCollapsed}
            onToggleCollapse={() => setScrubberCollapsed((v) => !v)}
          />
        ) : null}
    </AppProvider>
  );
}
