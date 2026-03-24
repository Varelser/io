import React, { useMemo, useState } from "react";
import type { TopicItem, NodeItem } from "../../types";
import { buildReviewPromptSet, type ReviewPromptSet } from "../../utils/review-prompts";

type ReviewCategory = "stale" | "low-confidence" | "no-edges" | "shallow" | "no-extensions";

const CATEGORY_LABELS: Record<ReviewCategory, { ja: string; en: string }> = {
  stale: { ja: "長期未更新", en: "Stale" },
  "low-confidence": { ja: "低確信度", en: "Low Confidence" },
  "no-edges": { ja: "孤立ノード", en: "No Edges" },
  shallow: { ja: "浅い深度", en: "Shallow" },
  "no-extensions": { ja: "拡張なし", en: "No Extensions" },
};

const CATEGORY_COLORS: Record<ReviewCategory, string> = {
  stale: "#f59e0b",
  "low-confidence": "#ef4444",
  "no-edges": "#8b5cf6",
  shallow: "#06b6d4",
  "no-extensions": "#64748b",
};

type ReviewItem = {
  node: NodeItem;
  topicId: string;
  topicTitle: string;
  categories: ReviewCategory[];
  staleDays: number;
  prompts: ReviewPromptSet;
};

function buildReviewItems(topics: TopicItem[], staleDaysThreshold: number, lang: "ja" | "en"): ReviewItem[] {
  const now = Date.now();
  const items: ReviewItem[] = [];

  for (const topic of topics) {
    const edgeNodeIds = new Set<string>();
    for (const edge of topic.edges) {
      edgeNodeIds.add(edge.from);
      edgeNodeIds.add(edge.to);
    }

    for (const node of topic.nodes) {
      const cats: ReviewCategory[] = [];

      // Stale check
      const updatedAt = node.updatedAt ? new Date(node.updatedAt).getTime() : (node.createdAt ? new Date(node.createdAt).getTime() : now);
      const staleDays = Math.floor((now - updatedAt) / 86400000);
      if (staleDays >= staleDaysThreshold) cats.push("stale");

      // Low confidence
      if (node.confidence != null && node.confidence < 0.3) cats.push("low-confidence");

      // No edges (isolated)
      if (!edgeNodeIds.has(node.id)) cats.push("no-edges");

      // Shallow depth
      if ((node.depth ?? 0) <= 1 && node.note.length < 20) cats.push("shallow");

      // No extensions
      if (!node.extensions || Object.keys(node.extensions).length === 0) {
        if (topic.activeMethods && topic.activeMethods.length > 0) {
          cats.push("no-extensions");
        }
      }

      if (cats.length > 0) {
        items.push({
          node,
          topicId: topic.id,
          topicTitle: topic.title,
          categories: cats,
          staleDays,
          prompts: buildReviewPromptSet({
            topic,
            node,
            categories: cats,
            staleDays,
            hasEdges: edgeNodeIds.has(node.id),
          }, lang),
        });
      }
    }
  }

  // Sort by number of issues (descending), then stale days
  items.sort((a, b) => b.categories.length - a.categories.length || b.staleDays - a.staleDays);
  return items;
}

