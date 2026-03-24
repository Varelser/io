import React, { useMemo, useState } from "react";
import type { TopicItem } from "../../types";

type LayerGroup = {
  depth: number;
  nodes: { id: string; label: string; type: string; confidence: number; size: number; group: string }[];
};

function computeDepthLayers(topic: TopicItem): LayerGroup[] {
  // BFS from root nodes to assign depth
  const depthMap = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  topic.nodes.forEach((n) => adjList.set(n.id, []));
  topic.edges.forEach((e) => {
    adjList.get(e.from)?.push(e.to);
  });

  // Find root candidates: nodes with no incoming edges, or nodes with explicit depth 0
  const hasIncoming = new Set(topic.edges.map((e) => e.to));
  const roots = topic.nodes.filter((n) => !hasIncoming.has(n.id) || n.depth === 0);
  if (roots.length === 0 && topic.nodes.length > 0) roots.push(topic.nodes[0]);

  const queue = roots.map((r) => ({ id: r.id, depth: 0 }));
  roots.forEach((r) => depthMap.set(r.id, 0));

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const children = adjList.get(id) || [];
    children.forEach((childId) => {
      if (!depthMap.has(childId)) {
        depthMap.set(childId, depth + 1);
        queue.push({ id: childId, depth: depth + 1 });
      }
    });
  }

  // Assign remaining unconnected nodes using their explicit depth or -1
  topic.nodes.forEach((n) => {
    if (!depthMap.has(n.id)) {
      depthMap.set(n.id, n.depth ?? -1);
    }
  });

  // Group by depth
  const groups = new Map<number, LayerGroup>();
  topic.nodes.forEach((n) => {
    const d = depthMap.get(n.id) ?? -1;
    if (!groups.has(d)) groups.set(d, { depth: d, nodes: [] });
    groups.get(d)!.nodes.push({
      id: n.id,
      label: n.label,
      type: n.type,
      confidence: n.confidence ?? 1,
      size: n.size,
      group: n.group,
    });
  });

  return Array.from(groups.values()).sort((a, b) => a.depth - b.depth);
}

const TYPE_COLORS: Record<string, string> = {
  concept: "bg-blue-500/20 border-blue-500/30 text-blue-300",
  fact: "bg-green-500/20 border-green-500/30 text-green-300",
  question: "bg-red-500/20 border-red-500/30 text-red-300",
  hypothesis: "bg-orange-500/20 border-orange-500/30 text-orange-300",
  argument: "bg-purple-500/20 border-purple-500/30 text-purple-300",
  evidence: "bg-teal-500/20 border-teal-500/30 text-teal-300",
};

export function DepthView({
  topic,
  selectedNodeId,
  onSelectNode,
}: {
  topic: TopicItem | null;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}) {
  const [filterType, setFilterType] = useState("all");
  const layers = useMemo(() => (topic ? computeDepthLayers(topic) : []), [topic]);

  const allTypes = useMemo(() => {
    if (!topic) return [];
    return Array.from(new Set(topic.nodes.map((n) => n.type)));
  }, [topic]);

  if (!topic) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#020202]">
        <div className="text-[10px] text-white/30">Select a sphere to view depth layers</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-auto bg-[#020202] p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-wider text-white/30">Depth View</div>
        <div className="text-[9px] text-white/20">{topic.title}</div>
        <select
          className="rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[9px] text-white/70"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {layers.map((layer) => {
          const filtered = filterType === "all" ? layer.nodes : layer.nodes.filter((n) => n.type === filterType);
          if (filtered.length === 0) return null;
          return (
            <div key={layer.depth} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[8px] text-white/50">
                  {layer.depth >= 0 ? layer.depth : "?"}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-white/30">
                  Depth {layer.depth >= 0 ? layer.depth : "unlinked"}
                </div>
                <div className="text-[8px] text-white/20">{filtered.length} nodes</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filtered.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const colorClass = TYPE_COLORS[node.type] || "bg-white/10 border-white/20 text-white/60";
                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectNode(node.id)}
                      className={`rounded-md border px-2 py-1 text-[9px] transition-all hover:brightness-125 ${colorClass} ${isSelected ? "ring-1 ring-blue-400/50 brightness-125" : ""}`}
                    >
                      <span className="mr-1 text-[7px] opacity-50">{node.type}</span>
                      {node.label}
                      {node.confidence < 1 && (
                        <span className="ml-1 text-[7px] opacity-40">{(node.confidence * 100).toFixed(0)}%</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
