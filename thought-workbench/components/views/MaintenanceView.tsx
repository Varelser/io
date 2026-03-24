import React, { useMemo } from "react";
import type { TopicItem, TopicLinkItem } from "../../types";
import { collectMaintenanceIssues, type MaintenanceIssue } from "../../utils/maintenance-repair";

const CATEGORY_LABELS: Record<string, { ja: string; en: string; color: string }> = {
  inbox: { ja: "未処理 Inbox", en: "Inbox Backlog", color: "text-blue-400" },
  stale: { ja: "放置ノード", en: "Stale Nodes", color: "text-yellow-400" },
  confidence: { ja: "低確信度+未検証", en: "Low Confidence", color: "text-red-400" },
  orphan: { ja: "孤立ノード", en: "Orphan Nodes", color: "text-orange-400" },
  duplicate: { ja: "重複名称", en: "Duplicate Names", color: "text-purple-400" },
  broken: { ja: "参照切れ", en: "Broken References", color: "text-red-500" },
  material: { ja: "未読資料", en: "Unread Materials", color: "text-cyan-400" },
  url: { ja: "URL 未検証", en: "URL Unverified", color: "text-teal-400" },
  "missing-layer": { ja: "layer 欠損", en: "Missing Layer", color: "text-amber-300" },
  "missing-group": { ja: "group 欠損", en: "Missing Group", color: "text-sky-300" },
  "missing-relation": { ja: "relation 欠損", en: "Missing Relation", color: "text-emerald-300" },
};

const SEVERITY_BADGE: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-white/10 text-white/40",
};

export function MaintenanceView({
  topics,
  topicLinks,
  onSelectNode,
  onUpdateNode,
  onUpdateEdge,
  lang,
}: {
  topics: TopicItem[];
  topicLinks: TopicLinkItem[];
  onSelectNode: (topicId: string, nodeId: string | null) => void;
  onUpdateNode?: (topicId: string, nodeId: string, patch: Record<string, unknown>) => void;
  onUpdateEdge?: (topicId: string, edgeId: string, patch: Record<string, unknown>) => void;
  lang?: "ja" | "en";
}) {
  const l = lang || "ja";
  const issues = useMemo(() => collectMaintenanceIssues(topics, topicLinks), [topics, topicLinks]);

  const grouped = useMemo(() => {
    const map = new Map<string, MaintenanceIssue[]>();
    for (const issue of issues) {
      if (!map.has(issue.category)) map.set(issue.category, []);
      map.get(issue.category)!.push(issue);
    }
    return map;
  }, [issues]);

  const summary = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    for (const issue of issues) {
      if (issue.severity === "high") high++;
      else if (issue.severity === "medium") medium++;
      else low++;
    }
    return { high, medium, low, total: issues.length };
  }, [issues]);

  return (
    <div className="absolute inset-0 overflow-auto bg-[#020202] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-white/30">
          {l === "ja" ? "保守ダッシュボード" : "Maintenance Dashboard"}
        </div>
        {issues.some((i) => i.repair) && (
          <button
            onClick={() => {
              for (const issue of issues) {
                if (!issue.repair) continue;
                if (issue.repair.target === "node-layer" && issue.nodeId) {
                  onUpdateNode?.(issue.topicId, issue.nodeId, { layer: issue.repair.value });
                } else if (issue.repair.target === "node-group" && issue.nodeId) {
                  onUpdateNode?.(issue.topicId, issue.nodeId, { group: issue.repair.value });
                } else if (issue.repair.target === "edge-relation" && issue.repair.edgeId) {
                  onUpdateEdge?.(issue.topicId, issue.repair.edgeId, { relation: issue.repair.value });
                }
              }
            }}
            className="rounded border px-2 py-1 text-[8px] transition hover:bg-white/[0.05]"
            style={{ borderColor: "var(--tw-accent)", color: "var(--tw-accent)", background: "transparent" }}
          >
            {l === "ja" ? `一括修復 (${issues.filter((i) => i.repair).length}件)` : `Auto-fix all (${issues.filter((i) => i.repair).length})`}
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-center">
          <div className="text-[20px] font-light text-white/80">{summary.total}</div>
          <div className="text-[8px] text-white/30 uppercase">{l === "ja" ? "全件" : "Total"}</div>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
          <div className="text-[20px] font-light text-red-400">{summary.high}</div>
          <div className="text-[8px] text-red-400/50 uppercase">{l === "ja" ? "高" : "High"}</div>
        </div>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
          <div className="text-[20px] font-light text-yellow-400">{summary.medium}</div>
          <div className="text-[8px] text-yellow-400/50 uppercase">{l === "ja" ? "中" : "Medium"}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-center">
          <div className="text-[20px] font-light text-white/40">{summary.low}</div>
          <div className="text-[8px] text-white/25 uppercase">{l === "ja" ? "低" : "Low"}</div>
        </div>
      </div>

      {issues.length === 0 && (
        <div className="text-center py-8 text-[10px] text-white/30">
          {l === "ja" ? "問題は検出されませんでした" : "No issues detected"}
        </div>
      )}

      {/* Category groups */}
      {Array.from(grouped.entries()).map(([category, categoryIssues]) => {
        const catLabel = CATEGORY_LABELS[category] || { ja: category, en: category, color: "text-white/50" };
        return (
          <div key={category} className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[9px] font-medium ${catLabel.color}`}>{catLabel[l]}</span>
              <span className="text-[8px] text-white/25">{categoryIssues.length}</span>
            </div>
            <div className="space-y-0.5">
              {categoryIssues.slice(0, 20).map((issue, i) => (
                <div
                  key={i}
                  onClick={() => onSelectNode(issue.topicId, issue.nodeId || null)}
                  className="flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <span className={`rounded px-1 py-0.5 text-[7px] ${SEVERITY_BADGE[issue.severity]}`}>
                    {issue.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[8px] text-white/60 truncate">{issue.label}</div>
                    {issue.repair && (
                      <div className="mt-0.5 text-[7px] text-white/28">
                        {l === "ja" ? "推奨" : "Suggest"}: {issue.repair.value} ({issue.repair.reason})
                      </div>
                    )}
                  </div>
                  {issue.repair && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        if (issue.repair?.target === "node-layer" && issue.nodeId) {
                          onUpdateNode?.(issue.topicId, issue.nodeId, { layer: issue.repair.value });
                        } else if (issue.repair?.target === "node-group" && issue.nodeId) {
                          onUpdateNode?.(issue.topicId, issue.nodeId, { group: issue.repair.value });
                        } else if (issue.repair?.target === "edge-relation" && issue.repair.edgeId) {
                          onUpdateEdge?.(issue.topicId, issue.repair.edgeId, { relation: issue.repair.value });
                        }
                      }}
                      className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[7px] text-white/65 hover:bg-white/[0.08]"
                    >
                      {l === "ja" ? "適用" : "Apply"}
                    </button>
                  )}
                </div>
              ))}
              {categoryIssues.length > 20 && (
                <div className="text-[7px] text-white/20 pl-2">+{categoryIssues.length - 20} more</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
