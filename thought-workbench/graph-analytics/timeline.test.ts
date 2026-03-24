import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { buildTimelinePoints, computeTimelineComparison } from "./timeline";

function makeNode(id: string, createdAt: string, type = "idea", layer = "h1"): NodeItem {
  return {
    id,
    label: id,
    type,
    tense: "現在",
    position: [0, 0, 0],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "default",
    layer,
    createdAt,
    updatedAt: createdAt,
  };
}

function makeTopic(id: string, title: string, nodes: NodeItem[]) {
  return {
    id,
    title,
    folder: "folder",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Resources" as const,
    mustOneNodeId: null,
    sourceFile: `${id}.md`,
    unresolvedTopicLinks: [],
    nodes,
    edges: [],
    parentTopicId: null,
    outsideNodeIds: [],
  } satisfies TopicItem;
}

describe("timeline analytics", () => {
  it("buildTimelinePoints は timestamp 順に整列する", () => {
    const topic = makeTopic("t1", "Topic 1", [
      makeNode("b", "2026-03-03T00:00:00.000Z"),
      makeNode("a", "2026-03-01T00:00:00.000Z"),
      makeNode("c", "2026-03-05T00:00:00.000Z"),
    ]);

    const points = buildTimelinePoints([topic], "created");
    expect(points.map((point) => point.node.id)).toEqual(["a", "b", "c"]);
  });

  it("computeTimelineComparison は 2 期間の差分を返す", () => {
    const points = buildTimelinePoints([
      makeTopic("t1", "Topic 1", [
        makeNode("a", "2026-03-01T00:00:00.000Z", "idea", "h1"),
        makeNode("b", "2026-03-02T00:00:00.000Z", "fact", "h1"),
      ]),
      makeTopic("t2", "Topic 2", [
        makeNode("c", "2026-03-10T00:00:00.000Z", "idea", "h2"),
        makeNode("d", "2026-03-11T00:00:00.000Z", "idea", "h2"),
        makeNode("e", "2026-03-11T12:00:00.000Z", "question", "h3"),
      ]),
    ], "created");

    const comparison = computeTimelineComparison(
      points,
      new Date("2026-03-02T00:00:00.000Z").getTime(),
      new Date("2026-03-11T00:00:00.000Z").getTime(),
      3 * 86400000
    );

    expect(comparison.summaryA.nodeCount).toBe(2);
    expect(comparison.summaryB.nodeCount).toBe(3);
    expect(comparison.summaryB.topicCount).toBe(1);
    expect(comparison.typeDeltas[0]).toMatchObject({ key: "idea", countA: 1, countB: 2, delta: 1 });
    expect(comparison.layerDeltas.find((entry) => entry.key === "h2")).toMatchObject({ countA: 0, countB: 2, delta: 2 });
  });
});
