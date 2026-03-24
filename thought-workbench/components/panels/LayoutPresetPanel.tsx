import React, { useState } from "react";
import type { LayoutPreset, LayoutPresetPurpose } from "../../types";
import { compareLayoutPresetState, cycleLayoutPresetPurpose, getLayoutPresetPurposeLabel, getRecommendedLayoutPresets, inferLayoutPresetPurpose, matchesLayoutPresetPurposeFilter, matchesLayoutPresetQuickFilter, matchesLayoutPresetSearch, sortLayoutPresets } from "../../utils/layout-preset";

export interface LayoutPresetPanelProps {
  presets: LayoutPreset[];
  currentPrimaryView: string;
  currentSplitMode: string;
  currentPanes: { view: string }[];
  currentArrangement?: { mode?: string | null; groupBy?: string; topicCount?: number } | null;
  currentWorkspaceTopicCount: number;
  recentLayoutTransition?: { previous: LayoutPreset; applied: LayoutPreset } | null;
  onSavePreset: (label: string) => void;
  onDeletePreset: (id: string) => void;
  onRenamePreset?: (id: string, label: string) => void;
  onCyclePurpose?: (id: string, purpose: LayoutPresetPurpose) => void;
  onTogglePinned?: (id: string) => void;
  onApplyPreset: (preset: LayoutPreset) => void;
  onRevertRecentLayout?: () => void;
  lang?: "ja" | "en";
}

const SPLIT_ICONS: Record<string, string> = {
  single: "\u25A3",
  "vertical-2": "\u25A5",
  "horizontal-2": "\u25A4",
  triple: "\u229E",
  quad: "\u25A6",
};

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
  maintenance: "\u2699",
};

const BUILTIN_IDS = new Set(["builtin-focus", "builtin-edit-ref", "builtin-edit-network-list", "builtin-research", "builtin-design", "builtin-time-observe", "builtin-compare-dense"]);

