import React from "react";
import type { TopicItem, TopicLinkItem, JournalEntry, WorkspaceViewport, EdgeItem } from "../types";
import type { ViewType } from "../constants/views";
import { SphereView } from "./sphere/SphereView";
import { WorkspaceView } from "./workspace/WorkspaceView";
import { FolderView } from "./views/FolderView";
import { JournalView } from "./views/JournalView";
import { CalendarView } from "./views/CalendarView";
import { TaskView } from "./views/TaskView";
import { TableView } from "./views/TableView";
import { NetworkView } from "./views/NetworkView";
import { MindmapView } from "./views/MindmapView";
import { Canvas2dView } from "./views/Canvas2dView";
import { DepthView } from "./views/DepthView";
import { StatsView } from "./views/StatsView";
import { ReviewView } from "./views/ReviewView";
import { TimelineView } from "./views/TimelineView";
import { DiffView } from "./views/DiffView";
import { IntakeView } from "./views/IntakeView";
import { MaintenanceView } from "./views/MaintenanceView";
import type { WorkspaceArrangeGroupBy, WorkspaceArrangeMode } from "../utils/workspace-layout";

function ViewPlaceholder({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020202]">
      <div className="text-center">
        <div className="text-[24px] text-white/20">{name}</div>
        <div className="mt-2 text-[10px] text-white/30">Coming soon</div>
      </div>
    </div>
  );
}

