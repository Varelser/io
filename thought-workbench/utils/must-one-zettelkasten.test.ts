import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { collectMustOneZettelkastenFocus } from "./must-one-zettelkasten";

function makeNode(overrides: Partial<NodeItem> = {}): NodeItem {
  return {
    id: "n1",
    label: "Node",
    type: "主張",
    tense: "現在",
    position: [0, 0, 0],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "default",
    layer: "h1",
    ...overrides,
  };
}

function makeTopic(overrides: Partial<TopicItem> = {}): TopicItem {
  return {
    id: "t1",
    title: "Topic",
    folder: "folder",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Resources",
    mustOneNodeId: null,
    sourceFile: "topic.md",
    unresolvedTopicLinks: [],
    nodes: [],
    edges: [],
    parentTopicId: null,
    outsideNodeIds: [],
    ...overrides,
  };
}

describe("collectMustOneZettelkastenFocus", () => {
  it("must one を中心に forward/backlink と orphan 候補を返す", () => {
    const topic = makeTopic({
      mustOneNodeId: "core",
      activeMethods: ["zettelkasten"],
      nodes: [
        makeNode({ id: "core", label: "Core", note: "See [[Bridge]]", group: "linked", layer: "zettel" }),
        makeNode({ id: "bridge", label: "Bridge", note: "Relates to [[Core]]", group: "linked", layer: "zettel" }),
        makeNode({ id: "orphan", label: "Orphan", note: "[[Core]] pending", group: "orphan", layer: "inbox" }),
      ],
      edges: [{ id: "e1", from: "core", to: "bridge", relation: "参照", meaning: "", weight: 1, visible: true }],
    });

    const result = collectMustOneZettelkastenFocus([topic]);
    expect(result).toHaveLength(1);
    expect(result[0].zettelkastenCompatible).toBe(true);
    expect(result[0].connections.some((item) => item.nodeId === "bridge" && item.kind === "forward-link")).toBe(true);
    expect(result[0].connections.some((item) => item.nodeId === "bridge" && item.kind === "backlink")).toBe(true);
    expect(result[0].connections.some((item) => item.nodeId === "orphan" && item.kind === "orphan-candidate")).toBe(true);
  });
});
