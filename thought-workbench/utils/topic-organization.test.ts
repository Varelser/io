import { describe, expect, it } from "vitest";
import type { TopicItem } from "../types";
import { appendMustOneHistory, buildParaFolderPath, collectTopicSubtreeIds } from "./topic-organization";

function makeTopic(id: string, parentTopicId: string | null = null): TopicItem {
  return {
    id,
    title: id,
    folder: "Resources/Test",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Resources",
    mustOneNodeId: null,
    mustOneDate: null,
    sourceFile: `${id}.md`,
    unresolvedTopicLinks: [],
    nodes: [],
    edges: [],
    parentTopicId,
    outsideNodeIds: [],
  };
}

describe("topic organization", () => {
  it("collectTopicSubtreeIds は子孫をすべて返す", () => {
    const topics = [makeTopic("a"), makeTopic("b", "a"), makeTopic("c", "b"), makeTopic("d")];
    expect([...collectTopicSubtreeIds(topics, "a")].sort()).toEqual(["a", "b", "c"]);
  });

  it("buildParaFolderPath は category 配下へ寄せる", () => {
    expect(buildParaFolderPath("Projects", "Alpha")).toBe("Projects/Alpha");
    expect(buildParaFolderPath("Areas", "Alpha", "Resources/Alpha/Sub")).toBe("Areas/Alpha/Sub");
  });

  it("appendMustOneHistory は同日同ノード重複を抑えつつ先頭へ積む", () => {
    const history = appendMustOneHistory([{ date: "2026-03-21", nodeId: "a", label: "A" }], "a", "A", "2026-03-21");
    expect(history).toHaveLength(1);
    const next = appendMustOneHistory(history, "b", "B", "2026-03-22");
    expect(next[0]).toEqual({ date: "2026-03-22", nodeId: "b", label: "B" });
  });
});
