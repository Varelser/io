import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { executeQuery } from "./query-engine";

function makeNode(overrides: Partial<NodeItem> = {}): NodeItem {
  return {
    id: `n-${Math.random()}`,
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

function makeTopic(id: string, nodes: NodeItem[]): TopicItem {
  return {
    id,
    title: "Topic",
    folder: "default",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Resources",
    mustOneNodeId: null,
    sourceFile: "test.md",
    unresolvedTopicLinks: [],
    nodes,
    edges: [],
    parentTopicId: null,
    outsideNodeIds: [],
  };
}

describe("executeQuery", () => {
  it("matches canonical intake/work/version aliases against legacy runtime values", () => {
    const topic = makeTopic("t1", [
      makeNode({ id: "a", label: "Alpha", intakeStatus: "placed" as any, workStatus: "organizing" as any, versionState: "comparison" as any }),
      makeNode({ id: "b", label: "Beta", intakeStatus: "inbox", workStatus: "review", versionState: "working" }),
    ]);

    expect(executeQuery("intake:structured", [topic]).map((entry) => entry.node.id)).toEqual(["a"]);
    expect(executeQuery("work:active", [topic]).map((entry) => entry.node.id)).toEqual(["a"]);
    expect(executeQuery("version:snapshotted", [topic]).map((entry) => entry.node.id)).toEqual(["a"]);
  });

  it("matches review/publication/url states directly", () => {
    const topic = makeTopic("t1", [
      makeNode({ id: "a", label: "Alpha", reviewState: "inReview", publicationState: "publishReady", urlState: "verified" }),
      makeNode({ id: "b", label: "Beta", reviewState: "queued", publicationState: "private", urlState: "broken" }),
    ]);

    expect(executeQuery("review:inReview", [topic]).map((entry) => entry.node.id)).toEqual(["a"]);
    expect(executeQuery("publication:publishReady", [topic]).map((entry) => entry.node.id)).toEqual(["a"]);
    expect(executeQuery("url:broken", [topic]).map((entry) => entry.node.id)).toEqual(["b"]);
  });
});
