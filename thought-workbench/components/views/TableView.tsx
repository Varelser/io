import React, { useState } from "react";
import type { TopicItem, NodeItem } from "../../types";
import { getIntakeStatusLabel, getWorkStatusLabel } from "../../utils/state-model";

type FlatNode = NodeItem & { topicTitle: string; topicId: string };

export function TableView({ topics, selectedTopicId, onSelectTopic, lang = "en" }: { topics: TopicItem[]; selectedTopicId: string | null; onSelectTopic: (topicId: string, nodeId: string | null) => void; lang?: "ja" | "en" }) {
  const [sortKey, setSortKey] = useState<string>("label");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterTopic, setFilterTopic] = useState<string>("all");

  // Flatten all nodes
  const flatNodes: FlatNode[] = [];
  const filteredTopics = filterTopic === "all" ? topics : topics.filter((t) => t.id === filterTopic);
  filteredTopics.forEach((topic) => {
    topic.nodes.forEach((node) => {
      flatNodes.push({ ...node, topicTitle: topic.title, topicId: topic.id });
    });
  });

  // Sort
  flatNodes.sort((a, b) => {
    const av = (a as any)[sortKey] ?? "";
    const bv = (b as any)[sortKey] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const cols: { key: string; label: string; w: string }[] = [
    { key: "topicTitle", label: "Topic", w: "120px" },
    { key: "label", label: "Label", w: "140px" },
    { key: "type", label: "Type", w: "70px" },
    { key: "tense", label: "Tense", w: "60px" },
    { key: "intakeStatus", label: "Intake", w: "60px" },
    { key: "workStatus", label: "Work", w: "60px" },
    { key: "layer", label: "Layer", w: "70px" },
    { key: "group", label: "Group", w: "70px" },
    { key: "depth", label: "Depth", w: "50px" },
    { key: "confidence", label: "Conf", w: "50px" },
    { key: "evidenceBasis", label: "Evidence", w: "60px" },
    { key: "size", label: "Size", w: "50px" },
    { key: "createdAt", label: "Created", w: "80px" },
  ];

  return (
    <div className="absolute inset-0 overflow-auto bg-[#020202] p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-white/30">Table View</div>
        <select
          className="rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[9px] text-white/70"
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
        >
          <option value="all">All Topics</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <div className="text-[8px] text-white/25">{flatNodes.length} nodes</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              {cols.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer border-b border-white/10 px-2 py-1.5 text-left text-[8px] uppercase tracking-wider text-white/40 hover:text-white/60"
                  style={{ minWidth: col.w }}
                >
                  {col.label} {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flatNodes.map((node) => (
              <tr
                key={`${node.topicId}-${node.id}`}
                onClick={() => onSelectTopic(node.topicId, node.id)}
                className="cursor-pointer border-b border-white/5 hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-2 py-1.5 text-white/40 truncate" style={{ maxWidth: "120px" }}>{node.topicTitle}</td>
                <td className="px-2 py-1.5 text-white/80 truncate" style={{ maxWidth: "140px" }}>{node.label}</td>
                <td className="px-2 py-1.5 text-white/50">{node.type}</td>
                <td className="px-2 py-1.5 text-white/50">{node.tense}</td>
                <td className="px-2 py-1.5 text-white/40">{getIntakeStatusLabel(node.intakeStatus, lang)}</td>
                <td className="px-2 py-1.5 text-white/40">{getWorkStatusLabel(node.workStatus, lang)}</td>
                <td className="px-2 py-1.5 text-white/40">{node.layer}</td>
                <td className="px-2 py-1.5 text-white/40">{node.group}</td>
                <td className="px-2 py-1.5 text-white/40">{node.depth ?? "-"}</td>
                <td className="px-2 py-1.5 text-white/40">{node.confidence != null ? node.confidence.toFixed(2) : "-"}</td>
                <td className="px-2 py-1.5 text-white/40">{node.evidenceBasis || "-"}</td>
                <td className="px-2 py-1.5 text-white/40">{node.size.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-white/40 text-[8px]">{node.createdAt ? new Date(node.createdAt).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
