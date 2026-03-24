import React, { useState, useCallback, useRef, useEffect } from "react";
import type { TopicItem, TopicLinkItem, JournalEntry, WorkspaceViewport, EdgeItem } from "../types";
import type { ViewType } from "../constants/views";
import { VIEW_TYPES, VIEW_LABELS } from "../constants/views";
import { MainViewport } from "./MainViewport";
import type { WorkspaceArrangeGroupBy, WorkspaceArrangeMode } from "../utils/workspace-layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SplitMode = "single" | "vertical-2" | "horizontal-2" | "triple" | "quad";
export type PaneSyncMode = "global" | "isolated";

export interface PaneState {
  view: ViewType;
  syncMode?: PaneSyncMode;
  topicId?: string | null;
  nodeId?: string | null;
}

type JournalProps = {
  journals: JournalEntry[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  todayEntry: JournalEntry | null;
  addOrUpdateEntry: (patch: Partial<JournalEntry>) => void;
  deleteEntry: (date: string) => void;
};

export interface MultiPaneLayoutProps {
  primaryView: ViewType;
  splitMode: SplitMode;
  panes: PaneState[];
  onPaneViewChange: (index: number, view: ViewType) => void;
  onPaneSyncModeChange?: (index: number, syncMode: PaneSyncMode) => void;
  onPaneSelectionChange?: (index: number, topicId: string | null, nodeId: string | null) => void;
  sphereTopic: TopicItem | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onMoveSelectedNode?: (position: [number, number, number]) => void;
  onNodeContextMenu?: (event: React.MouseEvent, topicId: string, nodeId: string) => void;
  onTopicContextMenu?: (event: React.MouseEvent, topicId: string) => void;
  topics: TopicItem[];
  topicLinks: TopicLinkItem[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string, preferredNodeId: string | null) => void;
  onUpdateNode?: (topicId: string, nodeId: string, patch: Record<string, unknown>) => void;
  onUpdateEdge?: (topicId: string, edgeId: string, patch: Partial<EdgeItem>) => void;
  journal: JournalProps;
  leftOpen?: boolean;
  rightOpen?: boolean;
  leftWidth?: number;
  rightWidth?: number;
  workspaceViewport?: WorkspaceViewport;
  onWorkspaceViewportChange?: (viewport: WorkspaceViewport) => void;
  onBookmarkWorkspaceViewport?: () => void;
  onArrangeWorkspaceTopics?: (topicIds: string[], mode: WorkspaceArrangeMode, groupBy?: WorkspaceArrangeGroupBy) => void;
  multiNodeIdSet?: Set<string>;
  compareNodeState?: Record<string, "shared" | "current-only" | "set-only">;
  lang?: "ja" | "en";
  nodeColorOverrides?: Map<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Split mode icons                                                   */
/* ------------------------------------------------------------------ */

const SPLIT_ICONS: Record<SplitMode, string> = {
  single: "▣",
  "vertical-2": "▥",
  "horizontal-2": "▤",
  triple: "⊞",
  quad: "▦",
};

const SPLIT_LABELS: Record<SplitMode, { ja: string; en: string }> = {
  single: { ja: "シングル", en: "Single" },
  "vertical-2": { ja: "左右2分割", en: "Vertical Split" },
  "horizontal-2": { ja: "上下2分割", en: "Horizontal Split" },
  triple: { ja: "3分割", en: "Triple" },
  quad: { ja: "4分割", en: "Quad" },
};

/* ------------------------------------------------------------------ */
/*  Resizable divider hook                                             */
/* ------------------------------------------------------------------ */

function useDivider(initial: number, min: number, max: number, direction: "horizontal" | "vertical") {
  const [ratio, setRatio] = useState(initial);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newRatio: number;
      if (direction === "horizontal") {
        newRatio = (e.clientX - rect.left) / rect.width;
      } else {
        newRatio = (e.clientY - rect.top) / rect.height;
      }
      setRatio(Math.max(min, Math.min(max, newRatio)));
    };
    const handleMouseUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction, min, max]);

  return { ratio, containerRef, handleMouseDown };
}