type JournalProps = {
  journals: JournalEntry[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  todayEntry: JournalEntry | null;
  addOrUpdateEntry: (patch: Partial<JournalEntry>) => void;
  deleteEntry: (date: string) => void;
};

const FULLSCREEN_VIEWS: ViewType[] = ["sphere", "workspace", "network", "canvas2d"];

export function MainViewport({ view, sphereTopic, selectedNodeId, onSelectNode, onMoveSelectedNode, onNodeContextMenu, onTopicContextMenu, topics, topicLinks, selectedTopicId, onSelectTopic, onUpdateNode, onUpdateEdge, journal, leftOpen, rightOpen, leftWidth, rightWidth, workspaceViewport, onWorkspaceViewportChange, onBookmarkWorkspaceViewport, onArrangeWorkspaceTopics, multiNodeIdSet, compareNodeState, lang, nodeColorOverrides }: { view: ViewType; sphereTopic: TopicItem | null; selectedNodeId: string | null; onSelectNode: (nodeId: string | null) => void; onMoveSelectedNode?: (position: [number, number, number]) => void; onNodeContextMenu?: (event: React.MouseEvent, topicId: string, nodeId: string) => void; onTopicContextMenu?: (event: React.MouseEvent, topicId: string) => void; topics: TopicItem[]; topicLinks: TopicLinkItem[]; selectedTopicId: string | null; onSelectTopic: (topicId: string, preferredNodeId: string | null) => void; onUpdateNode?: (topicId: string, nodeId: string, patch: Record<string, unknown>) => void; onUpdateEdge?: (topicId: string, edgeId: string, patch: Partial<EdgeItem>) => void; journal: JournalProps; leftOpen?: boolean; rightOpen?: boolean; leftWidth?: number; rightWidth?: number; workspaceViewport?: WorkspaceViewport; onWorkspaceViewportChange?: (viewport: WorkspaceViewport) => void; onBookmarkWorkspaceViewport?: () => void; onArrangeWorkspaceTopics?: (topicIds: string[], mode: WorkspaceArrangeMode, groupBy?: WorkspaceArrangeGroupBy) => void; multiNodeIdSet?: Set<string>; compareNodeState?: Record<string, "shared" | "current-only" | "set-only">; lang?: "ja" | "en"; nodeColorOverrides?: Map<string, string> }) {
  const isFullscreen = FULLSCREEN_VIEWS.includes(view);
  const lw = leftWidth ?? 168;
  const rw = rightWidth ?? 286;
  const ml = !isFullscreen && leftOpen ? `${lw + 4}px` : "0";
  const mr = !isFullscreen && rightOpen ? `${rw - 26}px` : "0";
  return (
    <main className="absolute inset-0 transition-all duration-200" style={{ marginLeft: ml, marginRight: mr }}>
      {view === "sphere" && sphereTopic ? (
        <SphereView key={sphereTopic.id} topic={sphereTopic} selectedNodeId={selectedNodeId} multiNodeIdSet={multiNodeIdSet} compareNodeState={compareNodeState} onSelectNode={onSelectNode as (id: string) => void} onMoveSelectedNode={onMoveSelectedNode} onNodeContextMenu={onNodeContextMenu} canvasRegions={sphereTopic.canvasRegions} nodeColorOverrides={nodeColorOverrides} />
      ) : view === "workspace" ? (
        <div className="absolute inset-0 rounded-[16px] border border-white/10 bg-[#050505] p-1">
          <WorkspaceView topics={topics} topicLinks={topicLinks} selectedTopicId={selectedTopicId} onSelectTopic={(id) => {
            const topic = topics.find((t) => t.id === id);
            onSelectTopic(id, topic?.nodes[0]?.id || null);
          }} onTopicContextMenu={onTopicContextMenu} onArrangeTopics={onArrangeWorkspaceTopics} viewport={workspaceViewport} onViewportChange={onWorkspaceViewportChange} onBookmarkViewport={onBookmarkWorkspaceViewport} lang={lang} />
        </div>
      ) : view === "network" ? (
        <NetworkView topics={topics} topicLinks={topicLinks} selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} />
      ) : view === "mindmap" ? (
        <MindmapView topic={sphereTopic} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode as (id: string) => void} />
      ) : view === "canvas2d" ? (
        <Canvas2dView topic={sphereTopic} selectedNodeId={selectedNodeId} multiNodeIdSet={multiNodeIdSet} compareNodeState={compareNodeState} onSelectNode={onSelectNode as (id: string) => void} onNodeContextMenu={onNodeContextMenu} lang={lang} nodeColorOverrides={nodeColorOverrides} />
      ) : view === "folder" ? (
        <FolderView topics={topics} selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} />
      ) : view === "depth" ? (
        <DepthView topic={sphereTopic} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode as (id: string) => void} />
      ) : view === "journal" ? (
        <JournalView journals={journal.journals} selectedDate={journal.selectedDate} onChangeDate={journal.setSelectedDate} todayEntry={journal.todayEntry} onUpdateEntry={journal.addOrUpdateEntry} onDeleteEntry={journal.deleteEntry} topics={topics} onSelectTopic={onSelectTopic} />
      ) : view === "calendar" ? (
        <CalendarView journals={journal.journals} topics={topics} selectedDate={journal.selectedDate} onChangeDate={journal.setSelectedDate} onSelectTopic={onSelectTopic} lang={lang} />
      ) : view === "intake" ? (
        <IntakeView topics={topics} onSelectNode={(tid, nid) => onSelectTopic(tid, nid)} onUpdateNode={onUpdateNode ?? (() => {})} lang={lang} />
      ) : view === "stats" ? (
        <StatsView topics={topics} topicLinks={topicLinks} journals={journal.journals} lang={lang} />
      ) : view === "task" ? (
        <TaskView topics={topics} onSelectTopic={onSelectTopic} lang={lang} />
      ) : view === "table" ? (
        <TableView topics={topics} selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} lang={lang} />
      ) : view === "review" ? (
        <ReviewView topics={topics} lang={lang} onSelectNode={(tid, nid) => onSelectTopic(tid, nid)} />
      ) : view === "timeline" ? (
        <TimelineView topics={topics} lang={lang} onSelectNode={(tid, nid) => onSelectTopic(tid, nid)} />
      ) : view === "diff" ? (
        <DiffView topic={sphereTopic} lang={lang} onSelectNode={(nid) => onSelectNode(nid)} />
      ) : view === "maintenance" ? (
        <MaintenanceView topics={topics} topicLinks={topicLinks} onSelectNode={(tid, nid) => onSelectTopic(tid, nid)} onUpdateNode={onUpdateNode} onUpdateEdge={onUpdateEdge} lang={lang} />
      ) : (
        <ViewPlaceholder name={view} />
      )}
    </main>
  );
}
