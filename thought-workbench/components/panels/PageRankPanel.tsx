import React from "react";
import type { NodeItem } from "../../types";
import type { CommunityCluster } from "../../graph-analytics/centrality";
import type { PageRankFocusSignal } from "../../pagerank";

function buildTopNodes(nodes: NodeItem[], metricMap: Map<string, number>, limit = 5) {
  return [...nodes]
    .sort((left, right) => (metricMap.get(right.id) || 0) - (metricMap.get(left.id) || 0))
    .slice(0, limit);
}

function MetricSection({
  title,
  nodes,
  metricMap,
  onSelectNode,
}: {
  title: string;
  nodes: NodeItem[];
  metricMap: Map<string, number>;
  onSelectNode: (nodeId: string) => void;
}) {
  if (nodes.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[8px] uppercase tracking-wider text-white/36">{title}</div>
      <div className="space-y-1">
        {nodes.map((node) => (
          <button
            key={`${title}-${node.id}`}
            className="flex w-full items-center justify-between rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[9px] text-white/72"
            onClick={() => onSelectNode(node.id)}
          >
            <span className="truncate">{node.label}</span>
            <span className="text-white/38">{(metricMap.get(node.id) || 0).toFixed(3)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PageRankPanel({
  title,
  nodes,
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
  onSelectNode,
  lang = "ja",
}: {
  title: string;
  nodes: NodeItem[];
  pageRankMap: Map<string, number>;
  pageRankFlowMap: Map<string, number>;
  pageRankFocusMap: Map<string, number>;
  focusSignals: PageRankFocusSignal[];
  betweennessMap: Map<string, number>;
  hubMap: Map<string, number>;
  authorityMap: Map<string, number>;
  degreeMap: Map<string, number>;
  communities: CommunityCluster[];
  communityMap: Map<string, string>;
  onSelectNode: (nodeId: string) => void;
  lang?: "ja" | "en";
}) {
  const pageRankNodes = buildTopNodes(nodes, pageRankMap);
  const pageRankFlowNodes = buildTopNodes(nodes, pageRankFlowMap);
  const pageRankFocusNodes = buildTopNodes(nodes, pageRankFocusMap);
  const betweennessNodes = buildTopNodes(nodes, betweennessMap);
  const hubNodes = buildTopNodes(nodes, hubMap);
  const authorityNodes = buildTopNodes(nodes, authorityMap);
  const degreeNodes = buildTopNodes(nodes, degreeMap);

  const reasonLabel = (reason: string) => {
    if (lang === "ja") {
      if (reason === "must-one") return "Must One";
      if (reason === "task") return "Task";
      if (reason === "recent") return "最近更新";
      if (reason === "deep") return "深掘り";
      if (reason === "confident") return "高確信";
    }
    if (reason === "must-one") return "Must One";
    if (reason === "task") return "Task";
    if (reason === "recent") return "Recent";
    if (reason === "deep") return "Deep";
    if (reason === "confident") return "Confident";
    return reason;
  };

  return (
    <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
      <div className="text-[9px] text-white/92">{title}</div>
      <div className="mt-1 text-[7px] text-white/40">
        {lang === "ja" ? "Balanced / Flow / Focus / Bridge / Hub / Authority / Degree" : "Balanced / Flow / Focus / Bridge / Hub / Authority / Degree"}
      </div>
      <div className="mt-1.5 grid gap-2">
        <MetricSection title={lang === "ja" ? "PageRank Balanced" : "PageRank Balanced"} nodes={pageRankNodes} metricMap={pageRankMap} onSelectNode={onSelectNode} />
        <MetricSection title={lang === "ja" ? "PageRank Flow" : "PageRank Flow"} nodes={pageRankFlowNodes} metricMap={pageRankFlowMap} onSelectNode={onSelectNode} />
        <MetricSection title={lang === "ja" ? "PageRank Focus" : "PageRank Focus"} nodes={pageRankFocusNodes} metricMap={pageRankFocusMap} onSelectNode={onSelectNode} />
        {focusSignals.length > 0 && (
          <div>
            <div className="mb-1 text-[8px] uppercase tracking-wider text-white/36">
              {lang === "ja" ? "Focus Signals" : "Focus Signals"}
            </div>
            <div className="space-y-1">
              {focusSignals.map((entry) => (
                <button
                  key={`focus-${entry.nodeId}`}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-left text-[8px] text-white/68"
                  onClick={() => onSelectNode(entry.nodeId)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-white/84">{entry.label}</span>
                    <span className="text-white/34">{entry.weight.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.reasons.map((reason) => (
                      <span key={`${entry.nodeId}-${reason}`} className="rounded-full border border-white/10 px-1.5 py-0.5 text-[7px] text-white/52">
                        {reasonLabel(reason)}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        <MetricSection title={lang === "ja" ? "Bridge" : "Bridge"} nodes={betweennessNodes} metricMap={betweennessMap} onSelectNode={onSelectNode} />
        <MetricSection title="Hub" nodes={hubNodes} metricMap={hubMap} onSelectNode={onSelectNode} />
        <MetricSection title="Authority" nodes={authorityNodes} metricMap={authorityMap} onSelectNode={onSelectNode} />
        <MetricSection title={lang === "ja" ? "Degree" : "Degree"} nodes={degreeNodes} metricMap={degreeMap} onSelectNode={onSelectNode} />
        {communities.length > 0 && (
          <div>
            <div className="mb-1 text-[8px] uppercase tracking-wider text-white/36">
              {lang === "ja" ? "Communities" : "Communities"}
            </div>
            <div className="space-y-1">
              {communities.slice(0, 6).map((community) => (
                <div key={community.id} className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[8px] text-white/66">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/82">{community.label}</span>
                    <span className="text-white/36">
                      {community.size}
                      {lang === "ja" ? " nodes" : " nodes"} / {community.density.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {community.nodeIds.slice(0, 4).map((nodeId) => {
                      const node = nodes.find((item) => item.id === nodeId);
                      if (!node) return null;
                      return (
                        <button
                          key={`${community.id}-${nodeId}`}
                          className="rounded-full border border-white/10 px-1.5 py-0.5 text-[7px] text-white/64"
                          onClick={() => onSelectNode(nodeId)}
                          title={communityMap.get(nodeId)}
                        >
                          {node.label}
                        </button>
                      );
                    })}
                    {community.nodeIds.length > 4 && (
                      <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[7px] text-white/40">
                        +{community.nodeIds.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
