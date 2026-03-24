import React from "react";
import type { NodeItem } from "../../types";

/**
 * Appears when two nodes are dropped very close together.
 * Offers: merge, link (create edge), compare, or cancel.
 */
export function MergePrompt({
  nodeA,
  nodeB,
  position,
  onMerge,
  onLink,
  onCompare,
  onCancel,
  lang = "ja",
}: {
  nodeA: NodeItem;
  nodeB: NodeItem;
  position: { x: number; y: number };
  onMerge: () => void;
  onLink: () => void;
  onCompare: () => void;
  onCancel: () => void;
  lang?: "ja" | "en";
}) {
  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 1200,
        transform: "translate(-50%, -100%) translateY(-8px)",
      }}
    >
      <div
        style={{
          background: "var(--tw-bg-panel, #1e1e2e)",
          border: "1px solid var(--tw-border, #333)",
          borderRadius: 8,
          padding: "8px 10px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          minWidth: 180,
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 9,
            color: "var(--tw-text-muted, #666)",
            marginBottom: 6,
          }}
        >
          {lang === "ja" ? "ノード重ね置き検出" : "Node overlap detected"}
        </div>

        {/* Node labels */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 8,
            fontSize: 10,
            color: "var(--tw-text, #ccc)",
          }}
        >
          <span
            style={{
              maxWidth: 70,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nodeA.label}
          </span>
          <span style={{ color: "var(--tw-text-dim, #888)" }}>⟷</span>
          <span
            style={{
              maxWidth: 70,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nodeB.label}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <button
            onClick={onMerge}
            style={{
              background: "#4ade8020",
              border: "1px solid #4ade8040",
              borderRadius: 4,
              color: "#4ade80",
              fontSize: 9,
              padding: "3px 8px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {lang === "ja" ? "⊕ 統合する" : "⊕ Merge"}
          </button>
          <button
            onClick={onLink}
            style={{
              background: "#60a5fa20",
              border: "1px solid #60a5fa40",
              borderRadius: 4,
              color: "#60a5fa",
              fontSize: 9,
              padding: "3px 8px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {lang === "ja" ? "⟁ 関係を作成" : "⟁ Create link"}
          </button>
          <button
            onClick={onCompare}
            style={{
              background: "#fbbf2420",
              border: "1px solid #fbbf2440",
              borderRadius: 4,
              color: "#fbbf24",
              fontSize: 9,
              padding: "3px 8px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {lang === "ja" ? "⇔ 比較する" : "⇔ Compare"}
          </button>
          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid var(--tw-border, #333)",
              borderRadius: 4,
              color: "var(--tw-text-dim, #888)",
              fontSize: 9,
              padding: "3px 8px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {lang === "ja" ? "✕ キャンセル" : "✕ Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
