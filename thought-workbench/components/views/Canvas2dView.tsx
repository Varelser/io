import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { TopicItem } from "../../types";
import { buildTopicLayerStyles } from "../../utils/strata";
import { Button } from "../ui/Button";

type DragState = { nodeId: string; startX: number; startY: number; origX: number; origY: number } | null;

const TYPE_COLORS: Record<string, string> = {
  concept:    "#7ba7cc",
  fact:       "#82b57a",
  question:   "#c97070",
  hypothesis: "#c49960",
  argument:   "#8878b8",
  evidence:   "#6a9aa8",
};

export function Canvas2dView({
  topic,
  selectedNodeId,
  multiNodeIdSet,
  compareNodeState,
  onSelectNode,
  onNodeContextMenu,
  lang = "ja",
  nodeColorOverrides,
}: {
  topic: TopicItem | null;
  selectedNodeId: string | null;
  multiNodeIdSet?: Set<string>;
  compareNodeState?: Record<string, "shared" | "current-only" | "set-only">;
  onSelectNode: (id: string) => void;
  onNodeContextMenu?: (event: React.MouseEvent, topicId: string, nodeId: string) => void;
  lang?: "ja" | "en";
  nodeColorOverrides?: Map<string, string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<DragState>(null);
  const panDragRef = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number } | null>(null);
  const layerStyles = topic ? buildTopicLayerStyles(topic) : {};
  const cachedThemeColors = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        canvasBackground: "#020202",
        panel: "rgba(5,5,5,0.8)",
        border: "rgba(255,255,255,0.1)",
        canvasGrid: "rgba(255,255,255,0.04)",
        edgeStroke: "rgba(255,255,255,0.12)",
        edgeMuted: "rgba(255,255,255,0.15)",
        text: "rgba(255,255,255,0.9)",
        textDim: "rgba(255,255,255,0.5)",
        fontScale: 1,
        canvasTextScale: 1,
        canvasDot: "rgba(161,161,170,0.18)",
      };
    }
    const computed = getComputedStyle(document.documentElement);
    return {
      canvasBackground: computed.getPropertyValue("--tw-bg").trim() || "#020202",
      panel: computed.getPropertyValue("--tw-bg-panel").trim() || "rgba(5,5,5,0.8)",
      border: computed.getPropertyValue("--tw-border").trim() || "rgba(255,255,255,0.1)",
      canvasGrid: computed.getPropertyValue("--tw-canvas-grid").trim() || "rgba(255,255,255,0.04)",
      edgeStroke: computed.getPropertyValue("--tw-edge-stroke").trim() || "rgba(255,255,255,0.12)",
      edgeMuted: computed.getPropertyValue("--tw-edge-muted").trim() || "rgba(255,255,255,0.15)",
      text: computed.getPropertyValue("--tw-canvas-text").trim() || computed.getPropertyValue("--tw-text").trim() || "rgba(255,255,255,0.9)",
      textDim: computed.getPropertyValue("--tw-canvas-text-dim").trim() || computed.getPropertyValue("--tw-text-dim").trim() || "rgba(255,255,255,0.5)",
      fontScale: Number(computed.getPropertyValue("--tw-font-scale").trim()) || 1,
      canvasTextScale: Number(computed.getPropertyValue("--tw-canvas-text-scale").trim()) || 1,
      canvasDot: computed.getPropertyValue("--tw-canvas-dot").trim() || "rgba(161,161,170,0.18)",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);
  const visibleNodeIds = new Set(
    topic
      ? topic.nodes
          .filter((node) => layerStyles[node.layer || "(none)"]?.visible !== false)
          .map((node) => node.id)
      : []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setDims({ w: r.width, h: r.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const project = useCallback(
    (pos: [number, number, number]) => {
      const cx = dims.w / 2 + pan.x;
      const cy = dims.h / 2 + pan.y;
      return {
        x: cx + pos[0] * 80 * zoom,
        y: cy + pos[1] * 80 * zoom,
      };
    },
    [dims, pan, zoom]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !topic) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const colors = cachedThemeColors;
    const uiScale = Math.max(0.7, colors.fontScale);
    const canvasTextScale = Math.max(0.7, colors.canvasTextScale);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, dims.w, dims.h);

    const cx = dims.w / 2 + pan.x;
    const cy = dims.h / 2 + pan.y;
    const dotSpacing = zoom < 0.4 ? 80 * zoom : 40 * zoom;
    const dotRad = Math.max(0.5, 0.9 * zoom);
    ctx.fillStyle = colors.canvasDot;
    const startX = ((cx % dotSpacing) + dotSpacing) % dotSpacing;
    const startY = ((cy % dotSpacing) + dotSpacing) % dotSpacing;
    for (let x = startX - dotSpacing; x < dims.w + dotSpacing; x += dotSpacing) {
      for (let y = startY - dotSpacing; y < dims.h + dotSpacing; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Edges
    topic.edges.forEach((edge) => {
      if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) return;
      const fromNode = topic.nodes.find((n) => n.id === edge.from);
      const toNode = topic.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return;
      const a = project(fromNode.position);
      const b = project(toNode.position);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = colors.edgeStroke;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (edge.relation) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.font = `${Math.max(7, 7 * uiScale * canvasTextScale)}px sans-serif`;
        ctx.fillStyle = colors.edgeMuted;
        ctx.textAlign = "center";
        ctx.fillText(edge.relation, mx, my - 3);
      }
    });

    // Nodes
    topic.nodes.forEach((node) => {
      if (!visibleNodeIds.has(node.id)) return;
      const p = project(node.position);
      const r = Math.max(4, node.size * 3 * zoom);
      const isSelected = node.id === selectedNodeId;
      const isMultiSelected = multiNodeIdSet?.has(node.id) || false;
      const compareState = compareNodeState?.[node.id];
      const color = node.color || nodeColorOverrides?.get(node.id) || layerStyles[node.layer || "(none)"]?.color || TYPE_COLORS[node.type] || "#aaa";

      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12 * zoom;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? color + "aa"
        : isMultiSelected
          ? color + "77"
          : compareState === "shared"
            ? "rgba(52, 211, 153, 0.22)"
            : compareState === "current-only"
              ? "rgba(245, 158, 11, 0.20)"
              : compareState === "set-only"
                ? "rgba(56, 189, 248, 0.20)"
                : color + "44";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      if (isSelected || isMultiSelected || compareState) {
        ctx.strokeStyle = isSelected
          ? color
          : compareState === "shared"
            ? "#34d399"
            : compareState === "current-only"
              ? "#f59e0b"
              : compareState === "set-only"
                ? "#38bdf8"
                : "rgba(255,255,255,0.6)";
        ctx.lineWidth = isSelected ? 1.5 : 1.2;
        if (isMultiSelected && !isSelected) {
          ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.font = `${Math.max(8, 10 * zoom * uiScale * canvasTextScale)}px sans-serif`;
      ctx.fillStyle = isSelected ? colors.text : compareState ? colors.text : colors.textDim;
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 3;
      ctx.fillText(node.label, p.x, p.y + r + 10 * zoom);
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    });
  }, [topic, dims, pan, zoom, selectedNodeId, multiNodeIdSet, compareNodeState, project, cachedThemeColors]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!topic) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const node of topic.nodes) {
        if (!visibleNodeIds.has(node.id)) continue;
        const p = project(node.position);
        const r = Math.max(4, node.size * 3 * zoom) + 4;
        if ((mx - p.x) ** 2 + (my - p.y) ** 2 < r * r) {
          onSelectNode(node.id);
          dragRef.current = { nodeId: node.id, startX: mx, startY: my, origX: p.x, origY: p.y };
          return;
        }
      }

      panDragRef.current = { startX: e.clientX, startY: e.clientY, origPanX: pan.x, origPanY: pan.y };
    },
    [topic, project, zoom, pan, onSelectNode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (panDragRef.current) {
        const dx = e.clientX - panDragRef.current.startX;
        const dy = e.clientY - panDragRef.current.startY;
        setPan({ x: panDragRef.current.origPanX + dx, y: panDragRef.current.origPanY + dy });
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    panDragRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(4, z - e.deltaY * 0.001)));
  }, []);
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!topic) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const node of topic.nodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      const p = project(node.position);
      const r = Math.max(4, node.size * 3 * zoom) + 4;
      if ((mx - p.x) ** 2 + (my - p.y) ** 2 < r * r) {
        e.preventDefault();
        onNodeContextMenu?.(e, topic.id, node.id);
        return;
      }
    }
  }, [topic, visibleNodeIds, project, zoom, onNodeContextMenu]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(4, z + 0.15));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.2, z - 0.15));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const overlayColors = cachedThemeColors;

  if (!topic) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: overlayColors.canvasBackground }}>
        <div className="text-[10px]" style={{ color: overlayColors.textDim }}>
          {lang === "ja" ? "トピックを選ぶと 2D キャンバスを表示できます" : "Select a topic to view its 2D canvas"}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ background: overlayColors.canvasBackground }}>
      <div
        className="absolute left-4 top-3 z-10 flex items-center gap-2 rounded-md border px-2 py-1.5 backdrop-blur-sm"
        style={{ borderColor: overlayColors.border, background: overlayColors.panel }}
      >
        <div className="text-[10px] uppercase tracking-wider" style={{ color: overlayColors.textDim }}>
          Canvas 2D
        </div>
        <div className="text-[8px]" style={{ color: overlayColors.textDim }}>
          {topic.title} - {topic.nodes.length} {lang === "ja" ? "ノード" : "nodes"}
        </div>
        <div className="text-[8px]" style={{ color: overlayColors.textDim }}>
          {lang === "ja" ? "zoom" : "zoom"}: {Math.round(zoom * 100)}%
        </div>
        <div className="ml-1 flex items-center gap-1">
          <Button onClick={handleZoomOut}>-</Button>
          <Button onClick={handleResetView}>{lang === "ja" ? "Reset" : "Reset"}</Button>
          <Button onClick={handleZoomIn}>+</Button>
        </div>
      </div>
      <div
        className="absolute right-4 top-3 z-10 rounded-md border px-2 py-1.5 text-[8px] backdrop-blur-sm"
        style={{ borderColor: overlayColors.border, background: overlayColors.panel, color: overlayColors.textDim }}
      >
        <div>{lang === "ja" ? "ホイールでズーム / ドラッグでパン" : "Wheel to zoom / drag to pan"}</div>
        <div>{lang === "ja" ? "分割ペインでも個別に操作できます" : "Each split pane keeps its own view"}</div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: dims.w, height: dims.h }}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
