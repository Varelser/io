import { describe, expect, it } from "vitest";
import type { TopicItem, WorkspaceViewport } from "../types";
import { applyWorkspaceLayoutSnapshot, buildWorkspaceLayoutSnapshot } from "./workspace-preset";

function makeTopic(id: string, x: number, y: number, size = 100): TopicItem {
  return {
    id,
    title: id,
    folder: "root",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    sourceFile: `${id}.md`,
    workspace: { x, y, size },
    nodes: [],
    edges: [],
    history: [],
    unresolvedTopicLinks: [],
    activeMethods: [],
    paraCategory: "Projects",
    mustOneNodeId: null,
    mustOneDate: null,
    mustOneHistory: [],
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    canvasRegions: [],
    parentTopicId: null,
    layerStyles: {},
  };
}

describe("workspace-preset", () => {
  it("workspace snapshot を生成する", () => {
    const viewport: WorkspaceViewport = { x: 10, y: 20, w: 80, h: 60 };
    const snapshot = buildWorkspaceLayoutSnapshot([makeTopic("a", 1, 2), makeTopic("b", 3, 4, 120)], viewport);
    expect(snapshot.viewport).toEqual(viewport);
    expect(snapshot.topics).toEqual([
      { topicId: "a", x: 1, y: 2, size: 100 },
      { topicId: "b", x: 3, y: 4, size: 120 },
    ]);
  });

  it("workspace snapshot を topic 配置へ再適用する", () => {
    const topics = [makeTopic("a", 20, 20), makeTopic("b", 40, 40)];
    const next = applyWorkspaceLayoutSnapshot(topics, {
      topics: [
        { topicId: "a", x: 2, y: 3, size: 90 },
        { topicId: "b", x: 7, y: 8, size: 110 },
      ],
    });
    expect(next[0].workspace).toMatchObject({ x: 2, y: 3, size: 90 });
    expect(next[1].workspace).toMatchObject({ x: 7, y: 8, size: 110 });
  });
});
