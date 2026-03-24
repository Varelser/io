import React, { useMemo } from "react";
import type { TopicItem, NodeItem } from "../types";
import { useDraggablePosition } from "../hooks/useDraggablePosition";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface MinimapProps {
  topic: TopicItem | null;
  selectedNodeId: string | null;
  onSelectNode?: (nodeId: string) => void;
  /** Current camera/view center in normalised coords (-1..1 range) */
  viewCenter?: [number, number];
  /** Current viewport fraction (0..1, 1 = full view) */
  viewportFraction?: number;
  width?: number;
  height?: number;
}

/* ------------------------------------------------------------------ */
/*  Node type → color mapping                                         */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<string, string> = {
  concept: "#60a5fa",
  question: "#fbbf24",
  evidence: "#4ade80",
  action: "#f97316",
  hypothesis: "#c084fc",
  claim: "#f472b6",
  analogy: "#2dd4bf",
  problem: "#f87171",
  solution: "#34d399",
  resource: "#a78bfa",
  default: "#94a3b8",
};

function getNodeColor(node: NodeItem): string {
  return TYPE_COLORS[node.type] || TYPE_COLORS.default;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Minimap({
  topic,
  selectedNodeId,
  onSelectNode,
  viewCenter,
  viewportFraction = 1,
  width = 140,
  height = 100,
}: MinimapProps) {
  const { position, startDrag, resetPosition } = useDraggablePosition("tw-overlay-minimap", { x: 0, y: 0 });
  const nodes = topic?.nodes || [];

  // Project 3D positions to 2D (orthographic XY, ignoring Z for overview)
  const projected = useMemo(() => {
    if (nodes.length === 0) return { items: [], bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 } };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const raw = nodes.map((n) => {
      const x = n.position[0];
      const y = n.position[1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      return { id: n.id, x, y, node: n };
    });

    // Add padding
    const dx = (maxX - minX) || 2;
    const dy = (maxY - minY) || 2;
    const pad = Math.max(dx, dy) * 0.15;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;

    return { items: raw, bounds: { minX, maxX, minY, maxY } };
  }, [nodes]);

  const { items, bounds } = projected;
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;

  // Normalise to pixel coords
  const dots = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      px: ((item.x - bounds.minX) / rangeX) * width,
      py: ((item.y - bounds.minY) / rangeY) * height,
      color: getNodeColor(item.node),
      selected: item.id === selectedNodeId,
      size: Math.max(2, Math.min(5, (item.node.size || 0.2) * 8)),
    }));
  }, [items, bounds, rangeX, rangeY, width, height, selectedNodeId]);

  // Viewport rect (if zoom is applied)
  const viewRect = useMemo(() => {
    if (viewportFraction >= 0.99 || !viewCenter) return null;
    const cx = viewCenter ? ((viewCenter[0] - bounds.minX) / rangeX) * width : width / 2;
    const cy = viewCenter ? ((viewCenter[1] - bounds.minY) / rangeY) * height : height / 2;
    const vw = viewportFraction * width;
    const vh = viewportFraction * height;
    return { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };
  }, [viewCenter, viewportFraction, bounds, rangeX, rangeY, width, height]);

  if (!topic || nodes.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 56,
        right: 8,
        transform: `translate(${position.x}px, ${position.y}px)`,
        width,
        height,
        background: "var(--tw-bg-panel, #1a1a2e)",
        border: "1px solid var(--tw-border, #333)",
        borderRadius: 8,
        overflow: "hidden",
        zIndex: 50,
        opacity: 0.9,
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (!onSelectNode) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Find nearest dot
        let bestId = "";
        let bestDist = Infinity;
        for (const d of dots) {
          const dist = Math.hypot(d.px - mx, d.py - my);
          if (dist < bestDist) {
            bestDist = dist;
            bestId = d.id;
          }
        }
        if (bestId && bestDist < 20) {
          onSelectNode(bestId);
        }
      }}
    >
      {/* Grid lines for reference */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {/* Center cross */}
        <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke="var(--tw-border, #333)" strokeWidth="0.5" strokeDasharray="2,4" />
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="var(--tw-border, #333)" strokeWidth="0.5" strokeDasharray="2,4" />

        {/* Viewport rect */}
        {viewRect && (
          <rect
            x={viewRect.x}
            y={viewRect.y}
            width={viewRect.w}
            height={viewRect.h}
            fill="none"
            stroke="var(--tw-accent, #f59e0b)"
            strokeWidth="1"
            rx="2"
            opacity="0.6"
          />
        )}

        {/* Node dots */}
        {dots.map((d) => (
          <circle
            key={d.id}
            cx={d.px}
            cy={d.py}
            r={d.selected ? d.size + 1.5 : d.size}
            fill={d.color}
            opacity={d.selected ? 1 : 0.7}
            stroke={d.selected ? "#fff" : "none"}
            strokeWidth={d.selected ? 1.5 : 0}
          />
        ))}
      </svg>

      {/* Label */}
      <div
        style={{
          position: "absolute",
          top: 3,
          left: 5,
          fontSize: 8,
          color: "var(--tw-text-muted, #666)",
          pointerEvents: "none",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        minimap
      </div>

      <button
        onMouseDown={startDrag}
        onDoubleClick={resetPosition}
        style={{
          position: "absolute",
          top: 2,
          right: 4,
          height: 16,
          minWidth: 18,
          border: "1px solid var(--tw-border, #333)",
          borderRadius: 5,
          background: "var(--tw-bg-card, rgba(255,255,255,0.03))",
          color: "var(--tw-text-muted, #666)",
          fontSize: 8,
          cursor: "grab",
          zIndex: 2,
        }}
        title="Drag to move / double click to reset"
      >
        ⋮
      </button>

      {/* Node count */}
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 5,
          fontSize: 8,
          color: "var(--tw-text-muted, #555)",
          pointerEvents: "none",
        }}
      >
        {nodes.length}
      </div>
    </div>
  );
}
