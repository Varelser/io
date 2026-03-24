import React, { useState, useMemo } from "react";
import type { TopicItem } from "../../types";

type TreeNode = {
  id: string;
  label: string;
  type: string;
  children: TreeNode[];
  depth: number;
};

function buildTree(topic: TopicItem): TreeNode {
  const nodeMap = new Map(topic.nodes.map((n) => ({ ...n, children: [] as TreeNode[] })).map((n) => [n.id, n]));
  const childSet = new Set<string>();

  topic.edges.forEach((edge) => {
    const parent = nodeMap.get(edge.from);
    const child = nodeMap.get(edge.to);
    if (parent && child && edge.from !== edge.to) {
      parent.children.push({ id: child.id, label: child.label, type: child.type, children: [], depth: 0 });
      childSet.add(edge.to);
    }
  });

  // Find roots (nodes that are not children of any edge)
  const roots = topic.nodes.filter((n) => !childSet.has(n.id));
  if (roots.length === 0 && topic.nodes.length > 0) {
    roots.push(topic.nodes[0]);
  }

  // Build recursive tree from edges using BFS
  function buildSubtree(nodeId: string, visited: Set<string>, depth: number): TreeNode {
    const node = topic.nodes.find((n) => n.id === nodeId);
    if (!node) return { id: nodeId, label: "?", type: "unknown", children: [], depth };
    visited.add(nodeId);
    const childEdges = topic.edges.filter((e) => e.from === nodeId && !visited.has(e.to));
    const children = childEdges.map((e) => buildSubtree(e.to, visited, depth + 1));
    return { id: node.id, label: node.label, type: node.type, children, depth };
  }

  if (roots.length === 1) {
    return buildSubtree(roots[0].id, new Set(), 0);
  }

  // Virtual root
  const visited = new Set<string>();
  return {
    id: "__root__",
    label: topic.title,
    type: "root",
    children: roots.map((r) => buildSubtree(r.id, visited, 1)),
    depth: 0,
  };
}

const TYPE_COLORS: Record<string, string> = {
  concept: "#6fa8dc",
  fact: "#93c47d",
  question: "#e06666",
  hypothesis: "#f6b26b",
  argument: "#8e7cc3",
  evidence: "#76a5af",
  root: "#999",
};

function MindmapNode({
  node,
  selectedNodeId,
  onSelectNode,
  collapsed,
  toggleCollapse,
}: {
  node: TreeNode;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  collapsed: Set<string>;
  toggleCollapse: (id: string) => void;
}) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedNodeId;
  const color = TYPE_COLORS[node.type] || "#aaa";

  return (
    <div className="flex items-start gap-0">
      <div className="flex flex-col items-center">
        <div
          onClick={() => onSelectNode(node.id)}
          className={`cursor-pointer rounded-md border px-2 py-1 text-[10px] transition-all hover:brightness-125 ${isSelected ? "border-blue-400/60 bg-blue-500/20 text-blue-200" : "border-white/10 bg-white/[0.04] text-white/70"}`}
          style={{ borderLeftColor: color, borderLeftWidth: 2 }}
        >
          <span className="mr-1 text-[7px] uppercase" style={{ color }}>{node.type}</span>
          {node.label}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
              className="ml-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full bg-white/10 text-[7px] text-white/40 hover:bg-white/20"
            >
              {isCollapsed ? "+" : "−"}
            </button>
          )}
        </div>
      </div>
      {hasChildren && !isCollapsed && (
        <div className="ml-1 flex flex-col gap-1 border-l border-white/10 pl-3 pt-1">
          {node.children.map((child) => (
            <MindmapNode
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MindmapView({
  topic,
  selectedNodeId,
  onSelectNode,
}: {
  topic: TopicItem | null;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => (topic ? buildTree(topic) : null), [topic]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!topic) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#020202]">
        <div className="text-[10px] text-white/30">Select a sphere to view its mindmap</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-auto bg-[#020202] p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-wider text-white/30">Mindmap View</div>
        <div className="text-[9px] text-white/20">{topic.title} — {topic.nodes.length} nodes</div>
      </div>
      {tree && (
        <MindmapNode
          node={tree}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          collapsed={collapsed}
          toggleCollapse={toggleCollapse}
        />
      )}
    </div>
  );
}
