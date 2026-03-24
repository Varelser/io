import React, { useState, useMemo } from "react";
import type { TopicItem, TopicLinkItem, NodeItem } from "../../types";

export interface IntegrityPanelProps {
  topics: TopicItem[];
  topicLinks: TopicLinkItem[];
  onSelectNode: (topicId: string, nodeId: string) => void;
  onRemoveBrokenEdges?: () => void;
  lang?: "ja" | "en";
}

type WarningCategory = "all" | "duplicate" | "orphan" | "broken" | "empty" | "urldup" | "similar";

type Warning = {
  category: WarningCategory;
  severity: "error" | "warn" | "info";
  description: string;
  topicId?: string;
  topicTitle?: string;
  nodeId?: string;
};

const CATEGORY_LABELS: Record<WarningCategory, { ja: string; en: string }> = {
  all: { ja: "All", en: "All" },
  duplicate: { ja: "重複名", en: "Duplicates" },
  orphan: { ja: "孤立", en: "Orphans" },
  broken: { ja: "参照切れ", en: "Broken Refs" },
  empty: { ja: "空トピック", en: "Empty" },
  urldup: { ja: "URL重複", en: "URL Dups" },
  similar: { ja: "類似名", en: "Similar" },
};

const SEVERITY_COLORS: Record<string, string> = {
  error: "#ef4444",
  warn: "#f59e0b",
  info: "#60a5fa",
};

const SEVERITY_ICONS: Record<string, string> = {
  error: "\u26D4",
  warn: "\u26A0",
  info: "\u2139",
};

function isSimilar(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return true;
  if (la.startsWith(lb) || lb.startsWith(la)) return true;
  if (Math.abs(la.length - lb.length) <= 2 && la.length >= 3) {
    let diff = 0;
    const shorter = la.length < lb.length ? la : lb;
    const longer = la.length < lb.length ? lb : la;
    for (let i = 0; i < shorter.length; i++) {
      if (shorter[i] !== longer[i]) diff++;
    }
    diff += longer.length - shorter.length;
    return diff <= 2;
  }
  return false;
}

function detectWarnings(topics: TopicItem[], topicLinks: TopicLinkItem[]): Warning[] {
  const warnings: Warning[] = [];

  // Collect all nodes with their topic context
  const allNodes: { node: NodeItem; topicId: string; topicTitle: string }[] = [];
  for (const topic of topics) {
    for (const node of topic.nodes) {
      allNodes.push({ node, topicId: topic.id, topicTitle: topic.title });
    }
  }

  // 1. Duplicate names
  const labelMap = new Map<string, { node: NodeItem; topicId: string; topicTitle: string }[]>();
  for (const entry of allNodes) {
    const key = entry.node.label.toLowerCase();
    if (!labelMap.has(key)) labelMap.set(key, []);
    labelMap.get(key)!.push(entry);
  }
  for (const [, entries] of labelMap) {
    if (entries.length > 1) {
      const topicNames = [...new Set(entries.map((e) => e.topicTitle))].join(", ");
      warnings.push({
        category: "duplicate",
        severity: "warn",
        description: `"${entries[0].node.label}" x${entries.length} (${topicNames})`,
        topicId: entries[0].topicId,
        nodeId: entries[0].node.id,
        topicTitle: entries[0].topicTitle,
      });
    }
  }

  // 2. Orphan nodes
  for (const topic of topics) {
    const connectedIds = new Set<string>();
    for (const edge of topic.edges) {
      connectedIds.add(edge.from);
      connectedIds.add(edge.to);
    }
    for (const node of topic.nodes) {
      if (!connectedIds.has(node.id)) {
        warnings.push({
          category: "orphan",
          severity: "info",
          description: `"${node.label}" (${topic.title})`,
          topicId: topic.id,
          nodeId: node.id,
          topicTitle: topic.title,
        });
      }
    }
  }

  // 3. Broken references
  for (const topic of topics) {
    const nodeIds = new Set(topic.nodes.map((n) => n.id));
    for (const edge of topic.edges) {
      if (!nodeIds.has(edge.from)) {
        warnings.push({
          category: "broken",
          severity: "error",
          description: `Edge "${edge.id}": from "${edge.from}" not found (${topic.title})`,
          topicId: topic.id,
          topicTitle: topic.title,
        });
      }
      if (!nodeIds.has(edge.to)) {
        warnings.push({
          category: "broken",
          severity: "error",
          description: `Edge "${edge.id}": to "${edge.to}" not found (${topic.title})`,
          topicId: topic.id,
          topicTitle: topic.title,
        });
      }
    }
  }

  // 4. Empty topics
  for (const topic of topics) {
    if (topic.nodes.length === 0) {
      warnings.push({
        category: "empty",
        severity: "info",
        description: `"${topic.title}"`,
        topicId: topic.id,
        topicTitle: topic.title,
      });
    }
  }

  // 5. URL duplicates
  const urlMap = new Map<string, { node: NodeItem; topicId: string; topicTitle: string }[]>();
  for (const entry of allNodes) {
    for (const url of entry.node.linkedUrls ?? []) {
      const key = url.toLowerCase();
      if (!urlMap.has(key)) urlMap.set(key, []);
      urlMap.get(key)!.push(entry);
    }
  }
  for (const [url, entries] of urlMap) {
    if (entries.length > 1) {
      warnings.push({
        category: "urldup",
        severity: "warn",
        description: `URL "${url.slice(0, 60)}..." x${entries.length}`,
        topicId: entries[0].topicId,
        nodeId: entries[0].node.id,
        topicTitle: entries[0].topicTitle,
      });
    }
  }

  // 6. Similar names
  const checked = new Set<string>();
  for (let i = 0; i < allNodes.length && warnings.length < 200; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const a = allNodes[i];
      const b = allNodes[j];
      const pairKey = [a.node.id, b.node.id].sort().join(":");
      if (checked.has(pairKey)) continue;
      checked.add(pairKey);
      // Skip exact duplicates (already caught above)
      if (a.node.label.toLowerCase() === b.node.label.toLowerCase()) continue;
      if (isSimilar(a.node.label, b.node.label)) {
        warnings.push({
          category: "similar",
          severity: "info",
          description: `"${a.node.label}" ~ "${b.node.label}"`,
          topicId: a.topicId,
          nodeId: a.node.id,
          topicTitle: a.topicTitle,
        });
      }
    }
  }

  return warnings;
}

