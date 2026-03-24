import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { collectZettelkastenNodeContext } from "./zettelkasten-node";

function makeNode(patch: Partial<NodeItem> & Pick<NodeItem, "id" | "label">): NodeItem {
  const { id, label, ...rest } = patch;
  return {
    id,
    label,
    type: "主張",
    tense: "現在",
    position: [0, 0, 0],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "linked",
    layer: "zettel",
    ...rest,
  };
}

function makeTopic(patch: Partial<TopicItem> & Pick<TopicItem, "id" | "title" | "nodes" | "edges">): TopicItem {
  const { id, title, nodes, edges, ...rest } = patch;
  return {
    id,
    title,
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
    nodes,
    edges,
    parentTopicId: null,
    outsideNodeIds: [],
    ...rest,
  };
}

describe("collectZettelkastenNodeContext", () => {
  it("forward / backlink / edge / orphan と template を返す", () => {
    const core = makeNode({ id: "core", label: "Core", note: "[[Bridge]] [[Archive]]" });
    const bridge = makeNode({ id: "bridge", label: "Bridge", note: "[[Core]] context" });
    const archive = makeNode({ id: "archive", label: "Archive", note: "" });
    const orphan = makeNode({ id: "orphan", label: "Orphan", note: "[[Core]] maybe", group: "orphan", layer: "inbox" });
    const topic = makeTopic({
      id: "t1",
      title: "Topic",
      nodes: [core, bridge, archive, orphan],
      edges: [{ id: "e1", from: "core", to: "bridge", relation: "参照", meaning: "bridge", weight: 1, visible: true }],
      activeMethods: ["zettelkasten"],
    });
    const external = makeTopic({
      id: "t2",
      title: "External",
      nodes: [makeNode({ id: "ext", label: "External", note: "[[Core]] backlink" })],
      edges: [],
    });

    const result = collectZettelkastenNodeContext([topic, external], "core");
    expect(result?.zettelkastenCompatible).toBe(true);
    expect(result?.forwardLinks.some((item) => item.nodeId === "bridge")).toBe(true);
    expect(result?.forwardLinks.some((item) => item.nodeId === "archive")).toBe(true);
    expect(result?.backlinks.some((item) => item.nodeId === "bridge")).toBe(true);
    expect(result?.backlinks.some((item) => item.nodeId === "ext")).toBe(true);
    expect(result?.edgeLinks.some((item) => item.nodeId === "bridge" && item.relation === "参照")).toBe(true);
    expect(result?.orphanCandidates.some((item) => item.nodeId === "orphan")).toBe(true);
    expect(result?.templates.some((item) => item.label === "[[Bridge]]")).toBe(true);
  });

  it("関連も signal もないノードは null を返す", () => {
    const topic = makeTopic({
      id: "t1",
      title: "Topic",
      nodes: [makeNode({ id: "solo", label: "Solo", layer: "h1", group: "default" })],
      edges: [],
    });

    expect(collectZettelkastenNodeContext([topic], "solo")).toBeNull();
  });
});
