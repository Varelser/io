import React, { useRef, useEffect, useState, useCallback } from "react";
import type { TopicItem, TopicLinkItem } from "../../types";

type LayoutNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  nodeCount: number;
  edgeCount: number;
  parentTopicId: string | null;
};

type LayoutEdge = {
  from: string;
  to: string;
  relation: string;
};

function buildLayout(topics: TopicItem[], topicLinks: TopicLinkItem[]) {
  const nodes: LayoutNode[] = topics.map((t, i) => ({
    id: t.id,
    label: t.title,
    x: 400 + Math.cos((i / topics.length) * Math.PI * 2) * 200 + (Math.random() - 0.5) * 40,
    y: 300 + Math.sin((i / topics.length) * Math.PI * 2) * 200 + (Math.random() - 0.5) * 40,
    vx: 0,
    vy: 0,
    nodeCount: t.nodes.length,
    edgeCount: t.edges.length,
    parentTopicId: t.parentTopicId || null,
  }));

  const edges: LayoutEdge[] = [];
  const idSet = new Set(topics.map((t) => t.id));

  // Topic links
  topicLinks.forEach((link) => {
    if (idSet.has(link.from) && idSet.has(link.to)) {
      edges.push({ from: link.from, to: link.to, relation: link.relation || "" });
    }
  });

  // Parent-child relationships
  topics.forEach((t) => {
    if (t.parentTopicId && idSet.has(t.parentTopicId)) {
      const exists = edges.some((e) => (e.from === t.parentTopicId && e.to === t.id) || (e.from === t.id && e.to === t.parentTopicId));
      if (!exists) {
        edges.push({ from: t.parentTopicId!, to: t.id, relation: "parent" });
      }
    }
  });

  return { nodes, edges };
}

/** Returns true if the simulation has converged (total kinetic energy below threshold). */
function simulate(nodes: LayoutNode[], edges: LayoutEdge[], width: number, height: number): boolean {
  const k = 120; // ideal distance
  const dt = 0.3;
  const gravity = 0.01;
  const cx = width / 2;
  const cy = height / 2;

  // Repulsion — cap at 200 nodes to avoid O(n²) blowup
  const repulsionLimit = Math.min(nodes.length, 200);
  for (let i = 0; i < repulsionLimit; i++) {
    for (let j = i + 1; j < repulsionLimit; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (k * k) / dist;
      const fx = (dx / dist) * force * dt;
      const fy = (dy / dist) * force * dt;
      nodes[i].vx += fx;
      nodes[i].vy += fy;
      nodes[j].vx -= fx;
      nodes[j].vy -= fy;
    }
  }

  // Attraction along edges
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  edges.forEach((edge) => {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const force = (dist - k) * 0.05 * dt;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  });

  // Gravity toward center
  nodes.forEach((n) => {
    n.vx += (cx - n.x) * gravity * dt;
    n.vy += (cy - n.y) * gravity * dt;
  });

  // Apply velocity with damping and measure total kinetic energy
  let totalEnergy = 0;
  nodes.forEach((n) => {
    n.vx *= 0.85;
    n.vy *= 0.85;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(40, Math.min(width - 40, n.x));
    n.y = Math.max(40, Math.min(height - 40, n.y));
    totalEnergy += n.vx * n.vx + n.vy * n.vy;
  });

  return totalEnergy < 0.01;
}

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.15;