/* ------------------------------------------------------------------ */
/*  Pane header with view selector                                     */
/* ------------------------------------------------------------------ */

function PaneHeader({ view, onChange, lang, index, syncMode = "global", onToggleSyncMode, isMaximized, onToggleMaximize }: {
  view: ViewType;
  onChange: (v: ViewType) => void;
  lang: "ja" | "en";
  index: number;
  syncMode?: PaneSyncMode;
  onToggleSyncMode?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}) {
  return (
    <div
      style={{
        height: 22,
        minHeight: 22,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 6px",
        background: "var(--tw-bg-panel, #1a1a2e)",
        borderBottom: "1px solid var(--tw-border, #333)",
        fontSize: 9,
        color: "var(--tw-text-dim, #888)",
      }}
    >
      <span style={{ opacity: 0.5 }}>P{index + 1}</span>
      <select
        value={view}
        onChange={(e) => onChange(e.target.value as ViewType)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--tw-text, #ccc)",
          fontSize: 9,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {VIEW_TYPES.map((v) => (
          <option key={v} value={v}>{VIEW_LABELS[v].icon} {VIEW_LABELS[v][lang]}</option>
        ))}
      </select>
      <div style={{ flex: 1 }} />
      {onToggleSyncMode && (
        <button
          onClick={onToggleSyncMode}
          title={syncMode === "isolated" ? (lang === "ja" ? "固定ペイン" : "Pinned pane") : (lang === "ja" ? "同期ペイン" : "Synced pane")}
          style={{
            minWidth: 34,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            border: "1px solid var(--tw-border, #333)",
            background: "transparent",
            color: syncMode === "isolated" ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
            cursor: "pointer",
            borderRadius: 3,
            padding: "0 4px",
          }}
        >
          {syncMode === "isolated" ? (lang === "ja" ? "\u25A0 固定" : "\u25A0 Hold") : (lang === "ja" ? "\u2194 同期" : "\u2194 Sync")}
        </button>
      )}
      {onToggleMaximize && (
        <button
          onClick={onToggleMaximize}
          title={isMaximized ? (lang === "ja" ? "元に戻す" : "Restore") : (lang === "ja" ? "最大化" : "Maximize")}
          style={{
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            border: "none",
            background: "transparent",
            color: isMaximized ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          {isMaximized ? "\u2299" : "\u2610"}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pane wrapper                                                       */
/* ------------------------------------------------------------------ */

function PaneContent({ pane, index, onViewChange, onSyncModeChange, onPaneSelectionChange, isMaximized, onToggleMaximize, ...viewProps }: {
  pane: PaneState;
  index: number;
  onViewChange: (index: number, view: ViewType) => void;
  onSyncModeChange?: (index: number, syncMode: PaneSyncMode) => void;
  onPaneSelectionChange?: (index: number, topicId: string | null, nodeId: string | null) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
} & Omit<MultiPaneLayoutProps, "splitMode" | "panes" | "onPaneViewChange" | "onPaneSyncModeChange" | "onPaneSelectionChange" | "primaryView">) {
  const syncMode = pane.syncMode || "global";
  const effectiveTopicId = syncMode === "isolated" ? (pane.topicId ?? viewProps.selectedTopicId) : viewProps.selectedTopicId;
  const effectiveTopic = viewProps.topics.find((topic) => topic.id === effectiveTopicId) || null;
  const effectiveNodeId = syncMode === "isolated"
    ? ((pane.nodeId && effectiveTopic?.nodes.some((node) => node.id === pane.nodeId)) ? pane.nodeId : effectiveTopic?.nodes[0]?.id || null)
    : viewProps.selectedNodeId;
  const effectiveSphereTopic = effectiveTopicId && viewProps.sphereTopic?.id !== effectiveTopicId
    ? (viewProps.topics.find((topic) => topic.id === effectiveTopicId) || null)
    : viewProps.sphereTopic;

  const handleSelectNode = useCallback((nodeId: string | null) => {
    if (syncMode === "isolated") {
      onPaneSelectionChange?.(index, effectiveTopicId || null, nodeId);
      return;
    }
    viewProps.onSelectNode(nodeId);
  }, [syncMode, onPaneSelectionChange, index, effectiveTopicId, viewProps]);

  const handleSelectTopic = useCallback((topicId: string, preferredNodeId: string | null) => {
    if (syncMode === "isolated") {
      const topic = viewProps.topics.find((item) => item.id === topicId);
      const nextNodeId = preferredNodeId && topic?.nodes.some((node) => node.id === preferredNodeId)
        ? preferredNodeId
        : topic?.nodes[0]?.id || null;
      onPaneSelectionChange?.(index, topicId, nextNodeId);
      return;
    }
    viewProps.onSelectTopic(topicId, preferredNodeId);
  }, [syncMode, onPaneSelectionChange, index, viewProps]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      <PaneHeader view={pane.view} onChange={(v) => onViewChange(index, v)} lang={viewProps.lang || "ja"} index={index} syncMode={syncMode} onToggleSyncMode={onSyncModeChange ? () => onSyncModeChange(index, syncMode === "isolated" ? "global" : "isolated") : undefined} isMaximized={isMaximized} onToggleMaximize={onToggleMaximize} />
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <MainViewport
          view={pane.view}
          sphereTopic={effectiveSphereTopic}
          selectedNodeId={effectiveNodeId}
          onSelectNode={handleSelectNode}
          onMoveSelectedNode={viewProps.onMoveSelectedNode}
          onNodeContextMenu={viewProps.onNodeContextMenu}
          onTopicContextMenu={viewProps.onTopicContextMenu}
          topics={viewProps.topics}
          topicLinks={viewProps.topicLinks}
          selectedTopicId={effectiveTopicId}
          onSelectTopic={handleSelectTopic}
          onUpdateNode={viewProps.onUpdateNode}
          onUpdateEdge={viewProps.onUpdateEdge}
          journal={viewProps.journal}
          workspaceViewport={viewProps.workspaceViewport}
          onWorkspaceViewportChange={viewProps.onWorkspaceViewportChange}
          onBookmarkWorkspaceViewport={viewProps.onBookmarkWorkspaceViewport}
          onArrangeWorkspaceTopics={viewProps.onArrangeWorkspaceTopics}
          multiNodeIdSet={viewProps.multiNodeIdSet}
          compareNodeState={viewProps.compareNodeState}
          lang={viewProps.lang}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Divider bar                                                        */
/* ------------------------------------------------------------------ */

function Divider({ direction, onMouseDown }: { direction: "horizontal" | "vertical"; onMouseDown: React.MouseEventHandler }) {
  const isH = direction === "horizontal";
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: isH ? 4 : "100%",
        height: isH ? "100%" : 4,
        cursor: isH ? "col-resize" : "row-resize",
        background: "var(--tw-border, #333)",
        flexShrink: 0,
        position: "relative",
        zIndex: 5,
      }}
    >
      {/* Expanded hit target for easier grabbing (20px touch area) */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: "absolute",
          [isH ? "left" : "top"]: "50%",
          [isH ? "top" : "left"]: 0,
          transform: isH ? "translateX(-50%)" : "translateY(-50%)",
          width: isH ? 20 : "100%",
          height: isH ? "100%" : 20,
          cursor: isH ? "col-resize" : "row-resize",
        }}
      />
      {/* Visual indicator */}
      <div
        style={{
          position: "absolute",
          [isH ? "top" : "left"]: "50%",
          [isH ? "left" : "top"]: "50%",
          transform: "translate(-50%, -50%)",
          width: isH ? 2 : 16,
          height: isH ? 16 : 2,
          borderRadius: 1,
          background: "var(--tw-text-muted, #555)",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main MultiPaneLayout                                               */
/* ------------------------------------------------------------------ */

export function MultiPaneLayout(props: MultiPaneLayoutProps) {
  const { splitMode, panes, onPaneViewChange, onPaneSyncModeChange, onPaneSelectionChange, primaryView, ...viewProps } = props;
  const lang = viewProps.lang || "ja";
  const [maximizedPane, setMaximizedPane] = useState<number | null>(null);

  const toggleMaximize = useCallback((index: number) => {
    setMaximizedPane((prev) => (prev === index ? null : index));
  }, []);

  // Single mode — just render MainViewport directly (no header overhead)
  if (splitMode === "single") {
    return (
      <MainViewport
        view={primaryView}
        sphereTopic={viewProps.sphereTopic}
        selectedNodeId={viewProps.selectedNodeId}
        onSelectNode={viewProps.onSelectNode}
        onMoveSelectedNode={viewProps.onMoveSelectedNode}
        onNodeContextMenu={viewProps.onNodeContextMenu}
        onTopicContextMenu={viewProps.onTopicContextMenu}
        topics={viewProps.topics}
        topicLinks={viewProps.topicLinks}
        selectedTopicId={viewProps.selectedTopicId}
        onSelectTopic={viewProps.onSelectTopic}
        onUpdateNode={viewProps.onUpdateNode}
        onUpdateEdge={viewProps.onUpdateEdge}
        journal={viewProps.journal}
        leftOpen={viewProps.leftOpen}
        rightOpen={viewProps.rightOpen}
        leftWidth={viewProps.leftWidth}
        rightWidth={viewProps.rightWidth}
        workspaceViewport={viewProps.workspaceViewport}
        onWorkspaceViewportChange={viewProps.onWorkspaceViewportChange}
        onBookmarkWorkspaceViewport={viewProps.onBookmarkWorkspaceViewport}
        onArrangeWorkspaceTopics={viewProps.onArrangeWorkspaceTopics}
        multiNodeIdSet={viewProps.multiNodeIdSet}
        compareNodeState={viewProps.compareNodeState}
        lang={viewProps.lang}
      />
    );
  }

  // Vertical 2-pane
  if (splitMode === "vertical-2") {
    return <VerticalSplit panes={panes} onPaneViewChange={onPaneViewChange} onPaneSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} viewProps={viewProps} maximizedPane={maximizedPane} onToggleMaximize={toggleMaximize} />;
  }

  // Horizontal 2-pane
  if (splitMode === "horizontal-2") {
    return <HorizontalSplit panes={panes} onPaneViewChange={onPaneViewChange} onPaneSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} viewProps={viewProps} maximizedPane={maximizedPane} onToggleMaximize={toggleMaximize} />;
  }

  // Triple: left pane + right column (top/bottom)
  if (splitMode === "triple") {
    return <TripleSplit panes={panes} onPaneViewChange={onPaneViewChange} onPaneSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} viewProps={viewProps} maximizedPane={maximizedPane} onToggleMaximize={toggleMaximize} />;
  }

  if (splitMode === "quad") {
    return <QuadSplit panes={panes} onPaneViewChange={onPaneViewChange} onPaneSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} viewProps={viewProps} maximizedPane={maximizedPane} onToggleMaximize={toggleMaximize} />;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Vertical 2-pane                                                    */
/* ------------------------------------------------------------------ */

function VerticalSplit({ panes, onPaneViewChange, onPaneSyncModeChange, onPaneSelectionChange, viewProps, maximizedPane, onToggleMaximize }: { panes: PaneState[]; onPaneViewChange: (i: number, v: ViewType) => void; onPaneSyncModeChange?: (index: number, syncMode: PaneSyncMode) => void; onPaneSelectionChange?: (index: number, topicId: string | null, nodeId: string | null) => void; viewProps: Omit<MultiPaneLayoutProps, "splitMode" | "panes" | "onPaneViewChange" | "onPaneSyncModeChange" | "onPaneSelectionChange" | "primaryView">; maximizedPane: number | null; onToggleMaximize: (index: number) => void }) {
  const { ratio, containerRef, handleMouseDown } = useDivider(0.5, 0.2, 0.8, "horizontal");

  if (maximizedPane !== null) {
    const pane = panes[maximizedPane] || { view: "sphere" };
    return (
      <div className="absolute inset-0">
        <PaneContent pane={pane} index={maximizedPane} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} isMaximized={true} onToggleMaximize={() => onToggleMaximize(maximizedPane)} {...viewProps} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ display: "flex" }}>
      <div style={{ width: `${ratio * 100}%`, height: "100%", overflow: "hidden" }}>
        <PaneContent pane={panes[0] || { view: "sphere" }} index={0} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(0)} {...viewProps} />
      </div>
      <Divider direction="horizontal" onMouseDown={handleMouseDown} />
      <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
        <PaneContent pane={panes[1] || { view: "table" }} index={1} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(1)} {...viewProps} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Horizontal 2-pane                                                  */
/* ------------------------------------------------------------------ */

function HorizontalSplit({ panes, onPaneViewChange, onPaneSyncModeChange, onPaneSelectionChange, viewProps, maximizedPane, onToggleMaximize }: { panes: PaneState[]; onPaneViewChange: (i: number, v: ViewType) => void; onPaneSyncModeChange?: (index: number, syncMode: PaneSyncMode) => void; onPaneSelectionChange?: (index: number, topicId: string | null, nodeId: string | null) => void; viewProps: Omit<MultiPaneLayoutProps, "splitMode" | "panes" | "onPaneViewChange" | "onPaneSyncModeChange" | "onPaneSelectionChange" | "primaryView">; maximizedPane: number | null; onToggleMaximize: (index: number) => void }) {
  const { ratio, containerRef, handleMouseDown } = useDivider(0.5, 0.2, 0.8, "vertical");

  if (maximizedPane !== null) {
    const pane = panes[maximizedPane] || { view: "sphere" };
    return (
      <div className="absolute inset-0">
        <PaneContent pane={pane} index={maximizedPane} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} isMaximized={true} onToggleMaximize={() => onToggleMaximize(maximizedPane)} {...viewProps} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: `${ratio * 100}%`, width: "100%", overflow: "hidden" }}>
        <PaneContent pane={panes[0] || { view: "sphere" }} index={0} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(0)} {...viewProps} />
      </div>
      <Divider direction="vertical" onMouseDown={handleMouseDown} />
      <div style={{ flex: 1, width: "100%", overflow: "hidden" }}>
        <PaneContent pane={panes[1] || { view: "table" }} index={1} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(1)} {...viewProps} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Triple pane: left + right(top/bottom)                              */
/* ------------------------------------------------------------------ */

function TripleSplit({ panes, onPaneViewChange, onPaneSyncModeChange, onPaneSelectionChange, viewProps, maximizedPane, onToggleMaximize }: { panes: PaneState[]; onPaneViewChange: (i: number, v: ViewType) => void; onPaneSyncModeChange?: (index: number, syncMode: PaneSyncMode) => void; onPaneSelectionChange?: (index: number, topicId: string | null, nodeId: string | null) => void; viewProps: Omit<MultiPaneLayoutProps, "splitMode" | "panes" | "onPaneViewChange" | "onPaneSyncModeChange" | "onPaneSelectionChange" | "primaryView">; maximizedPane: number | null; onToggleMaximize: (index: number) => void }) {
  const hDiv = useDivider(0.5, 0.2, 0.8, "horizontal");
  const vDiv = useDivider(0.5, 0.2, 0.8, "vertical");

  if (maximizedPane !== null) {
    const pane = panes[maximizedPane] || { view: "sphere" };
    return (
      <div className="absolute inset-0">
        <PaneContent pane={pane} index={maximizedPane} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} isMaximized={true} onToggleMaximize={() => onToggleMaximize(maximizedPane)} {...viewProps} />
      </div>
    );
  }

  return (
    <div ref={hDiv.containerRef} className="absolute inset-0" style={{ display: "flex" }}>
      {/* Left large pane */}
      <div style={{ width: `${hDiv.ratio * 100}%`, height: "100%", overflow: "hidden" }}>
        <PaneContent pane={panes[0] || { view: "sphere" }} index={0} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(0)} {...viewProps} />
      </div>
      <Divider direction="horizontal" onMouseDown={hDiv.handleMouseDown} />
      {/* Right column: top + bottom */}
      <div ref={vDiv.containerRef} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: `${vDiv.ratio * 100}%`, overflow: "hidden" }}>
          <PaneContent pane={panes[1] || { view: "table" }} index={1} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(1)} {...viewProps} />
        </div>
        <Divider direction="vertical" onMouseDown={vDiv.handleMouseDown} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <PaneContent pane={panes[2] || { view: "network" }} index={2} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(2)} {...viewProps} />
        </div>
      </div>
    </div>
  );
}

