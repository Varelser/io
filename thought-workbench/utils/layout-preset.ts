import type { LayoutPreset, LayoutPresetPurpose } from "../types";

const PURPOSE_ORDER: LayoutPresetPurpose[] = ["edit", "overview", "analyze", "organize"];
export type LayoutPresetQuickFilter = "all" | "pinned" | "recent";

export function inferLayoutPresetPurpose(
  panes: { view: string }[],
  arrangement?: { mode?: string | null } | null,
): LayoutPresetPurpose {
  const views = new Set(panes.map((pane) => pane.view));
  const mode = arrangement?.mode || "";
  if (views.has("stats") || views.has("timeline") || views.has("diff") || views.has("review")) return "analyze";
  if (views.has("workspace") || mode === "pack" || mode === "cluster" || mode.startsWith("lane")) return "organize";
  if (views.has("network") || views.has("folder") || views.has("table")) return "overview";
  return "edit";
}

export function cycleLayoutPresetPurpose(current?: LayoutPresetPurpose): LayoutPresetPurpose {
  const index = current ? PURPOSE_ORDER.indexOf(current) : -1;
  return PURPOSE_ORDER[(Math.max(index, -1) + 1) % PURPOSE_ORDER.length];
}

export function getLayoutPresetPurposeLabel(purpose: LayoutPresetPurpose | undefined, lang: "ja" | "en"): string {
  if (purpose === "overview") return lang === "ja" ? "俯瞰" : "Overview";
  if (purpose === "analyze") return lang === "ja" ? "分析" : "Analyze";
  if (purpose === "organize") return lang === "ja" ? "整理" : "Organize";
  return lang === "ja" ? "編集" : "Edit";
}

export function matchesLayoutPresetPurposeFilter(
  preset: LayoutPreset,
  filter: LayoutPresetPurpose | "all",
) {
  return filter === "all" || (preset.purpose || "edit") === filter;
}

export function matchesLayoutPresetQuickFilter(
  preset: LayoutPreset,
  filter: LayoutPresetQuickFilter,
) {
  if (filter === "pinned") return Boolean(preset.pinned);
  if (filter === "recent") return Boolean(preset.lastUsedAt);
  return true;
}

export function matchesLayoutPresetSearch(
  preset: LayoutPreset,
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    preset.label,
    preset.splitMode,
    preset.purpose || "edit",
    ...(preset.panes || []).map((pane) => pane.view),
    preset.workspaceArrangement?.mode || "",
    preset.workspaceArrangement?.groupBy || "",
  ].join(" ").toLowerCase();
  return haystack.includes(normalized);
}

export function sortLayoutPresets(presets: LayoutPreset[]) {
  return [...presets].sort((a, b) => {
    const pinScore = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinScore !== 0) return pinScore;
    const usedA = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
    const usedB = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
    if (usedA !== usedB) return usedB - usedA;
    return a.label.localeCompare(b.label);
  });
}

export function getRecommendedLayoutPresets(
  presets: LayoutPreset[],
  currentPanes: { view: string }[],
  currentSplitMode: string,
  arrangement?: { mode?: string | null } | null,
  limit = 3,
) {
  const currentPurpose = inferLayoutPresetPurpose(currentPanes, arrangement);
  const currentViews = new Set(currentPanes.map((pane) => pane.view));
  return presets
    .filter((preset) => (preset.purpose || "edit") === currentPurpose)
    .filter((preset) => !(preset.splitMode === currentSplitMode && preset.panes.length === currentPanes.length && preset.panes.every((pane, index) => currentPanes[index]?.view === pane.view)))
    .map((preset) => {
      const overlap = preset.panes.reduce((sum, pane) => sum + (currentViews.has(pane.view) ? 1 : 0), 0);
      const score = overlap + (preset.splitMode === currentSplitMode ? 2 : 0) + (preset.workspaceArrangement?.mode === arrangement?.mode ? 1 : 0);
      return { preset, score };
    })
    .sort((a, b) => b.score - a.score || a.preset.label.localeCompare(b.preset.label))
    .slice(0, limit)
    .map((item) => item.preset);
}

export function compareLayoutPresetState(
  current: {
    splitMode: string;
    panes: { view: string }[];
    purpose: LayoutPresetPurpose;
    workspaceArrangement?: { mode?: string | null; groupBy?: string; topicCount?: number } | null;
    workspaceTopicCount?: number;
  },
  candidate: LayoutPreset,
) {
  const currentArrangementLabel = [current.workspaceArrangement?.mode || "", current.workspaceArrangement?.groupBy || ""].filter(Boolean).join(":");
  const candidateArrangementLabel = [candidate.workspaceArrangement?.mode || "", candidate.workspaceArrangement?.groupBy || ""].filter(Boolean).join(":");
  const currentPaneLabel = current.panes.map((pane) => pane.view).join("|");
  const candidatePaneLabel = candidate.panes.map((pane) => pane.view).join("|");
  const candidateTopicCount = candidate.workspaceSnapshot?.topics?.length || candidate.workspaceArrangement?.topicCount || 0;
  const currentTopicCount = current.workspaceTopicCount || current.workspaceArrangement?.topicCount || 0;

  return {
    splitChanged: current.splitMode !== candidate.splitMode,
    paneChanged: currentPaneLabel !== candidatePaneLabel,
    purposeChanged: current.purpose !== (candidate.purpose || "edit"),
    arrangementChanged: currentArrangementLabel !== candidateArrangementLabel,
    currentTopicCount,
    candidateTopicCount,
    topicDelta: candidateTopicCount - currentTopicCount,
  };
}