export function NetworkView({
  topics,
  topicLinks,
  selectedTopicId,
  onSelectTopic,
}: {
  topics: TopicItem[];
  topicLinks: TopicLinkItem[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string, nodeId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<{ nodes: LayoutNode[]; edges: LayoutEdge[] } | null>(null);
  const animRef = useRef<number>(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

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

  useEffect(() => {
    layoutRef.current = buildLayout(topics, topicLinks);
    // Initialize positions based on container size
    layoutRef.current.nodes.forEach((n, i) => {
      n.x = dims.w / 2 + Math.cos((i / Math.max(layoutRef.current!.nodes.length, 1)) * Math.PI * 2) * Math.min(dims.w, dims.h) * 0.3 + (Math.random() - 0.5) * 40;
      n.y = dims.h / 2 + Math.sin((i / Math.max(layoutRef.current!.nodes.length, 1)) * Math.PI * 2) * Math.min(dims.w, dims.h) * 0.3 + (Math.random() - 0.5) * 40;
    });
  }, [topics, topicLinks, dims.w, dims.h]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);

    const converged = simulate(layout.nodes, layout.edges, dims.w, dims.h);

    ctx.clearRect(0, 0, dims.w, dims.h);

    // Apply zoom + pan transform
    ctx.save();
    ctx.translate(dims.w / 2 + pan.x, dims.h / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-dims.w / 2, -dims.h / 2);

    // Draw edges
    const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));
    layout.edges.forEach((edge) => {
      const a = nodeMap.get(edge.from);
      const b = nodeMap.get(edge.to);
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = edge.relation === "parent" ? "rgba(100,180,255,0.25)" : "rgba(255,255,255,0.12)";
      ctx.lineWidth = edge.relation === "parent" ? 1.5 : 1;
      ctx.stroke();

      // Edge label
      if (edge.relation && edge.relation !== "parent") {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.font = "8px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.textAlign = "center";
        ctx.fillText(edge.relation, mx, my - 4);
      }
    });

    // Draw nodes
    layout.nodes.forEach((n) => {
      const isSelected = n.id === selectedTopicId;
      const isHovered = n.id === hoveredId;
      const radius = 6 + Math.sqrt(n.nodeCount) * 2;

      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "rgba(100,180,255,0.6)" : isHovered ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)";
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "rgba(100,180,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label
      ctx.font = "10px sans-serif";
      ctx.fillStyle = isSelected ? "rgba(200,220,255,0.9)" : "rgba(255,255,255,0.6)";
      ctx.textAlign = "center";
      ctx.fillText(n.label, n.x, n.y + radius + 12);

      // Node count badge
      ctx.font = "7px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText(`${n.nodeCount}n`, n.x, n.y + radius + 22);
    });

    ctx.restore();

    if (!converged) {
      animRef.current = requestAnimationFrame(draw);
    }
  }, [dims, selectedTopicId, hoveredId, zoom, pan]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Wheel zoom (centered on cursor)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((prev) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev + delta)));
    // Restart animation after zoom
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // Pan via middle-button drag or right-drag
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      panStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan
    if (panStartRef.current) {
      const dx = e.clientX - panStartRef.current.mx;
      const dy = e.clientY - panStartRef.current.my;
      setPan({ x: panStartRef.current.px + dx, y: panStartRef.current.py + dy });
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    // Hover detection (account for zoom+pan)
    const layout = layoutRef.current;
    if (!layout) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    // Inverse transform: canvas coords → world coords
    const mx = (rawX - dims.w / 2 - pan.x) / zoom + dims.w / 2;
    const my = (rawY - dims.h / 2 - pan.y) / zoom + dims.h / 2;
    let found: string | null = null;
    for (const n of layout.nodes) {
      const radius = 6 + Math.sqrt(n.nodeCount) * 2;
      const dx = mx - n.x;
      const dy = my - n.y;
      if (dx * dx + dy * dy < (radius + 6) * (radius + 6)) {
        found = n.id;
        break;
      }
    }
    setHoveredId(found);
  }, [dims, zoom, pan, draw]);

  const handleMouseUp = useCallback(() => {
    panStartRef.current = null;
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (panStartRef.current) return;
      const layout = layoutRef.current;
      if (!layout) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const mx = (rawX - dims.w / 2 - pan.x) / zoom + dims.w / 2;
      const my = (rawY - dims.h / 2 - pan.y) / zoom + dims.h / 2;
      for (const n of layout.nodes) {
        const radius = 6 + Math.sqrt(n.nodeCount) * 2;
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < (radius + 6) * (radius + 6)) {
          onSelectTopic(n.id, null);
          return;
        }
      }
    },
    [onSelectTopic, dims, zoom, pan]
  );

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(ZOOM_MAX, parseFloat((prev + ZOOM_STEP).toFixed(2))));
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(ZOOM_MIN, parseFloat((prev - ZOOM_STEP).toFixed(2))));
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [draw]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#020202]">
      <div className="absolute left-4 top-3 z-10 text-[10px] uppercase tracking-wider text-white/30">
        Network View
        <span className="ml-2 text-[8px] text-white/20">{topics.length} spheres / {topicLinks.length} links</span>
      </div>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="flex h-6 w-6 items-center justify-center rounded border text-[12px] leading-none transition-colors hover:bg-white/10"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.4)" }}
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={handleZoomReset}
          className="flex h-6 w-6 items-center justify-center rounded border text-[7px] leading-none transition-colors hover:bg-white/10"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.4)" }}
          aria-label="Reset zoom"
        >{Math.round(zoom * 100)}%</button>
        <button
          onClick={handleZoomOut}
          className="flex h-6 w-6 items-center justify-center rounded border text-[12px] leading-none transition-colors hover:bg-white/10"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.4)" }}
          aria-label="Zoom out"
        >−</button>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: dims.w, height: dims.h }}
        className="cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