function formatWorkspaceArrangement(
  preset: { workspaceArrangement?: { mode?: string | null; groupBy?: string; topicCount?: number } | null },
  lang: "ja" | "en",
) {
  const arrangement = preset.workspaceArrangement;
  if (!arrangement?.mode) return "";
  const mode = arrangement.mode
    .replace("align-", "align ")
    .replace("distribute-", "dist ")
    .replace("lane-", "lane ")
    .replace("-", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
  const groupBy = arrangement.groupBy
    ? arrangement.groupBy
      .replace("para-category", "PARA")
      .replace("must-one", "Must One")
      .replace("method", "Method")
      .replace("folder", "Folder")
    : "";
  const count = arrangement.topicCount ? `${arrangement.topicCount}${lang === "ja" ? "件" : "t"}` : "";
  return [mode, groupBy, count].filter(Boolean).join(" / ");
}

function formatSplitLabel(splitMode: string) {
  return SPLIT_ICONS[splitMode] || splitMode;
}

function getBuiltinPresets(lang: "ja" | "en"): LayoutPreset[] {
  return [
    {
      id: "builtin-focus",
      label: lang === "ja" ? "\u96C6\u4E2D\u7DE8\u96C6" : "Focus",
      splitMode: "single",
      panes: [{ view: "sphere" }],
      purpose: "edit",
    },
    {
      id: "builtin-edit-ref",
      label: lang === "ja" ? "\u7DE8\u96C6+\u53C2\u7167" : "Edit+Ref",
      splitMode: "vertical-2",
      panes: [{ view: "sphere" }, { view: "table" }],
      purpose: "edit",
    },
    {
      id: "builtin-research",
      label: lang === "ja" ? "\u7814\u7A76\u89B3\u6E2C" : "Research",
      splitMode: "quad",
      panes: [{ view: "journal" }, { view: "network" }, { view: "stats" }, { view: "table" }],
      purpose: "analyze",
    },
    {
      id: "builtin-edit-network-list",
      label: lang === "ja" ? "\u7DE8\u96C6+\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF+\u4E00\u89A7" : "Edit+Network+List",
      splitMode: "triple",
      panes: [{ view: "sphere" }, { view: "network" }, { view: "table" }],
      purpose: "overview",
    },
    {
      id: "builtin-design",
      label: lang === "ja" ? "\u5236\u4F5C\u8A2D\u8A08" : "Design",
      splitMode: "quad",
      panes: [{ view: "sphere" }, { view: "mindmap" }, { view: "table" }, { view: "task" }],
      purpose: "edit",
    },
    {
      id: "builtin-time-observe",
      label: lang === "ja" ? "\u6642\u9593\u89B3\u6E2C" : "Time Observe",
      splitMode: "quad",
      panes: [{ view: "journal" }, { view: "diff" }, { view: "stats" }, { view: "timeline" }],
      purpose: "analyze",
    },
    {
      id: "builtin-compare-dense",
      label: lang === "ja" ? "\u9AD8\u5BC6\u5EA6\u6BD4\u8F03" : "Dense Compare",
      splitMode: "quad",
      panes: [
        { view: "sphere", syncMode: "global" },
        { view: "network", syncMode: "isolated" },
        { view: "table", syncMode: "isolated" },
        { view: "diff", syncMode: "isolated" },
      ],
      purpose: "overview",
    },
  ];
}

export function LayoutPresetPanel({
  presets,
  currentPrimaryView,
  currentSplitMode,
  currentPanes,
  currentArrangement,
  currentWorkspaceTopicCount,
  recentLayoutTransition,
  onSavePreset,
  onDeletePreset,
  onRenamePreset,
  onCyclePurpose,
  onTogglePinned,
  onApplyPreset,
  onRevertRecentLayout,
  lang = "ja",
}: LayoutPresetPanelProps) {
  const [purposeFilter, setPurposeFilter] = useState<LayoutPresetPurpose | "all">("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "pinned" | "recent">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [comparePresetId, setComparePresetId] = useState<string>("");
  const [editingPresetId, setEditingPresetId] = useState<string>("");
  const [editingPresetLabel, setEditingPresetLabel] = useState("");
  const builtins = getBuiltinPresets(lang);
  const effectiveCurrentPanes = currentSplitMode === "single" ? [{ view: currentPrimaryView }] : currentPanes;
  const currentPurpose = inferLayoutPresetPurpose(effectiveCurrentPanes, currentArrangement);
  const basePresets = [...builtins, ...presets.filter((p) => !BUILTIN_IDS.has(p.id))];
  const recommendedPresets = getRecommendedLayoutPresets(basePresets, effectiveCurrentPanes, currentSplitMode, currentArrangement);
  const allPresets = sortLayoutPresets(basePresets
    .filter((preset) => matchesLayoutPresetPurposeFilter(preset, purposeFilter))
    .filter((preset) => matchesLayoutPresetQuickFilter(preset, quickFilter))
    .filter((preset) => matchesLayoutPresetSearch(preset, searchQuery)));
  const comparePreset = allPresets.find((preset) => preset.id === comparePresetId) || null;
  const hasActiveFilters = quickFilter !== "all" || purposeFilter !== "all" || searchQuery.trim().length > 0;
  const compareState = comparePreset ? compareLayoutPresetState({
    splitMode: currentSplitMode,
    panes: effectiveCurrentPanes,
    purpose: currentPurpose,
    workspaceArrangement: currentArrangement,
    workspaceTopicCount: currentWorkspaceTopicCount,
  }, comparePreset) : null;

  const handleSave = () => {
    const label = lang === "ja"
      ? `\u30AB\u30B9\u30BF\u30E0 ${presets.length + 1}`
      : `Custom ${presets.length + 1}`;
    onSavePreset(label);
  };

  const panesLabel = (panes: { view: string }[]): string => {
    return panes.map((p) => `${VIEW_ICONS[p.view] || p.view}${(p as { syncMode?: string }).syncMode === "isolated" ? "*" : ""}`).join(" ");
  };

  const startRename = (preset: LayoutPreset) => {
    setEditingPresetId(preset.id);
    setEditingPresetLabel(preset.label);
  };

  const commitRename = () => {
    if (!editingPresetId || !onRenamePreset) {
      setEditingPresetId("");
      setEditingPresetLabel("");
      return;
    }
    onRenamePreset(editingPresetId, editingPresetLabel);
    setEditingPresetId("");
    setEditingPresetLabel("");
  };

  return (
    <div>
      {/* Save current button */}
      <button
        onClick={handleSave}
        style={{
          width: "100%",
          padding: "3px 6px",
          marginBottom: 6,
          fontSize: 9,
          border: "1px solid var(--tw-border, #333)",
          borderRadius: 4,
          background: "var(--tw-accent, #f59e0b)20",
          color: "var(--tw-accent, #f59e0b)",
          cursor: "pointer",
        }}
      >
        + {lang === "ja" ? "\u73FE\u5728\u306E\u30EC\u30A4\u30A2\u30A6\u30C8\u3092\u4FDD\u5B58" : "Save Current Layout"}
      </button>

      {/* Current layout info */}
      <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", marginBottom: 6, padding: "0 2px" }}>
        {lang === "ja" ? "\u73FE\u5728" : "Current"}: {SPLIT_ICONS[currentSplitMode] || currentSplitMode} {panesLabel(effectiveCurrentPanes)}
      </div>

      <div style={{ marginBottom: 6 }}>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={lang === "ja" ? "preset 名 / mode / view で検索" : "Search by preset / mode / view"}
          style={{
            width: "100%",
            marginBottom: 4,
            padding: "3px 6px",
            fontSize: 9,
            border: "1px solid var(--tw-border, #333)",
            borderRadius: 4,
            background: "var(--tw-bg-card, #1e1e30)",
            color: "var(--tw-text, #ccc)",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
          {([
            { id: "all", label: lang === "ja" ? "全部" : "All" },
            { id: "pinned", label: lang === "ja" ? "固定" : "Pinned" },
            { id: "recent", label: lang === "ja" ? "最近" : "Recent" },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setQuickFilter(item.id)}
              style={{
                padding: "2px 6px",
                fontSize: 8,
                border: "1px solid var(--tw-border, #333)",
                borderRadius: 999,
                background: quickFilter === item.id ? "var(--tw-accent, #f59e0b)12" : "transparent",
                color: quickFilter === item.id ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          value={purposeFilter}
          onChange={(event) => setPurposeFilter(event.target.value as LayoutPresetPurpose | "all")}
          style={{
            width: "100%",
            padding: "3px 6px",
            fontSize: 9,
            border: "1px solid var(--tw-border, #333)",
            borderRadius: 4,
            background: "var(--tw-bg-card, #1e1e30)",
            color: "var(--tw-text, #ccc)",
          }}
        >
          <option value="all">{lang === "ja" ? "用途: すべて" : "Purpose: All"}</option>
          <option value="edit">{lang === "ja" ? "用途: 編集" : "Purpose: Edit"}</option>
          <option value="overview">{lang === "ja" ? "用途: 俯瞰" : "Purpose: Overview"}</option>
          <option value="analyze">{lang === "ja" ? "用途: 分析" : "Purpose: Analyze"}</option>
          <option value="organize">{lang === "ja" ? "用途: 整理" : "Purpose: Organize"}</option>
        </select>
        <div style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
            {allPresets.length} {lang === "ja" ? "件ヒット" : "matches"}
          </div>
          {hasActiveFilters ? (
            <button
              onClick={() => {
                setQuickFilter("all");
                setPurposeFilter("all");
                setSearchQuery("");
              }}
              style={{
                padding: "2px 6px",
                fontSize: 8,
                border: "1px solid var(--tw-border, #333)",
                borderRadius: 999,
                background: "transparent",
                color: "var(--tw-text-dim, #888)",
                cursor: "pointer",
              }}
            >
              {lang === "ja" ? "絞込解除" : "Clear"}
            </button>
          ) : null}
        </div>
      </div>

      {recommendedPresets.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ marginBottom: 4, fontSize: 7, color: "var(--tw-accent, #f59e0b)" }}>
            {lang === "ja" ? "おすすめ preset" : "Recommended presets"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {recommendedPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                style={{
                  padding: "2px 6px",
                  fontSize: 8,
                  border: "1px solid var(--tw-border, #333)",
                  borderRadius: 999,
                  background: "var(--tw-accent, #f59e0b)12",
                  color: "var(--tw-accent, #f59e0b)",
                  cursor: "pointer",
                }}
                title={preset.label}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {comparePreset && (
        <div
          style={{
            marginBottom: 6,
            padding: "6px",
            border: "1px solid var(--tw-border, #333)",
            borderRadius: 6,
            background: "var(--tw-bg-card, #1e1e30)",
          }}
        >
          <div style={{ marginBottom: 4, fontSize: 7, color: "var(--tw-accent, #f59e0b)" }}>
            {lang === "ja" ? "比較 preview" : "Compare preview"}
          </div>
          <div style={{ display: "grid", gap: 4, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                {lang === "ja" ? "現在" : "Current"}
              </div>
              <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)" }}>
                {formatSplitLabel(currentSplitMode)} {panesLabel(effectiveCurrentPanes)}
              </div>
              <div style={{ fontSize: 7, color: "var(--tw-accent, #f59e0b)" }}>
                {getLayoutPresetPurposeLabel(currentPurpose, lang)}
              </div>
              {currentArrangement?.mode ? (
                <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                  {formatWorkspaceArrangement({ workspaceArrangement: currentArrangement }, lang)}
                </div>
              ) : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                {lang === "ja" ? "候補" : "Candidate"}
              </div>
              <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)" }}>
                {comparePreset.label}
              </div>
              <div style={{ fontSize: 8, color: compareState?.splitChanged || compareState?.paneChanged ? "var(--tw-accent, #f59e0b)" : "var(--tw-text, #ccc)" }}>
                {formatSplitLabel(comparePreset.splitMode)} {panesLabel(comparePreset.panes)}
              </div>
              <div style={{ fontSize: 7, color: compareState?.purposeChanged ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #555)" }}>
                {getLayoutPresetPurposeLabel(comparePreset.purpose, lang)}
              </div>
              {comparePreset.workspaceArrangement ? (
                <div style={{ fontSize: 7, color: compareState?.arrangementChanged ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #555)" }}>
                  {formatWorkspaceArrangement(comparePreset, lang)}
                </div>
              ) : null}
              <div style={{ fontSize: 7, color: compareState?.topicDelta ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #555)" }}>
                {lang === "ja" ? "topics" : "topics"}: {compareState?.currentTopicCount || currentWorkspaceTopicCount} → {compareState?.candidateTopicCount || 0}
                {compareState?.topicDelta
                  ? ` (${compareState.topicDelta > 0 ? "+" : ""}${compareState.topicDelta})`
                  : ""}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 5, display: "flex", gap: 4 }}>
            <button
              onClick={() => onApplyPreset(comparePreset)}
              style={{
                padding: "2px 6px",
                fontSize: 8,
                border: "1px solid var(--tw-border, #333)",
                borderRadius: 999,
                background: "var(--tw-accent, #f59e0b)12",
                color: "var(--tw-accent, #f59e0b)",
                cursor: "pointer",
              }}
            >
              {lang === "ja" ? "この preset を適用" : "Apply this preset"}
            </button>
            <button
              onClick={() => setComparePresetId("")}
              style={{
                padding: "2px 6px",
                fontSize: 8,
                border: "1px solid var(--tw-border, #333)",
                borderRadius: 999,
                background: "transparent",
                color: "var(--tw-text-dim, #888)",
                cursor: "pointer",
              }}
            >
              {lang === "ja" ? "閉じる" : "Close"}
            </button>
          </div>
        </div>
      )}

      {recentLayoutTransition && onRevertRecentLayout && (
        <div
          style={{
            marginBottom: 6,
            padding: "6px",
            border: "1px solid var(--tw-border, #333)",
            borderRadius: 6,
            background: "var(--tw-bg-card, #1e1e30)",
          }}
        >
          <div style={{ marginBottom: 4, fontSize: 7, color: "var(--tw-accent, #f59e0b)" }}>
            {lang === "ja" ? "直前の適用" : "Last applied"}
          </div>
          <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)" }}>
            {recentLayoutTransition.previous.label} → {recentLayoutTransition.applied.label}
          </div>
          <div style={{ marginTop: 2, fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
            {recentLayoutTransition.previous.splitMode} → {recentLayoutTransition.applied.splitMode}
            {" / "}
            {panesLabel(recentLayoutTransition.previous.panes)} → {panesLabel(recentLayoutTransition.applied.panes)}
          </div>
          {(recentLayoutTransition.previous.workspaceArrangement?.mode || recentLayoutTransition.applied.workspaceArrangement?.mode) && (
            <div style={{ marginTop: 2, fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
              {(recentLayoutTransition.previous.workspaceArrangement?.mode || "none")} → {(recentLayoutTransition.applied.workspaceArrangement?.mode || "none")}
            </div>
          )}
          <button
            onClick={onRevertRecentLayout}
            style={{
              marginTop: 5,
              padding: "2px 6px",
              fontSize: 8,
              border: "1px solid var(--tw-border, #333)",
              borderRadius: 999,
              background: "transparent",
              color: "var(--tw-accent, #f59e0b)",
              cursor: "pointer",
            }}
          >
            {lang === "ja" ? "戻る" : "Back"}
          </button>
        </div>
      )}

      {/* Preset list */}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {allPresets.length === 0 ? (
          <div style={{ fontSize: 8, textAlign: "center", padding: "8px 0", color: "var(--tw-text-muted, #555)" }}>
            {lang === "ja" ? "一致する preset がありません" : "No matching presets"}
          </div>
        ) : null}
        {allPresets.map((preset) => {
          const isBuiltin = BUILTIN_IDS.has(preset.id);
          const isActive = preset.splitMode === currentSplitMode
            && preset.panes.length === effectiveCurrentPanes.length
            && preset.panes.every((p, i) => effectiveCurrentPanes[i]?.view === p.view);

          return (
            <div
              key={preset.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 4px",
                marginBottom: 2,
                borderRadius: 3,
                background: isActive ? "var(--tw-accent, #f59e0b)15" : "var(--tw-bg-card, #1e1e30)",
                border: isActive ? "1px solid var(--tw-accent, #f59e0b)40" : "1px solid transparent",
                fontSize: 9,
              }}
            >
              {/* Split mode icon */}
              <span
                style={{
                  flexShrink: 0,
                  width: 14,
                  textAlign: "center",
                  fontSize: 11,
                  color: isBuiltin ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
                }}
              >
                {SPLIT_ICONS[preset.splitMode] || "\u25A1"}
              </span>

              {/* Label + panes summary */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: "var(--tw-text, #ccc)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                onDoubleClick={() => !isBuiltin && startRename(preset)}
                >
                  {!isBuiltin && editingPresetId === preset.id ? (
                    <input
                      autoFocus
                      value={editingPresetLabel}
                      onChange={(event) => setEditingPresetLabel(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") {
                          setEditingPresetId("");
                          setEditingPresetLabel("");
                        }
                      }}
                      style={{
                        width: "100%",
                        fontSize: 9,
                        background: "transparent",
                        border: "1px solid var(--tw-accent, #f59e0b)",
                        borderRadius: 3,
                        color: "var(--tw-text, #ccc)",
                        padding: "0 4px",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <>
                      {preset.label}
                    </>
                  )}
                  {!isBuiltin && preset.pinned ? (
                    <span style={{ fontSize: 7, marginLeft: 3, color: "var(--tw-accent, #f59e0b)" }}>
                      {lang === "ja" ? "固定" : "Pinned"}
                    </span>
                  ) : null}
                  {isBuiltin && (
                    <span style={{ fontSize: 7, marginLeft: 3, color: "var(--tw-text-muted, #555)" }}>
                      {lang === "ja" ? "組込" : "built-in"}
                    </span>
                  )}
                  {!isBuiltin && preset.workspaceSnapshot && (
                    <span style={{ fontSize: 7, marginLeft: 3, color: "var(--tw-accent, #f59e0b)" }}>
                      {lang === "ja" ? "map" : "map"}
                    </span>
                  )}
                  <span style={{ fontSize: 7, marginLeft: 4, color: "var(--tw-accent, #f59e0b)" }}>
                    {getLayoutPresetPurposeLabel(preset.purpose, lang)}
                  </span>
                </div>
                <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                  {panesLabel(preset.panes)}
                  {preset.workspaceSnapshot?.topics?.length ? ` / ${preset.workspaceSnapshot.topics.length} topics` : ""}
                </div>
                {!isBuiltin && preset.workspaceArrangement && (
                  <div style={{ fontSize: 7, color: "var(--tw-accent, #f59e0b)" }}>
                    {formatWorkspaceArrangement(preset, lang)}
                  </div>
                )}
              </div>

              {!isBuiltin && onTogglePinned ? (
                <button
                  onClick={() => onTogglePinned(preset.id)}
                  style={{
                    flexShrink: 0,
                    padding: "1px 4px",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: preset.pinned ? "var(--tw-accent, #f59e0b)12" : "transparent",
                    color: preset.pinned ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
                    cursor: "pointer",
                  }}
                  title={lang === "ja" ? "固定/解除" : "Pin or unpin"}
                >
                  {lang === "ja" ? "固定" : "Pin"}
                </button>
              ) : null}

              {!isBuiltin && onCyclePurpose ? (
                <button
                  onClick={() => onCyclePurpose(preset.id, cycleLayoutPresetPurpose(preset.purpose))}
                  style={{
                    flexShrink: 0,
                    padding: "1px 4px",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "var(--tw-text-dim, #888)",
                    cursor: "pointer",
                  }}
                  title={lang === "ja" ? "用途タグを変更" : "Change purpose"}
                >
                  {lang === "ja" ? "用途" : "Tag"}
                </button>
              ) : null}

              <button
                onClick={() => setComparePresetId((prev) => prev === preset.id ? "" : preset.id)}
                style={{
                  flexShrink: 0,
                  padding: "1px 4px",
                  fontSize: 8,
                  border: "1px solid var(--tw-border, #333)",
                  borderRadius: 3,
                  background: comparePresetId === preset.id ? "var(--tw-accent, #f59e0b)12" : "transparent",
                  color: comparePresetId === preset.id ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
                  cursor: "pointer",
                }}
                title={lang === "ja" ? "現在と比較" : "Compare with current"}
              >
                {lang === "ja" ? "比較" : "Compare"}
              </button>

              {/* Apply button */}
              <button
                onClick={() => onApplyPreset(preset)}
                style={{
                  flexShrink: 0,
                  padding: "1px 4px",
                  fontSize: 8,
                  border: "1px solid var(--tw-border, #333)",
                  borderRadius: 3,
                  background: "transparent",
                  color: "var(--tw-text-dim, #888)",
                  cursor: "pointer",
                }}
                title={lang === "ja" ? "\u9069\u7528" : "Apply"}
              >
                {lang === "ja" ? "\u9069\u7528" : "Apply"}
              </button>

              {/* Delete button (only custom) */}
              {!isBuiltin && (
                <button
                  onClick={() => onDeletePreset(preset.id)}
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
                  title={lang === "ja" ? "\u524A\u9664" : "Delete"}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Count */}
      <div style={{ marginTop: 4, fontSize: 7, textAlign: "right", color: "var(--tw-text-muted, #555)" }}>
        {allPresets.length} {lang === "ja" ? "\u30D7\u30EA\u30BB\u30C3\u30C8" : "presets"}
      </div>
    </div>
  );
}
