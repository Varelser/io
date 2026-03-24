import React, { useState } from "react";
import type { CanvasBookmark } from "../../types";

export interface BookmarkPanelProps {
  bookmarks: CanvasBookmark[];
  currentTopicId: string | null;
  currentNodeId: string | null;
  currentView: string;
  topics: { id: string; title: string }[];
  onAddBookmark: (label: string) => void;
  onDeleteBookmark: (id: string) => void;
  onNavigate: (bookmark: CanvasBookmark) => void;
  onRenameBookmark?: (id: string, label: string) => void;
  lang?: "ja" | "en";
}

const VIEW_ICONS: Record<string, string> = {
  sphere: "\u25CE",
  workspace: "\u2B21",
  network: "\u27C1",
  mindmap: "\u2325",
  canvas2d: "\u25A7",
  folder: "\u229E",
  depth: "\u25BD",
  journal: "\u2630",
  calendar: "\uD83D\uDCC5",
  stats: "\u25A4",
  task: "\u2611",
  table: "\u229E",
  review: "\u27F3",
  timeline: "\u23E4",
  diff: "\u21D4",
};

export function BookmarkPanel({
  bookmarks,
  currentTopicId,
  currentNodeId,
  currentView,
  topics,
  onAddBookmark,
  onDeleteBookmark,
  onNavigate,
  onRenameBookmark,
  lang = "ja",
}: BookmarkPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const topicMap = new Map(topics.map((t) => [t.id, t.title]));

  const handleAdd = () => {
    if (!currentTopicId) return;
    const topicTitle = topicMap.get(currentTopicId) || "Untitled";
    const label = `${topicTitle} - ${currentView}`;
    onAddBookmark(label);
  };

  const startEdit = (bm: CanvasBookmark) => {
    setEditingId(bm.id);
    setEditLabel(bm.label);
  };

  const commitEdit = (id: string) => {
    if (onRenameBookmark && editLabel.trim()) {
      onRenameBookmark(id, editLabel.trim());
    }
    setEditingId(null);
  };

  return (
    <div>
      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={!currentTopicId}
        style={{
          width: "100%",
          padding: "3px 6px",
          marginBottom: 6,
          fontSize: 9,
          border: "1px solid var(--tw-border, #333)",
          borderRadius: 4,
          background: currentTopicId ? "var(--tw-accent, #f59e0b)20" : "transparent",
          color: currentTopicId ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #555)",
          cursor: currentTopicId ? "pointer" : "not-allowed",
        }}
      >
        + {lang === "ja" ? "ブックマーク追加" : "Add Bookmark"}
      </button>

      {/* Bookmark list */}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {bookmarks.length === 0 && (
          <div style={{ fontSize: 8, textAlign: "center", padding: "8px 0", color: "var(--tw-text-muted, #555)" }}>
            {lang === "ja" ? "ブックマークなし" : "No bookmarks"}
          </div>
        )}
        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 4px",
              marginBottom: 2,
              borderRadius: 3,
              background: "var(--tw-bg-card, #1e1e30)",
              fontSize: 9,
            }}
          >
            {/* View icon */}
            <span
              style={{
                flexShrink: 0,
                width: 14,
                textAlign: "center",
                fontSize: 10,
                color: "var(--tw-accent, #f59e0b)",
              }}
            >
              {VIEW_ICONS[bm.viewType] || "\u25A1"}
            </span>

            {/* Label / edit */}
            <div
              style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
              onClick={() => {
                if (editingId === bm.id) return;
                onNavigate(bm);
              }}
              onDoubleClick={() => startEdit(bm)}
              title={lang === "ja" ? "クリックで移動 / ダブルクリックで名前変更" : "Click to navigate / Double-click to rename"}
            >
              {editingId === bm.id ? (
                <input
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={() => commitEdit(bm.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(bm.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  style={{
                    width: "100%",
                    fontSize: 9,
                    background: "transparent",
                    border: "1px solid var(--tw-accent, #f59e0b)",
                    borderRadius: 2,
                    color: "var(--tw-text, #ccc)",
                    padding: "0 2px",
                    outline: "none",
                  }}
                />
              ) : (
                <>
                  <div style={{ color: "var(--tw-text, #ccc)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {bm.label}
                  </div>
                  <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {topicMap.get(bm.topicId) || bm.topicId}
                  </div>
                </>
              )}
            </div>

            {/* Delete button */}
            <button
              onClick={() => onDeleteBookmark(bm.id)}
              style={{
                flexShrink: 0,
                width: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                border: "none",
                background: "transparent",
                color: "var(--tw-text-muted, #555)",
                cursor: "pointer",
                borderRadius: 2,
              }}
              title={lang === "ja" ? "削除" : "Delete"}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Count */}
      <div style={{ marginTop: 4, fontSize: 7, textAlign: "right", color: "var(--tw-text-muted, #555)" }}>
        {bookmarks.length} {lang === "ja" ? "件" : "bookmarks"}
      </div>
    </div>
  );
}