function QuadSplit({ panes, onPaneViewChange, onPaneSyncModeChange, onPaneSelectionChange, viewProps, maximizedPane, onToggleMaximize }: { panes: PaneState[]; onPaneViewChange: (i: number, v: ViewType) => void; onPaneSyncModeChange?: (index: number, syncMode: PaneSyncMode) => void; onPaneSelectionChange?: (index: number, topicId: string | null, nodeId: string | null) => void; viewProps: Omit<MultiPaneLayoutProps, "splitMode" | "panes" | "onPaneViewChange" | "onPaneSyncModeChange" | "onPaneSelectionChange" | "primaryView">; maximizedPane: number | null; onToggleMaximize: (index: number) => void }) {
  const hDiv = useDivider(0.5, 0.22, 0.78, "horizontal");
  const vDiv = useDivider(0.5, 0.22, 0.78, "vertical");

  if (maximizedPane !== null) {
    const pane = panes[maximizedPane] || { view: "sphere" };
    return (
      <div className="absolute inset-0">
        <PaneContent pane={pane} index={maximizedPane} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} isMaximized={true} onToggleMaximize={() => onToggleMaximize(maximizedPane)} {...viewProps} />
      </div>
    );
  }

  return (
    <div ref={hDiv.containerRef} className="absolute inset-0" style={{ display: "flex" }}>
      <div style={{ width: `${hDiv.ratio * 100}%`, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ height: `${vDiv.ratio * 100}%`, overflow: "hidden" }}>
          <PaneContent pane={panes[0] || { view: "sphere" }} index={0} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(0)} {...viewProps} />
        </div>
        <Divider direction="vertical" onMouseDown={vDiv.handleMouseDown} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <PaneContent pane={panes[2] || { view: "network" }} index={2} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(2)} {...viewProps} />
        </div>
      </div>
      <Divider direction="horizontal" onMouseDown={hDiv.handleMouseDown} />
      <div style={{ flex: 1, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ height: `${vDiv.ratio * 100}%`, overflow: "hidden" }}>
          <PaneContent pane={panes[1] || { view: "table" }} index={1} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(1)} {...viewProps} />
        </div>
        <Divider direction="vertical" onMouseDown={vDiv.handleMouseDown} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <PaneContent pane={panes[3] || { view: "diff" }} index={3} onViewChange={onPaneViewChange} onSyncModeChange={onPaneSyncModeChange} onPaneSelectionChange={onPaneSelectionChange} onToggleMaximize={() => onToggleMaximize(3)} {...viewProps} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Split mode selector (toolbar component)                            */
/* ------------------------------------------------------------------ */

export function SplitModeSelector({
  splitMode,
  onChangeSplitMode,
  lang = "ja",
}: {
  splitMode: SplitMode;
  onChangeSplitMode: (mode: SplitMode) => void;
  lang?: "ja" | "en";
}) {
  const modes: SplitMode[] = ["single", "vertical-2", "horizontal-2", "triple", "quad"];
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => onChangeSplitMode(m)}
          title={SPLIT_LABELS[m][lang]}
          style={{
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            border: splitMode === m ? "1px solid var(--tw-accent, #f59e0b)" : "1px solid var(--tw-border, #333)",
            borderRadius: 4,
            background: splitMode === m ? "var(--tw-accent, #f59e0b)20" : "transparent",
            color: splitMode === m ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
            cursor: "pointer",
          }}
        >
          {SPLIT_ICONS[m]}
        </button>
      ))}
    </div>
  );
}
