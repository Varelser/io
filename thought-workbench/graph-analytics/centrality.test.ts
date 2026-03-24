import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { computeBetweennessCentrality, computeCommunityClusters, computeDegreeCentrality, computeHITS } from "./centrality";

function makeNode(id: string): NodeItem {
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
    layer: "h1",
  };
}

function makeTopic(nodeIds: string[], edgeDefs: Array<[string, string, string]>) {
  return {
    id: "topic",
    title: "topic",
    folder: "folder",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Resources" as const,
    mustOneNodeId: null,
    sourceFile: "topic.md",
    unresolvedTopicLinks: [],
    nodes: nodeIds.map(makeNode),
    edges: edgeDefs.map(([id, from, to]) => ({ id, from, to, relation: "参照", meaning: "test", weight: 1, visible: true })),
    parentTopicId: null,
    outsideNodeIds: [],
  } satisfies TopicItem;
}

describe("graph centrality", () => {
  it("degree centrality は接続数が多いノードほど高い", () => {
    const topic = makeTopic(["a", "b", "c", "d"], [["e1", "a", "b"], ["e2", "a", "c"], ["e3", "a", "d"]]);
    const degreeMap = computeDegreeCentrality(topic);
    expect(degreeMap.get("a")).toBeGreaterThan(degreeMap.get("b") || 0);
    expect(degreeMap.get("a")).toBeCloseTo(1, 5);
  });

  it("betweenness centrality は橋渡しノードを高く評価する", () => {
    const topic = makeTopic(["a", "b", "c"], [["e1", "a", "b"], ["e2", "b", "c"]]);
    const betweenMap = computeBetweennessCentrality(topic);
    expect(betweenMap.get("b")).toBeGreaterThan(betweenMap.get("a") || 0);
    expect(betweenMap.get("b")).toBeGreaterThan(betweenMap.get("c") || 0);
    expect(betweenMap.get("b")).toBeCloseTo(1, 5);
  });

  it("HITS は outgoing の多いノードを hub、incoming の多いノードを authority として評価する", () => {
    const topic = makeTopic(["hub", "a1", "a2"], [["e1", "hub", "a1"], ["e2", "hub", "a2"]]);
    const { hubMap, authorityMap } = computeHITS(topic);
    expect((hubMap.get("hub") || 0)).toBeGreaterThan(hubMap.get("a1") || 0);
    expect((authorityMap.get("a1") || 0)).toBeGreaterThan(authorityMap.get("hub") || 0);
    expect((authorityMap.get("a2") || 0)).toBeGreaterThan(authorityMap.get("hub") || 0);
  });

  it("null topic でも空の結果を返す", () => {
    expect(computeDegreeCentrality(null).size).toBe(0);
    expect(computeBetweennessCentrality(null).size).toBe(0);
    const hits = computeHITS(null);
    expect(hits.hubMap.size).toBe(0);
    expect(hits.authorityMap.size).toBe(0);
    const communities = computeCommunityClusters(null);
    expect(communities.communityMap.size).toBe(0);
    expect(communities.communities.length).toBe(0);
  });

  it("community detection は疎結合クラスタを分離して返す", () => {
    const topic = makeTopic(
      ["a", "b", "c", "d", "e", "f"],
      [["e1", "a", "b"], ["e2", "b", "c"], ["e3", "d", "e"], ["e4", "e", "f"]]
    );
    const { communityMap, communities } = computeCommunityClusters(topic);
    expect(communities.length).toBe(2);
    expect(communityMap.get("a")).toBe(communityMap.get("b"));
    expect(communityMap.get("b")).toBe(communityMap.get("c"));
    expect(communityMap.get("d")).toBe(communityMap.get("e"));
    expect(communityMap.get("a")).not.toBe(communityMap.get("d"));
  });
});
