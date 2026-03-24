import { describe, expect, it } from "vitest";
import type { LayoutPreset } from "../types";
import { compareLayoutPresetState, cycleLayoutPresetPurpose, getLayoutPresetPurposeLabel, getRecommendedLayoutPresets, inferLayoutPresetPurpose, matchesLayoutPresetPurposeFilter, matchesLayoutPresetQuickFilter, matchesLayoutPresetSearch, sortLayoutPresets } from "./layout-preset";

describe("layout-preset", () => {
  it("pane 構成から用途を推定する", () => {
    expect(inferLayoutPresetPurpose([{ view: "sphere" }, { view: "table" }], null)).toBe("overview");
    expect(inferLayoutPresetPurpose([{ view: "journal" }, { view: "stats" }], null)).toBe("analyze");
    expect(inferLayoutPresetPurpose([{ view: "workspace" }], { mode: "cluster" })).toBe("organize");
    expect(inferLayoutPresetPurpose([{ view: "sphere" }], null)).toBe("edit");
  });

  it("用途タグを巡回できる", () => {
    expect(cycleLayoutPresetPurpose("edit")).toBe("overview");
    expect(cycleLayoutPresetPurpose("overview")).toBe("analyze");
    expect(cycleLayoutPresetPurpose("analyze")).toBe("organize");
    expect(cycleLayoutPresetPurpose("organize")).toBe("edit");
  });

  it("用途ラベルと filter 判定を返す", () => {
    expect(getLayoutPresetPurposeLabel("organize", "ja")).toBe("整理");
    expect(matchesLayoutPresetPurposeFilter({ id: "x", label: "x", splitMode: "single", panes: [], purpose: "analyze" }, "analyze")).toBe(true);
    expect(matchesLayoutPresetPurposeFilter({ id: "x", label: "x", splitMode: "single", panes: [], purpose: "analyze" }, "overview")).toBe(false);
    expect(matchesLayoutPresetQuickFilter({ id: "x", label: "x", splitMode: "single", panes: [], pinned: true }, "pinned")).toBe(true);
    expect(matchesLayoutPresetQuickFilter({ id: "x", label: "x", splitMode: "single", panes: [], lastUsedAt: "2026-03-21T00:00:00.000Z" }, "recent")).toBe(true);
    expect(matchesLayoutPresetQuickFilter({ id: "x", label: "x", splitMode: "single", panes: [] }, "recent")).toBe(false);
    expect(matchesLayoutPresetSearch({ id: "x", label: "Research Board", splitMode: "quad", panes: [{ view: "stats" }], purpose: "analyze" }, "research")).toBe(true);
    expect(matchesLayoutPresetSearch({ id: "x", label: "Research Board", splitMode: "quad", panes: [{ view: "stats" }], purpose: "analyze", workspaceArrangement: { mode: "cluster", groupBy: "folder" } }, "cluster")).toBe(true);
    expect(matchesLayoutPresetSearch({ id: "x", label: "Research Board", splitMode: "quad", panes: [{ view: "stats" }], purpose: "analyze" }, "mindmap")).toBe(false);
  });

  it("現在の構成からおすすめ preset を返す", () => {
    const presets: LayoutPreset[] = [
      { id: "a", label: "Analyze A", splitMode: "quad", panes: [{ view: "stats" }, { view: "timeline" }], purpose: "analyze" },
      { id: "b", label: "Overview B", splitMode: "triple", panes: [{ view: "network" }, { view: "table" }], purpose: "overview" },
      { id: "c", label: "Analyze C", splitMode: "quad", panes: [{ view: "stats" }, { view: "review" }], purpose: "analyze" },
    ];
    const result = getRecommendedLayoutPresets(presets, [{ view: "stats" }, { view: "timeline" }], "vertical-2", null);
    expect(result.map((preset) => preset.id)).toEqual(["a", "c"]);
  });

  it("pinned と lastUsedAt で preset を並べ替える", () => {
    const result = sortLayoutPresets([
      { id: "a", label: "A", splitMode: "single", panes: [], lastUsedAt: "2026-03-20T00:00:00.000Z" },
      { id: "b", label: "B", splitMode: "single", panes: [], pinned: true },
      { id: "c", label: "C", splitMode: "single", panes: [], lastUsedAt: "2026-03-21T00:00:00.000Z" },
    ]);
    expect(result.map((preset) => preset.id)).toEqual(["b", "c", "a"]);
  });

  it("現在と候補の差分を比較できる", () => {
    const result = compareLayoutPresetState({
      splitMode: "single",
      panes: [{ view: "sphere" }],
      purpose: "edit",
      workspaceArrangement: { mode: "pack", groupBy: "folder", topicCount: 8 },
      workspaceTopicCount: 8,
    }, {
      id: "x",
      label: "Candidate",
      splitMode: "quad",
      panes: [{ view: "stats" }, { view: "timeline" }],
      purpose: "analyze",
      workspaceArrangement: { mode: "cluster", groupBy: "para-category", topicCount: 12 },
      workspaceSnapshot: { viewport: { x: 0, y: 0, w: 100, h: 100 }, topics: Array.from({ length: 12 }, (_, i) => ({ topicId: `${i}`, x: i, y: i, size: 100 })) },
    });
    expect(result.splitChanged).toBe(true);
    expect(result.paneChanged).toBe(true);
    expect(result.purposeChanged).toBe(true);
    expect(result.arrangementChanged).toBe(true);
    expect(result.topicDelta).toBe(4);
  });
});
