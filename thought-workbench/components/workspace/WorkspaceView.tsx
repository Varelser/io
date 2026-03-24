import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TopicItem, TopicLinkItem, WorkspaceViewport } from "../../types";
import type { WorkspaceArrangeGroupBy, WorkspaceArrangeMode } from "../../utils/workspace-layout";
import { getWorkspaceArrangeTopicIds } from "../../utils/workspace-layout";

type Viewport = WorkspaceViewport;
type RecentViewport = { id: string; label: string; viewport: Viewport };
type WorkspaceRegion = {
  id: string;
  label: string;
  color?: string;
  bounds: { x: number; y: number; w: number; h: number };
  topicId: string;
  topicTitle: string;
};

const HOME_VIEWPORT: Viewport = { x: 0, y: 0, w: 100, h: 100 };
const MIN_VIEW_SIZE = 18;
const MAX_VIEW_SIZE = 220;
const RECENT_VIEW_LIMIT = 6;
const MINIMAP_WIDTH = 140;
const MINIMAP_HEIGHT = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fitBounds(x: number, y: number, w: number, h: number, padding = 4): Viewport {
  const size = clamp(Math.max(w, h) + padding * 2, MIN_VIEW_SIZE, MAX_VIEW_SIZE);
  const cx = x + w / 2;
  const cy = y + h / 2;
  return {
    x: cx - size / 2,
    y: cy - size / 2,
    w: size,
    h: size,
  };
}

function getWorkspaceBounds(topics: TopicItem[], regions: WorkspaceRegion[]) {
  let minX = -50;
  let maxX = 50;
  let minY = -50;
  let maxY = 50;

  for (const topic of topics) {
    const radius = topic.workspace.size / 8.2;
    minX = Math.min(minX, topic.workspace.x - radius);
    maxX = Math.max(maxX, topic.workspace.x + radius);
    minY = Math.min(minY, topic.workspace.y - radius);
    maxY = Math.max(maxY, topic.workspace.y + radius);
  }

  for (const region of regions) {
    minX = Math.min(minX, region.bounds.x);
    maxX = Math.max(maxX, region.bounds.x + region.bounds.w);
    minY = Math.min(minY, region.bounds.y);
    maxY = Math.max(maxY, region.bounds.y + region.bounds.h);
  }

  const width = Math.max(24, maxX - minX);
  const height = Math.max(24, maxY - minY);
  const pad = Math.max(width, height) * 0.08;

  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minY: minY - pad,
    maxY: maxY + pad,
    width: width + pad * 2,
    height: height + pad * 2,
  };
}

function toMinimapX(x: number, bounds: ReturnType<typeof getWorkspaceBounds>) {
  return ((x - bounds.minX) / bounds.width) * MINIMAP_WIDTH;
}

function toMinimapY(y: number, bounds: ReturnType<typeof getWorkspaceBounds>) {
  return ((y - bounds.minY) / bounds.height) * MINIMAP_HEIGHT;
}

function isSimilarViewport(a: Viewport, b: Viewport): boolean {
  return (
    Math.abs(a.x - b.x) < 2
    && Math.abs(a.y - b.y) < 2
    && Math.abs(a.w - b.w) < 2
    && Math.abs(a.h - b.h) < 2
  );
}

