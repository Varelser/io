import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { TopicItem } from "../../types";
import { clamp, round } from "../../utils/math";
import { createDefaultCenterNode } from "../../constants/defaults";
import { normalizeTopicStyle } from "../../normalize/topic";
import { rotatePoint } from "../../projection/rotate";
import { projectPoint } from "../../projection/project";
import { computeGridLines } from "./grid-lines";
import { Button } from "../ui/Button";
import { buildTopicLayerStyles } from "../../utils/strata";
import { useDraggablePosition } from "../../hooks/useDraggablePosition";

function unrotatePoint(point: [number, number, number], yawDeg: number, pitchDeg: number): [number, number, number] {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cosP = Math.cos(-pitch);
  const sinP = Math.sin(-pitch);
  const y1 = point[1] * cosP - point[2] * sinP;
  const z1 = point[1] * sinP + point[2] * cosP;
  const cosY = Math.cos(-yaw);
  const sinY = Math.sin(-yaw);
  const x2 = point[0] * cosY - z1 * sinY;
  const z2 = point[0] * sinY + z1 * cosY;
  return [x2, y1, z2];
}

type ModifierDrag = {
  mode: "alt" | "shift";
  nodeId: string;
  /** Original projected position of the source node (SVG coords) */
  originX: number;
  originY: number;
  /** Current cursor position in SVG coords */
  cursorX: number;
  cursorY: number;
  /** Node ID the cursor is currently hovering over (shift-drag only) */
  hoverNodeId: string | null;
};