export function IntegrityPanel({ topics, topicLinks, onSelectNode, onRemoveBrokenEdges, lang = "ja" }: IntegrityPanelProps) {
  const [activeCategory, setActiveCategory] = useState<WarningCategory>("all");

  const allWarnings = useMemo(() => detectWarnings(topics, topicLinks), [topics, topicLinks]);

  const categoryCounts = useMemo(() => {
    const counts: Record<WarningCategory, number> = {
      all: allWarnings.length,
      duplicate: 0,
      orphan: 0,
      broken: 0,
      empty: 0,
      urldup: 0,
      similar: 0,
    };
    for (const w of allWarnings) {
      if (w.category !== "all") counts[w.category]++;
    }
    return counts;
  }, [allWarnings]);

  const filtered = useMemo(() => {
    const list = activeCategory === "all" ? allWarnings : allWarnings.filter((w) => w.category === activeCategory);
    return list.slice(0, 100);
  }, [allWarnings, activeCategory]);

  const categories: WarningCategory[] = ["all", "duplicate", "orphan", "broken", "empty", "urldup", "similar"];

  return (
    <div>
      {/* Category tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 6 }}>
        {categories.map((cat) => {
          const count = categoryCounts[cat];
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                fontSize: 8,
                padding: "1px 5px",
                border: "1px solid",
                borderColor: isActive ? "var(--tw-accent, #f59e0b)" : "var(--tw-border, #333)",
                borderRadius: 8,
                background: isActive ? "var(--tw-accent, #f59e0b)20" : "transparent",
                color: isActive ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #555)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {lang === "ja" ? CATEGORY_LABELS[cat].ja : CATEGORY_LABELS[cat].en}
              {count > 0 && (
                <span style={{ marginLeft: 2, fontSize: 7 }}>({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Repair actions */}
      {activeCategory === "broken" && onRemoveBrokenEdges && categoryCounts.broken > 0 && (
        <button
          onClick={onRemoveBrokenEdges}
          style={{
            width: "100%",
            marginBottom: 6,
            padding: "3px 8px",
            fontSize: 9,
            border: "1px solid #ef4444aa",
            borderRadius: 4,
            background: "#ef444420",
            color: "#ef4444",
            cursor: "pointer",
          }}
        >
          {lang === "ja"
            ? `参照切れエッジを全削除 (${categoryCounts.broken}件)`
            : `Remove all broken edges (${categoryCounts.broken})`}
        </button>
      )}

      {/* Warning list */}
      <div style={{ maxHeight: 350, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <div style={{ fontSize: 8, textAlign: "center", padding: "12px 0", color: "var(--tw-text-muted, #555)" }}>
            {lang === "ja" ? "問題なし" : "No issues"}
          </div>
        )}
        {filtered.map((w, i) => (
          <div
            key={`${w.category}-${i}`}
            onClick={() => {
              if (w.topicId && w.nodeId) onSelectNode(w.topicId, w.nodeId);
            }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 4,
              padding: "2px 4px",
              marginBottom: 1,
              borderRadius: 3,
              background: "var(--tw-bg-card, #1e1e30)",
              fontSize: 9,
              cursor: w.nodeId ? "pointer" : "default",
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 12,
                textAlign: "center",
                fontSize: 8,
                color: SEVERITY_COLORS[w.severity],
              }}
            >
              {SEVERITY_ICONS[w.severity]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "var(--tw-text, #ccc)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {w.description}
              </div>
              {w.topicTitle && (
                <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>{w.topicTitle}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ marginTop: 4, fontSize: 7, textAlign: "right", color: "var(--tw-text-muted, #555)" }}>
        {filtered.length}
        {allWarnings.length > 100 ? ` / ${allWarnings.length}` : ""}{" "}
        {lang === "ja" ? "件" : "warnings"}
      </div>
    </div>
  );
}
