import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem, TopicLinkItem } from "../types";
import { collectMaintenanceIssues, inferEdgeRelation, inferNodeGroup, inferNodeLayer } from "./maintenance-repair";

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

describe("maintenance repair helpers", () => {
  it("inferNodeLayer は近傍レイヤーを優先する", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "a", layer: "", group: "g0" }),
        makeNode({ id: "b", layer: "analysis", group: "g1" }),
        makeNode({ id: "c", layer: "analysis", group: "g2" }),
      ],
      edges: [{ id: "e1", from: "a", to: "b", relation: "参照", meaning: "", weight: 1, visible: true }],
    });
    expect(inferNodeLayer(topic, topic.nodes[0]).value).toBe("analysis");
  });

  it("inferNodeGroup は型一致や頻出 group を使う", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "a", type: "問い", group: "" }),
        makeNode({ id: "b", type: "問い", group: "question" }),
        makeNode({ id: "c", type: "主張", group: "claim" }),
      ],
    });
    expect(inferNodeGroup(topic, topic.nodes[0]).value).toBe("question");
  });

  it("inferEdgeRelation は型ペアから relation を推定する", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "a", type: "主張" }),
        makeNode({ id: "b", type: "根拠" }),
        makeNode({ id: "c", type: "根拠" }),
      ],
      edges: [
        { id: "e1", from: "a", to: "b", relation: "根拠", meaning: "", weight: 1, visible: true },
        { id: "e2", from: "a", to: "c", relation: "", meaning: "", weight: 1, visible: true },
      ],
    });
    expect(inferEdgeRelation(topic, topic.edges[1]).value).toBe("根拠");
  });

  it("collectMaintenanceIssues は自動修復付き欠損 issue を返す", () => {
    const topics = [
      makeTopic({
        nodes: [
          makeNode({ id: "a", label: "A", layer: "", group: "", type: "主張" }),
          makeNode({ id: "b", label: "B", layer: "h2", group: "support", type: "根拠" }),
        ],
        edges: [
          { id: "e1", from: "a", to: "b", relation: "", meaning: "", weight: 1, visible: true },
        ],
      }),
    ];
    const issues = collectMaintenanceIssues(topics, [] as TopicLinkItem[]);
    expect(issues.some((issue) => issue.category === "missing-layer" && issue.repair?.value)).toBe(true);
    expect(issues.some((issue) => issue.category === "missing-group" && issue.repair?.value)).toBe(true);
    expect(issues.some((issue) => issue.category === "missing-relation" && issue.repair?.value)).toBe(true);
  });
});