export function SphereView({ topic, selectedNodeId, multiNodeIdSet, compareNodeState, onSelectNode, onMoveSelectedNode, onDuplicateAtPosition, onCreateEdgeTo, onNodeContextMenu, canvasRegions, nodeColorOverrides }: { topic: TopicItem; selectedNodeId: string | null; multiNodeIdSet?: Set<string>; compareNodeState?: Record<string, "shared" | "current-only" | "set-only">; onSelectNode: (id: string) => void; onMoveSelectedNode?: (position: [number, number, number]) => void; onDuplicateAtPosition?: (sourceNodeId: string, position: [number, number, number]) => void; onCreateEdgeTo?: (fromNodeId: string, toNodeId: string) => void; onNodeContextMenu?: (event: React.MouseEvent, topicId: string, nodeId: string) => void; canvasRegions?: { id: string; label: string; color?: string }[]; nodeColorOverrides?: Map<string, string> }) {
  const { position: helpPosition, startDrag: startHelpDrag, resetPosition: resetHelpPosition } = useDraggablePosition("tw-overlay-sphere-help", { x: 0, y: 0 });
  const [yaw, setYaw] = useState(28);
  const [pitch, setPitch] = useState(-14);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number; moved: boolean } | null>(null);
  const modDragRef = useRef<ModifierDrag | null>(null);
  const [modDrag, setModDrag] = useState<ModifierDrag | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewSize, setViewSize] = useState({ w: 900, h: 900 });

  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (selectedNodeId === null) {
      setPulsePhase(0);
      return;
    }
    let rafId: number;
    const tick = () => {
      setPulsePhase((p) => (p + 0.02) % 1);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [selectedNodeId]);

  const safeStyle = normalizeTopicStyle(topic?.style);
  const safeWorkspaceSize = typeof topic?.workspace?.size === "number" ? clamp(topic.workspace.size, 72, 180) : 112;
  const centerX = viewSize.w / 2 + (safeStyle.centerOffsetX || 0);
  const centerY = viewSize.h / 2 - 60 + (safeStyle.centerOffsetY || 0);
  const radiusPx = clamp(Math.max(220, safeWorkspaceSize * 2.8) * zoom, 160, Math.min(viewSize.w, viewSize.h) * 0.42);
  const safeNodes = Array.isArray(topic?.nodes) && topic.nodes.length ? topic.nodes : [createDefaultCenterNode("fallback-center")];
  const safeEdges = Array.isArray(topic?.edges) ? topic.edges : [];
  const layerStyles = buildTopicLayerStyles(topic);
  const visibleNodeIds = new Set(safeNodes.filter((node) => layerStyles[node.layer || "(none)"]?.visible !== false).map((node) => node.id));
  const visibleNodes = safeNodes.filter((node) => visibleNodeIds.has(node.id));
  const visibleEdges = safeEdges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setViewSize({ w: Math.round(width), h: Math.round(height) });
      }
    });
    observer.observe(container);
    setViewSize({ w: container.clientWidth, h: container.clientHeight });
    return () => observer.disconnect();
  }, []);

  /** Convert client (mouse) coords to SVG viewBox coords */
  const clientToSvg = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  /** Convert SVG viewBox coords to 3D world position */
  const svgTo3D = useCallback((svgX: number, svgY: number): [number, number, number] => {
    const sx = (svgX - centerX) / (radiusPx * 0.24);
    const sy = -(svgY - centerY) / (radiusPx * 0.24);
    const r2 = sx * sx + sy * sy;
    const maxR = 2.3;
    let x3d: number, y3d: number, z3d: number;
    if (r2 <= maxR * maxR) {
      x3d = sx; y3d = sy; z3d = Math.sqrt(Math.max(0, maxR * maxR - r2));
    } else {
      const scale = maxR / Math.sqrt(r2);
      x3d = sx * scale; y3d = sy * scale; z3d = 0;
    }
    return unrotatePoint([x3d, y3d, z3d], yaw, pitch);
  }, [centerX, centerY, radiusPx, yaw, pitch]);

  const projectedNodes = useMemo(() => {
    return visibleNodes.map((node) => {
      const rotated = rotatePoint(node.position, yaw, pitch);
      const projected = projectPoint(rotated, radiusPx, centerX, centerY, safeStyle.perspective);
      return { ...node, projected };
    }).sort((a, b) => a.projected.depth - b.projected.depth);
  }, [visibleNodes, yaw, pitch, radiusPx, centerX, centerY, safeStyle.perspective]);

  /** Find node whose projected position is closest to the given SVG coords, within a hit radius */
  const findNodeAtSvg = useCallback((svgX: number, svgY: number, excludeId?: string): string | null => {
    const hitRadius = 18;
    let closest: string | null = null;
    let closestDist = hitRadius;
    for (const node of projectedNodes) {
      if (node.id === excludeId) continue;
      const dx = node.projected.x - svgX;
      const dy = node.projected.y - svgY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = node.id;
      }
    }
    return closest;
  }, [projectedNodes]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      // Handle modifier drag (alt / shift)
      if (modDragRef.current) {
        const svgPt = clientToSvg(e.clientX, e.clientY);
        if (svgPt) {
          const updated: ModifierDrag = { ...modDragRef.current, cursorX: svgPt.x, cursorY: svgPt.y };
          if (updated.mode === "shift") {
            updated.hoverNodeId = findNodeAtSvg(svgPt.x, svgPt.y, updated.nodeId);
          }
          modDragRef.current = updated;
          setModDrag(updated);
        }
        return;
      }
      if (!dragRef.current) return;
      const d = dragRef.current;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
      setYaw(d.yaw + dx * 0.45);
      setPitch(clamp(d.pitch - dy * 0.35, -82, 82));
    };
    const up = (e: MouseEvent) => {
      // Handle modifier drag end
      const md = modDragRef.current;
      if (md) {
        if (md.mode === "alt" && onDuplicateAtPosition) {
          const svgPt = clientToSvg(e.clientX, e.clientY);
          if (svgPt) {
            const pos = svgTo3D(svgPt.x, svgPt.y);
            onDuplicateAtPosition(md.nodeId, [round(pos[0]), round(pos[1]), round(pos[2])]);
          }
        } else if (md.mode === "shift" && onCreateEdgeTo && md.hoverNodeId) {
          onCreateEdgeTo(md.nodeId, md.hoverNodeId);
        }
        modDragRef.current = null;
        setModDrag(null);
        document.body.style.userSelect = "";
        return;
      }
      dragRef.current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [clientToSvg, svgTo3D, findNodeAtSvg, onDuplicateAtPosition, onCreateEdgeTo]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((v) => clamp(v - e.deltaY * 0.001, 0.55, 1.9));
  }, []);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current?.moved) return;
    if (!selectedNodeId || !onMoveSelectedNode) return;
    const svgPt = clientToSvg(e.clientX, e.clientY);
    if (!svgPt) return;
    const worldPos = svgTo3D(svgPt.x, svgPt.y);
    onMoveSelectedNode([round(worldPos[0]), round(worldPos[1]), round(worldPos[2])]);
  }, [selectedNodeId, onMoveSelectedNode, clientToSvg, svgTo3D]);

  /** Start a modifier drag on a node (Alt or Shift held) */
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string, projX: number, projY: number) => {
    if (!e.altKey && !e.shiftKey) return;
    e.stopPropagation();
    e.preventDefault();
    const svgPt = clientToSvg(e.clientX, e.clientY);
    if (!svgPt) return;
    const mode = e.altKey ? "alt" as const : "shift" as const;
    const initial: ModifierDrag = {
      mode,
      nodeId,
      originX: projX,
      originY: projY,
      cursorX: svgPt.x,
      cursorY: svgPt.y,
      hoverNodeId: null,
    };
    modDragRef.current = initial;
    setModDrag(initial);
    document.body.style.userSelect = "none";
  }, [clientToSvg]);

  const gridLines = useMemo(() => {
    return computeGridLines(yaw, pitch, radiusPx, centerX, centerY, safeStyle.perspective);
  }, [yaw, pitch, radiusPx, centerX, centerY, safeStyle.perspective]);

  const byId = Object.fromEntries(projectedNodes.map((node) => [node.id, node])) as Record<string, any>;

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#020202]" onWheel={handleWheel}>
      <div
        className="absolute right-16 top-3 z-20 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[8px] text-white/40 backdrop-blur-sm"
        style={{ transform: `translate(${helpPosition.x}px, ${helpPosition.y}px)` }}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <button
            onMouseDown={startHelpDrag}
            onDoubleClick={resetHelpPosition}
            className="rounded border border-white/10 px-1 py-0 text-[7px] text-white/46"
            style={{ cursor: "grab" }}
            title="Drag to move / double click to reset"
          >
            ⋮⋮
          </button>
          <div className="text-[7px] uppercase tracking-wider text-white/28">overlay</div>
        </div>
        <div>drag: rotate / click: move node</div>
        <div>Alt+drag node: duplicate / Shift+drag: link</div>
        <div className="mt-1 flex gap-1">
          <Button onClick={() => setZoom((v) => clamp(v - 0.08, 0.55, 1.9))}>−</Button>
          <Button onClick={() => setZoom((v) => clamp(v + 0.08, 0.55, 1.9))}>＋</Button>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${viewSize.w} ${viewSize.h}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" onClick={handleSvgClick} onMouseDown={(e) => { if ((e.target as Element).closest("g[data-node]")) return; dragRef.current = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false }; document.body.style.userSelect = "none"; }}>
        <defs>
          <radialGradient id="sphereGlow" cx="50%" cy="45%" r="62%">
            <stop offset="0%" stopColor="var(--tw-sphere-glow-strong, rgba(255,255,255,0.06))" />
            <stop offset="65%" stopColor="var(--tw-sphere-glow-soft, rgba(255,255,255,0.015))" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx={centerX} cy={centerY} r={radiusPx} fill="url(#sphereGlow)" />
        <circle cx={centerX} cy={centerY} r={radiusPx} fill="var(--tw-sphere-fill, rgba(255,255,255,0.015))" stroke={`color-mix(in srgb, var(--tw-sphere, #fff) ${Math.round(safeStyle.sphereOpacity * 100)}%, transparent)`} strokeWidth="1.1" />
        {gridLines.map((line) => <polyline key={line.key} points={line.points} fill="none" stroke={`color-mix(in srgb, var(--tw-grid, #fff) ${Math.round(safeStyle.gridOpacity * 100)}%, transparent)`} strokeWidth="0.7" />)}
        <line x1={centerX - radiusPx} y1={centerY} x2={centerX + radiusPx} y2={centerY} stroke="var(--tw-sphere-axis, rgba(255,255,255,0.1))" />
        <line x1={centerX} y1={centerY - radiusPx} x2={centerX} y2={centerY + radiusPx} stroke="var(--tw-sphere-axis, rgba(255,255,255,0.1))" />
        {visibleEdges.map((edge) => {
          const from = byId[edge.from]?.projected;
          const to = byId[edge.to]?.projected;
          if (!from || !to || edge.visible === false) return null;
          const isSelectedEdge = edge.from === selectedNodeId || edge.to === selectedNodeId;
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isSelectedEdge ? "var(--tw-sphere-edge-selected)" : `color-mix(in srgb, var(--tw-edge, #fff) ${Math.round(safeStyle.edgeOpacity * 100)}%, transparent)`}
              strokeWidth={isSelectedEdge ? Math.max(1.2, (edge.weight || 1)) + 0.4 : Math.max(0.8, edge.weight || 1)}
            />
          );
        })}
        {projectedNodes.map((node) => {
          const selected = node.id === selectedNodeId;
          const multiSelected = multiNodeIdSet?.has(node.id) || false;
          const compareState = compareNodeState?.[node.id];
          const dotRadius = Math.max(0.8, 7.2 * Math.pow(node.size || 0.6, 1.5) * safeStyle.nodeScale);
          const frameScale = (node.frameScale ?? 1) * safeStyle.labelScale;
          const labelWidth = 88 * frameScale;
          const labelHeight = 26 * frameScale;
          const labelTextY1 = 10 * frameScale;
          const labelTextY2 = 19 * frameScale;
          const labelFont1 = 5.8 * frameScale;
          const labelFont2 = 7.6 * frameScale;
          return (
            <g key={node.id} data-node={node.id} transform={`translate(${node.projected.x}, ${node.projected.y}) scale(${node.projected.scale})`} opacity={modDrag?.mode === "shift" && modDrag.hoverNodeId === node.id ? 1 : node.projected.opacity} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onSelectNode(node.id); }} onContextMenu={(event) => onNodeContextMenu?.(event, topic.id, node.id)} onMouseDown={(e) => handleNodeMouseDown(e, node.id, node.projected.x, node.projected.y)}>
              {node.id === topic.mustOneNodeId ? <circle r={dotRadius * 2.8} fill="none" stroke="var(--tw-sphere-node-ring, rgba(255,255,255,0.35))" strokeWidth="1" /> : null}
              {multiSelected ? <circle r={dotRadius * 2.45} fill="none" stroke={compareState === "shared" ? "#34d399" : compareState === "current-only" ? "#f59e0b" : compareState === "set-only" ? "#38bdf8" : "rgba(255,255,255,0.6)"} strokeWidth="1" strokeDasharray={compareState === "set-only" ? "2 1.2" : undefined} /> : null}
              {selected ? (
                <circle
                  r={dotRadius * 2.8 + pulsePhase * 4}
                  fill="none"
                  stroke="var(--tw-sphere-pulse-color)"
                  strokeWidth={0.8}
                  opacity={0.6 - pulsePhase * 0.5}
                />
              ) : null}
              {selected ? <circle r={dotRadius * 2.05} fill="none" stroke="var(--tw-text, rgba(255,255,255,0.9))" strokeWidth="1" /> : null}
              <circle r={dotRadius} fill={node.color || nodeColorOverrides?.get(node.id) || layerStyles[node.layer || "(none)"]?.color || "white"} filter={(selected || multiSelected) ? "url(#nodeGlow)" : undefined} />
              {safeStyle.showLabels ? (
                <g transform={`translate(${8 * frameScale},${-11 * frameScale})`}>
                  <rect x="0" y="0" rx={13 * frameScale} ry={13 * frameScale} width={labelWidth} height={labelHeight} fill={selected ? "var(--tw-text, rgba(255,255,255,0.96))" : compareState === "shared" ? "rgba(52,211,153,0.15)" : compareState === "current-only" ? "rgba(245,158,11,0.14)" : compareState === "set-only" ? "rgba(56,189,248,0.14)" : "rgba(0,0,0,0.82)"} stroke={compareState === "shared" ? "#34d399" : compareState === "current-only" ? "#f59e0b" : compareState === "set-only" ? "#38bdf8" : node.color || nodeColorOverrides?.get(node.id) || layerStyles[node.layer || "(none)"]?.color || "var(--tw-sphere-label-stroke, rgba(255,255,255,0.14))"} />
                  <text x={6 * frameScale} y={labelTextY1} fontSize={labelFont1} fill={selected ? "var(--tw-bg, rgba(0,0,0,0.45))" : "rgba(255,255,255,0.46)"}>{node.tense}</text>
                  <text x={6 * frameScale} y={labelTextY2} fontSize={labelFont2} fill={selected ? "var(--tw-bg, #000)" : "var(--tw-text, #fff)"}>{node.label}</text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {canvasRegions && canvasRegions.length > 0 && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-0.5 pointer-events-none">
          {canvasRegions.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[7px] backdrop-blur-sm"
              style={{ borderColor: r.color || "#888", color: r.color || "#fff", background: "rgba(0,0,0,0.55)" }}
            >
              <span className="h-1.5 w-1.5 rounded-sm shrink-0" style={{ background: r.color || "#888" }} />
              {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