export function ReviewView({
  topics,
  lang,
  onSelectNode,
}: {
  topics: TopicItem[];
  lang?: "ja" | "en";
  onSelectNode?: (topicId: string, nodeId: string) => void;
}) {
  const l = lang || "ja";
  const [staleDays, setStaleDays] = useState(7);
  const [filterCat, setFilterCat] = useState<ReviewCategory | "all">("all");

  const reviewItems = useMemo(() => buildReviewItems(topics, staleDays, l), [topics, staleDays, l]);
  const filtered = filterCat === "all" ? reviewItems : reviewItems.filter((item) => item.categories.includes(filterCat));

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of reviewItems) {
      for (const cat of item.categories) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [reviewItems]);

  return (
    <div className="p-4 h-full overflow-auto" style={{ background: "var(--tw-bg)", color: "var(--tw-text)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[13px] font-medium">{l === "ja" ? "レビュー" : "Review"}</div>
        <div className="text-[9px]" style={{ color: "var(--tw-text-dim)" }}>
          {reviewItems.length} {l === "ja" ? "件の要レビューノード" : "nodes need review"}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-1 text-[9px]" style={{ color: "var(--tw-text-dim)" }}>
          {l === "ja" ? "未更新日数" : "Stale days"}: {staleDays}
          <span className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>1</span>
          <input
            type="range"
            min="1"
            max="90"
            step="1"
            value={staleDays}
            onChange={(e) => setStaleDays(Number(e.target.value))}
            className="w-24 accent-blue-400"
            aria-label={l === "ja" ? "未更新日数の閾値" : "Stale days threshold"}
          />
          <span className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>90</span>
        </label>
        <div className="text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
          {l === "ja" ? "各ノードに反対意見と問い返しのテンプレートを表示" : "Each node includes counterargument and inquiry templates"}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={() => setFilterCat("all")}
          className="rounded-full px-2 py-0.5 text-[8px] border"
          style={{
            borderColor: filterCat === "all" ? "var(--tw-accent)" : "var(--tw-border)",
            background: filterCat === "all" ? "var(--tw-accent)" : "transparent",
            color: filterCat === "all" ? "#fff" : "var(--tw-text-dim)",
          }}
        >
          {l === "ja" ? "全て" : "All"} ({reviewItems.length})
        </button>
        {(Object.keys(CATEGORY_LABELS) as ReviewCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className="rounded-full px-2 py-0.5 text-[8px] border"
            style={{
              borderColor: filterCat === cat ? CATEGORY_COLORS[cat] : "var(--tw-border)",
              background: filterCat === cat ? CATEGORY_COLORS[cat] + "30" : "transparent",
              color: filterCat === cat ? CATEGORY_COLORS[cat] : "var(--tw-text-dim)",
            }}
          >
            {CATEGORY_LABELS[cat][l]} ({categoryCounts[cat] || 0})
          </button>
        ))}
      </div>

      {/* Review items */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="text-[10px] py-8 text-center" style={{ color: "var(--tw-text-muted)" }}>
            {l === "ja" ? "レビューが必要なノードはありません" : "No nodes need review"}
          </div>
        )}
        {filtered.slice(0, 200).map((item) => (
          <div
            key={`${item.topicId}-${item.node.id}`}
            className="flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer transition-colors hover:border-blue-500/40"
            style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}
            onClick={() => onSelectNode?.(item.topicId, item.node.id)}
          >
            {/* Category badges */}
            <div className="flex shrink-0 gap-0.5">
              {item.categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded px-1 py-0.5 text-[6px]"
                  style={{ background: CATEGORY_COLORS[cat] + "25", color: CATEGORY_COLORS[cat] }}
                  title={CATEGORY_LABELS[cat][l]}
                >
                  {CATEGORY_LABELS[cat][l].slice(0, 2)}
                </span>
              ))}
            </div>

            {/* Node info */}
            <div className="flex-1 min-w-0">
              <div className="text-[9px] truncate" style={{ color: "var(--tw-text)" }}>{item.node.label}</div>
              <div className="text-[7px] truncate" style={{ color: "var(--tw-text-muted)" }}>
                {item.topicTitle} / {item.node.type} / d{item.node.depth ?? 0}
              </div>
              <div className="mt-1 grid grid-cols-1 gap-1 lg:grid-cols-2">
                {item.prompts.counter.length > 0 && (
                  <div className="rounded border border-amber-500/20 bg-amber-500/6 px-1.5 py-1">
                    <div className="mb-0.5 text-[6px] uppercase tracking-wider text-amber-300/70">
                      {l === "ja" ? "反対意見テンプレート" : "Counter Template"}
                    </div>
                    {item.prompts.counter.map((prompt, index) => (
                      <div key={index} className="text-[7px] leading-snug text-white/55">
                        {prompt}
                      </div>
                    ))}
                  </div>
                )}
                {item.prompts.inquiry.length > 0 && (
                  <div className="rounded border border-cyan-500/20 bg-cyan-500/6 px-1.5 py-1">
                    <div className="mb-0.5 text-[6px] uppercase tracking-wider text-cyan-300/70">
                      {l === "ja" ? "問い返しテンプレート" : "Inquiry Template"}
                    </div>
                    {item.prompts.inquiry.map((prompt, index) => (
                      <div key={index} className="text-[7px] leading-snug text-white/55">
                        {prompt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stale indicator */}
            <div className="shrink-0 text-[7px]" style={{ color: item.staleDays >= staleDays ? "#f59e0b" : "var(--tw-text-muted)" }}>
              {item.staleDays}d
            </div>

            {/* Confidence */}
            {item.node.confidence != null && (
              <div
                className="shrink-0 text-[7px]"
                style={{ color: item.node.confidence < 0.3 ? "#ef4444" : "var(--tw-text-dim)" }}
              >
                {(item.node.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
