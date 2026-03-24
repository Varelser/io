import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { computeLayerConnectionHeatmap, computeSphereDensityBands } from "./density";

function makeNode(id: string, layer: string): NodeItem {
  return {
    id,
    label: id,
    type: "主張",
    tense: "現在",
    position: [0, 0, 0],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "default",
    layer,
  };
}

function makeTopic(id: string, nodeDefs: Array<[string, string]>, edgeDefs: Array<[string, string, string]>) {
  return {
    id,
    title: id,
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
    nodes: nodeDefs.map(([nodeId, layer]) => makeNode(nodeId, layer)),
    edges: edgeDefs.map(([edgeId, from, to]) => ({ id: edgeId, from, to, relation: "参照", meaning: "test", weight: 1, visible: true })),
    parentTopicId: null,
    outsideNodeIds: [],
  } satisfies TopicItem;
}

describe("density analytics", () => {
  it("layer connection heatmap は同層と異層の密度を計算する", () => {
    const topic = makeTopic(
      "topic-a",
      [["a", "h1"], ["b", "h1"], ["c", "h2"], ["d", "h2"]],
      [["e1", "a", "b"], ["e2", "a", "c"], ["e3", "b", "c"]]
    );

    const heatmap = computeLayerConnectionHeatmap([topic]);
    expect(heatmap.layers).toEqual(["h1", "h2"]);
    expect(heatmap.cells[0][0].density).toBeCloseTo(1, 5);
    expect(heatmap.cells[0][1].density).toBeCloseTo(0.5, 5);
    expect(heatmap.cells[1][1].density).toBeCloseTo(0, 5);
  });

  it("sphere density bands は密度順に強度を返す", () => {
    const dense = makeTopic("dense", [["a", "h1"], ["b", "h1"], ["c", "h1"]], [["e1", "a", "b"], ["e2", "b", "c"], ["e3", "a", "c"]]);
    const sparse = makeTopic("sparse", [["x", "h1"], ["y", "h2"], ["z", "h3"]], [["e1", "x", "y"]]);

    const bands = computeSphereDensityBands([sparse, dense]);
    expect(bands[0].id).toBe("dense");
    expect(bands[0].density).toBeCloseTo(1, 5);
    expect(bands[0].intensity).toBeCloseTo(1, 5);
    expect(bands[1].density).toBeLessThan(bands[0].density);
  });
});
