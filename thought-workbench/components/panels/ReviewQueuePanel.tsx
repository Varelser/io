import React, { useMemo, useState } from "react";
import type { TopicItem } from "../../types";
import { buildReviewQueue } from "../../utils/review-queue";
import { Select } from "../ui/Select";

interface ReviewQueuePanelProps {
  topics: TopicItem[];
  lang: "ja" | "en";
  onNavigateNode?: (topicId: string, nodeId: string | null) => void;
  onUpdateNode?: (topicId: string, nodeId: string, patch: Record<string, unknown>) => void;
}

const MAX_ITEMS_OPTIONS = [20, 50, 100];

export function ReviewQueuePanel({ topics, lang, onNavigateNode, onUpdateNode }: ReviewQueuePanelProps) {
  const [maxItems, setMaxItems] = useState(50);

  const queue = useMemo(() => buildReviewQueue(topics, maxItems), [topics, maxItems]);

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? `レビューキュー (${queue.length})` : `Review Queue (${queue.length})`}
        </span>
        <Select
          value={maxItems}
          onChange={(e) => setMaxItems(Number(e.target.value))}
          style={{ width: 72 }}
        >
          {MAX_ITEMS_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </Select>
      </div>

      {queue.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "キューが空です" : "Queue is empty"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {queue.map((entry) => (
            <div
              key={`${entry.topicId}:${entry.nodeId}`}
              onClick={() => onNavigateNode?.(entry.topicId, entry.nodeId)}
              style={{
                background: "var(--tw-bg-card)",
                border: "1px solid var(--tw-border)",
                borderRadius: 6,
                padding: "6px 8px",
                cursor: onNavigateNode ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--tw-text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: "center",
                    padding: "1px 6px", borderRadius: 9999,
                    background: entry.score >= 5 ? "#ef444433" : entry.score >= 3 ? "#f9731633" : "#6b728033",
                    color: entry.score >= 5 ? "#ef4444" : entry.score >= 3 ? "#f97316" : "#9ca3af",
                  }}>
                    {entry.score % 1 === 0 ? entry.score : entry.score.toFixed(1)}
                  </span>
                  {onUpdateNode && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdateNode(entry.topicId, entry.nodeId, { reviewState: "reviewed" }); }}
                        title={lang === "ja" ? "レビュー完了" : "Mark reviewed"}
                        style={{ fontSize: 10, padding: "1px 5px", border: "1px solid #22c55e88", borderRadius: 4, background: "#22c55e20", color: "#22c55e", cursor: "pointer" }}
                      >✓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdateNode(entry.topicId, entry.nodeId, { workStatus: "onHold" }); }}
                        title={lang === "ja" ? "保留" : "Hold"}
                        style={{ fontSize: 10, padding: "1px 5px", border: "1px solid #6b728088", borderRadius: 4, background: "#6b728020", color: "#9ca3af", cursor: "pointer" }}
                      >≡</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "var(--tw-text-muted)" }}>
                {entry.topicTitle} · {entry.reasons.join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