export function WorkspaceView({
  topics,
  topicLinks,
  selectedTopicId,
  onSelectTopic,
  onTopicContextMenu,
  onArrangeTopics,
  viewport: controlledViewport,
  onViewportChange,
  onBookmarkViewport,
  lang = "ja",
}: {
  topics: TopicItem[];
  topicLinks: TopicLinkItem[];
  selectedTopicId: string | null;
  onSelectTopic: (id: string) => void;
  onTopicContextMenu?: (event: React.MouseEvent, topicId: string) => void;
  onArrangeTopics?: (topicIds: string[], mode: WorkspaceArrangeMode, groupBy?: WorkspaceArrangeGroupBy) => void;
  viewport?: WorkspaceViewport;
  onViewportChange?: (viewport: WorkspaceViewport) => void;
  onBookmarkViewport?: () => void;
  lang?: "ja" | "en";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ clientX: number; clientY: number; viewport: Viewport } | null>(null);
  const viewportRef = useRef<Viewport>(controlledViewport || HOME_VIEWPORT);
  const recentMetaRef = useRef({ counter: 0, lastAt: 0 });
  const [viewport, setViewport] = useState<Viewport>(controlledViewport || HOME_VIEWPORT);
  const [recentViews, setRecentViews] = useState<RecentViewport[]>([]);
  const [arrangeGroupBy, setArrangeGroupBy] = useState<WorkspaceArrangeGroupBy>("folder");

  const allRegions = useMemo<WorkspaceRegion[]>(() => (
    topics.flatMap((t) =>
      (t.canvasRegions || []).map((r) => ({ ...r, topicId: t.id, topicTitle: t.title }))
    )
  ), [topics]);
  const workspaceBounds = useMemo(() => getWorkspaceBounds(topics, allRegions), [topics, allRegions]);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );
  const arrangementTopicIds = useMemo(
    () => getWorkspaceArrangeTopicIds(topics, selectedTopicId),
    [topics, selectedTopicId]
  );

  useEffect(() => {
    if (!controlledViewport || isSimilarViewport(controlledViewport, viewportRef.current)) return;
    viewportRef.current = controlledViewport;
    setViewport(controlledViewport);
  }, [controlledViewport]);

  const rememberViewport = useCallback((label: string, nextViewport: Viewport, force = false) => {
    const now = Date.now();
    if (!force && now - recentMetaRef.current.lastAt < 700) return;
    recentMetaRef.current.lastAt = now;
    recentMetaRef.current.counter += 1;
    setRecentViews((prev) => {
      if (prev[0] && isSimilarViewport(prev[0].viewport, nextViewport)) return prev;
      const item: RecentViewport = {
        id: `view-${recentMetaRef.current.counter}`,
        label,
        viewport: nextViewport,
      };
      return [item, ...prev].slice(0, RECENT_VIEW_LIMIT);
    });
  }, []);

  const applyViewport = useCallback((nextViewport: Viewport, recentLabel?: string, forceRemember = false) => {
    viewportRef.current = nextViewport;
    setViewport(nextViewport);
    onViewportChange?.(nextViewport);
    if (recentLabel) rememberViewport(recentLabel, nextViewport, forceRemember);
  }, [onViewportChange, rememberViewport]);

  const resetViewport = useCallback(() => {
    applyViewport(HOME_VIEWPORT, "Home", true);
  }, [applyViewport]);

  const fitSelectedTopic = useCallback(() => {
    if (!selectedTopic) return;
    const radius = selectedTopic.workspace.size / 8.2;
    applyViewport(fitBounds(
      selectedTopic.workspace.x - radius,
      selectedTopic.workspace.y - radius,
      radius * 2,
      radius * 2,
      8
    ), selectedTopic.title, true);
  }, [selectedTopic, applyViewport]);

  const focusRegion = useCallback((region: WorkspaceRegion) => {
    applyViewport(fitBounds(region.bounds.x, region.bounds.y, region.bounds.w, region.bounds.h, 6), region.label, true);
  }, [applyViewport]);

  const centerViewportAt = useCallback((centerX: number, centerY: number, recentLabel?: string) => {
    const current = viewportRef.current;
    applyViewport({
      x: centerX - current.w / 2,
      y: centerY - current.h / 2,
      w: current.w,
      h: current.h,
    }, recentLabel);
  }, [applyViewport]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const factor = e.deltaY > 0 ? 1.12 : 0.9;
    const current = viewportRef.current;
    const nextW = clamp(current.w * factor, MIN_VIEW_SIZE, MAX_VIEW_SIZE);
    const nextH = clamp(current.h * factor, MIN_VIEW_SIZE, MAX_VIEW_SIZE);
    const anchorX = current.x + current.w * px;
    const anchorY = current.y + current.h * py;
    applyViewport({
      x: anchorX - nextW * px,
      y: anchorY - nextH * py,
      w: nextW,
      h: nextH,
    }, "Zoom");
  }, [applyViewport]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target;
    if (target instanceof Element && target.closest("[data-pan-block='true']")) return;
    dragRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      viewport: viewportRef.current,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.clientX) / rect.width) * dragRef.current.viewport.w;
    const dy = ((e.clientY - dragRef.current.clientY) / rect.height) * dragRef.current.viewport.h;
    const nextViewport = {
      x: dragRef.current.viewport.x - dx,
      y: dragRef.current.viewport.y - dy,
      w: dragRef.current.viewport.w,
      h: dragRef.current.viewport.h,
    };
    viewportRef.current = nextViewport;
    setViewport(nextViewport);
    onViewportChange?.(nextViewport);
  }, [onViewportChange]);

  const stopDragging = useCallback(() => {
    if (dragRef.current) {
      rememberViewport("Move", viewportRef.current);
    }
    dragRef.current = null;
  }, [rememberViewport]);

  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const my = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const x = workspaceBounds.minX + workspaceBounds.width * mx;
    const y = workspaceBounds.minY + workspaceBounds.height * my;
    centerViewportAt(x, y, "Map");
  }, [workspaceBounds, centerViewportAt]);

  const zoomLabel = `${(100 / viewport.w).toFixed(1)}x`;
  const centerX = (viewport.x + viewport.w / 2).toFixed(1);
  const centerY = (viewport.y + viewport.h / 2).toFixed(1);
  const arrangeGroupLabel = arrangeGroupBy === "folder"
    ? "Folder"
    : arrangeGroupBy === "para-category"
      ? "PARA"
      : arrangeGroupBy === "method"
        ? "Method"
        : "Must One";
  const minimapViewport = {
    x: toMinimapX(viewport.x, workspaceBounds),
    y: toMinimapY(viewport.y, workspaceBounds),
    w: (viewport.w / workspaceBounds.width) * MINIMAP_WIDTH,
    h: (viewport.h / workspaceBounds.height) * MINIMAP_HEIGHT,
  };
  const handleArrange = useCallback((mode: WorkspaceArrangeMode) => {
    const arrange = onArrangeTopics as ((topicIds: string[], nextMode: WorkspaceArrangeMode, groupBy?: WorkspaceArrangeGroupBy) => void) | undefined;
    arrange?.(arrangementTopicIds, mode, arrangeGroupBy);
  }, [arrangementTopicIds, arrangeGroupBy, onArrangeTopics]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-[16px] border border-white/10 bg-[#030303]"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-30" />
      <svg viewBox={`${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`} className="absolute inset-0 h-full w-full">
        {/* Named canvas regions */}
        {allRegions.map((region) => (
          <g key={region.id} data-pan-block="true">
            <rect
              x={region.bounds.x}
              y={region.bounds.y}
              width={region.bounds.w}
              height={region.bounds.h}
              fill={region.color || "rgba(255,255,255,0.03)"}
              stroke={region.color || "rgba(255,255,255,0.1)"}
              strokeWidth="0.15"
              strokeDasharray="0.5 0.3"
              rx="0.5"
              fillOpacity="0.08"
            />
            <text
              x={region.bounds.x + 0.5}
              y={region.bounds.y + 1.5}
              fontSize="1.1"
              fill={region.color || "rgba(255,255,255,0.3)"}
              fillOpacity="0.6"
            >
              {region.label}
            </text>
          </g>
        ))}

        {/* Topic links */}
        {topicLinks.map((link) => {
          const from = topics.find((t) => t.id === link.from);
          const to = topics.find((t) => t.id === link.to);
          if (!from || !to) return null;
          return (
            <g key={link.id}>
              <line x1={from.workspace.x} y1={from.workspace.y} x2={to.workspace.x} y2={to.workspace.y} stroke="rgba(255,255,255,0.15)" strokeWidth="0.24" />
              <text x={(from.workspace.x + to.workspace.x) / 2} y={(from.workspace.y + to.workspace.y) / 2 - 0.7} fontSize="1.3" textAnchor="middle" fill="rgba(255,255,255,0.36)">{link.relation}</text>
            </g>
          );
        })}

        {/* Topic spheres */}
        {topics.map((topic) => {
          const active = topic.id === selectedTopicId;
          return (
            <g key={topic.id} data-pan-block="true" style={{ cursor: "pointer" }} onClick={() => onSelectTopic(topic.id)} onContextMenu={(event) => onTopicContextMenu?.(event, topic.id)}>
              <circle cx={topic.workspace.x} cy={topic.workspace.y} r={topic.workspace.size / 8.2} fill={active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"} stroke={active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"} strokeWidth="0.32" />
              <text x={topic.workspace.x} y={topic.workspace.y - 0.6} textAnchor="middle" fontSize="1.9" fill="white">{topic.title}</text>
              <text x={topic.workspace.x} y={topic.workspace.y + 1.7} textAnchor="middle" fontSize="1.15" fill="rgba(255,255,255,0.48)">{topic.folder}</text>
            </g>
          );
        })}
      </svg>

      <div className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-white/60 backdrop-blur-sm">
        {zoomLabel} / x:{centerX} y:{centerY}
      </div>

      <div className="absolute right-2 top-2 flex gap-1">
        <button
          onClick={resetViewport}
          className="rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-white/70 backdrop-blur-sm transition-colors hover:bg-white/10"
          title="Reset workspace view"
        >
          Home
        </button>
        <button
          onClick={fitSelectedTopic}
          disabled={!selectedTopic}
          className="rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-white/70 backdrop-blur-sm transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
          title="Fit selected topic"
        >
          Fit
        </button>
        <button
          onClick={() => onBookmarkViewport?.()}
          disabled={!onBookmarkViewport}
          className="rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-white/70 backdrop-blur-sm transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
          title={lang === "ja" ? "現在位置をブックマーク" : "Bookmark current view"}
        >
          Mark
        </button>
      </div>

      <div className="absolute left-2 top-11 flex flex-wrap gap-1" data-pan-block="true">
        <select
          value={arrangeGroupBy}
          onChange={(event) => setArrangeGroupBy(event.target.value as WorkspaceArrangeGroupBy)}
          className="rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-white/70 backdrop-blur-sm outline-none"
          title={lang === "ja" ? "Lane / Cluster の整理軸" : "Grouping axis for Lane / Cluster"}
        >
          <option value="folder">Folder</option>
          <option value="para-category">PARA</option>
          <option value="method">Method</option>
          <option value="must-one">Must One</option>
        </select>
        {([
          { mode: "align-x", label: "Align X" },
          { mode: "align-y", label: "Align Y" },
          { mode: "distribute-x", label: "Dist X" },
          { mode: "distribute-y", label: "Dist Y" },
          { mode: "grid", label: "Grid" },
          { mode: "radial", label: "Radial" },
          { mode: "pack", label: "Pack" },
          { mode: "lane-x", label: "Lane X" },
          { mode: "lane-y", label: "Lane Y" },
          { mode: "cluster", label: "Cluster" },
        ] as { mode: WorkspaceArrangeMode; label: string }[]).map((action) => (
          <button
            key={action.mode}
            onClick={() => handleArrange(action.mode)}
            disabled={!onArrangeTopics || arrangementTopicIds.length < 2}
            className="rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-white/70 backdrop-blur-sm transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
            title={lang === "ja"
              ? `兄弟 topic を ${action.label}${action.mode.startsWith("lane") || action.mode === "cluster" ? ` / ${arrangeGroupLabel}` : ""} で整列`
              : `Arrange sibling topics by ${action.label}${action.mode.startsWith("lane") || action.mode === "cluster" ? ` / ${arrangeGroupLabel}` : ""}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {allRegions.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 flex gap-1 overflow-x-auto pb-1">
          {allRegions.map((region) => (
            <button
              key={region.id}
              onClick={() => focusRegion(region)}
              className="shrink-0 rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-white/65 backdrop-blur-sm transition-colors hover:bg-white/10"
              title={`${region.topicTitle} / ${region.label}`}
            >
              {region.label}
            </button>
          ))}
        </div>
      )}

      {recentViews.length > 0 && (
        <div className="absolute right-2 top-11 flex max-w-[190px] flex-wrap justify-end gap-1" data-pan-block="true">
          {recentViews.map((entry) => (
            <button
              key={entry.id}
              onClick={() => applyViewport(entry.viewport, entry.label, true)}
              className="rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[8px] text-white/60 backdrop-blur-sm transition-colors hover:bg-white/10"
              title={`${entry.label} / x:${(entry.viewport.x + entry.viewport.w / 2).toFixed(1)} y:${(entry.viewport.y + entry.viewport.h / 2).toFixed(1)}`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleMinimapClick}
        className="absolute bottom-12 right-2 overflow-hidden rounded-[10px] border border-white/10 bg-black/55 backdrop-blur-sm"
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        title="Workspace minimap"
        data-pan-block="true"
      >
        <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} className="block">
          <rect x="0" y="0" width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} fill="rgba(255,255,255,0.02)" />
          {allRegions.map((region) => (
            <rect
              key={region.id}
              x={toMinimapX(region.bounds.x, workspaceBounds)}
              y={toMinimapY(region.bounds.y, workspaceBounds)}
              width={(region.bounds.w / workspaceBounds.width) * MINIMAP_WIDTH}
              height={(region.bounds.h / workspaceBounds.height) * MINIMAP_HEIGHT}
              fill={region.color || "rgba(255,255,255,0.04)"}
              fillOpacity="0.12"
              stroke={region.color || "rgba(255,255,255,0.14)"}
              strokeWidth="0.7"
              strokeDasharray="2 2"
              rx="2"
            />
          ))}
          {topicLinks.map((link) => {
            const from = topics.find((t) => t.id === link.from);
            const to = topics.find((t) => t.id === link.to);
            if (!from || !to) return null;
            return (
              <line
                key={link.id}
                x1={toMinimapX(from.workspace.x, workspaceBounds)}
                y1={toMinimapY(from.workspace.y, workspaceBounds)}
                x2={toMinimapX(to.workspace.x, workspaceBounds)}
                y2={toMinimapY(to.workspace.y, workspaceBounds)}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="0.7"
              />
            );
          })}
          {topics.map((topic) => (
            <circle
              key={topic.id}
              cx={toMinimapX(topic.workspace.x, workspaceBounds)}
              cy={toMinimapY(topic.workspace.y, workspaceBounds)}
              r={topic.id === selectedTopicId ? 4.2 : 3.2}
              fill={topic.id === selectedTopicId ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)"}
            />
          ))}
          <rect
            x={minimapViewport.x}
            y={minimapViewport.y}
            width={minimapViewport.w}
            height={minimapViewport.h}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1"
            rx="2"
          />
        </svg>
        <div className="pointer-events-none absolute left-2 top-1 text-[8px] uppercase tracking-[0.18em] text-white/40">
          map
        </div>
      </button>
    </div>
  );
}
