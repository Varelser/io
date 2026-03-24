import { describe, it, expect } from "vitest";
import { computePageRank, computePageRankAnalysis } from "./compute";
import type { TopicItem, NodeItem } from "../types";

function makeNode(id: string, patch: Partial<NodeItem> = {}): NodeItem {
  return {
    id,
    label: `Node ${id}`,
    type: "主張",
    tense: "現在",
    position: [0, 0, 0],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "default",
    layer: "h1",
    ...patch,
  };
}

function makeEdge(id: string, from: string, to: string, patch: Record<string, unknown> = {}) {
  return { id, from, to, relation: "参照", meaning: "test", weight: 1, visible: true, ...patch };
}

function makeTopic(nodes: NodeItem[], edges: ReturnType<typeof makeEdge>[], patch: Partial<TopicItem> = {}) {
  return {
    id: "t1",
    title: "test",
    folder: "test",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Resources" as const,
    mustOneNodeId: null,
    sourceFile: "test.md",
    unresolvedTopicLinks: [],
    nodes,
    edges,
    parentTopicId: null,
    outsideNodeIds: [],
    ...patch,
  } satisfies TopicItem;
}

describe("computePageRank", () => {
  it("null を渡したとき空 Map を返す", () => {
    const result = computePageRank(null);
    expect(result.size).toBe(0);
  });

  it("ノードなし topic で空 Map を返す", () => {
    const topic = makeTopic([], []);
    expect(computePageRank(topic).size).toBe(0);
  });

  it("単一ノードで自身のスコアが 1.0", () => {
    const topic = makeTopic([makeNode("n1")], []);
    const result = computePageRank(topic);
    expect(result.get("n1")).toBeCloseTo(1.0, 5);
  });

  it("全ノードにスコアが割り当てられている", () => {
    const nodes = [makeNode("n1"), makeNode("n2"), makeNode("n3")];
    const edges = [makeEdge("e1", "n1", "n2"), makeEdge("e2", "n2", "n3")];
    const topic = makeTopic(nodes, edges);
    const result = computePageRank(topic);
    expect(result.size).toBe(3);
    for (const [, score] of result) {
      expect(score).toBeGreaterThan(0);
    }
  });

  it("スコアの合計はほぼ 1.0（正規化確認）", () => {
    const nodes = [makeNode("n1"), makeNode("n2"), makeNode("n3"), makeNode("n4")];
    const edges = [
      makeEdge("e1", "n1", "n2"),
      makeEdge("e2", "n2", "n3"),
      makeEdge("e3", "n3", "n4"),
      makeEdge("e4", "n4", "n1"),
    ];
    const topic = makeTopic(nodes, edges);
    const result = computePageRank(topic);
    const total = [...result.values()].reduce((sum, v) => sum + v, 0);
    expect(total).toBeCloseTo(1.0, 3);
  });

  it("リンクが多いノードはスコアが高い（ハブノード）", () => {
    // n1 が n2, n3, n4 からリンクされている（被リンク多）
    const nodes = [makeNode("n1"), makeNode("n2"), makeNode("n3"), makeNode("n4")];
    const edges = [
      makeEdge("e1", "n2", "n1"),
      makeEdge("e2", "n3", "n1"),
      makeEdge("e3", "n4", "n1"),
    ];
    const topic = makeTopic(nodes, edges);
    const result = computePageRank(topic);
    const n1Score = result.get("n1")!;
    const n2Score = result.get("n2")!;
    expect(n1Score).toBeGreaterThan(n2Score);
  });

  it("visible=false のエッジは計算に含まれない", () => {
    const nodes = [makeNode("n1"), makeNode("n2")];
    // n2 → n1 だが visible=false
    const edges = [{ id: "e1", from: "n2", to: "n1", relation: "参照", meaning: "m", weight: 1, visible: false }];
    const topicWithEdge = makeTopic(nodes, edges);
    const topicNoEdge = makeTopic(nodes, []);
    const resultWith = computePageRank(topicWithEdge);
    const resultWithout = computePageRank(topicNoEdge);
    // visible=false を除外すると均等分布になる → 等しいスコアになるはず
    expect(resultWith.get("n1")).toBeCloseTo(resultWithout.get("n1")!, 5);
  });

  it("flow variant は edge weight の強い流れを優先する", () => {
    const nodes = [makeNode("src"), makeNode("high"), makeNode("low")];
    const edges = [
      makeEdge("e1", "src", "high", { weight: 5 }),
      makeEdge("e2", "src", "low", { weight: 1 }),
    ];
    const topic = makeTopic(nodes, edges);
    const result = computePageRank(topic, "flow");
    expect((result.get("high") || 0)).toBeGreaterThan(result.get("low") || 0);
  });

  it("focus variant は must-one と task / recent ノードを押し上げる", () => {
    const now = new Date().toISOString();
    const nodes = [
      makeNode("must", { task: { status: "doing" }, updatedAt: now }),
      makeNode("other"),
      makeNode("third"),
    ];
    const topic = makeTopic(nodes, [makeEdge("e1", "other", "third")], { mustOneNodeId: "must" });
    const result = computePageRank(topic, "focus");
    expect((result.get("must") || 0)).toBeGreaterThan(result.get("other") || 0);
  });

  it("analysis は balanced / flow / focus をまとめて返す", () => {
    const nodes = [
      makeNode("must", { task: { status: "todo" } }),
      makeNode("other", { updatedAt: new Date().toISOString() }),
    ];
    const topic = makeTopic(nodes, [makeEdge("e1", "must", "other")], { mustOneNodeId: "must" });
    const result = computePageRankAnalysis(topic);
    expect(result.balancedMap.size).toBe(2);
    expect(result.flowMap.size).toBe(2);
    expect(result.focusMap.size).toBe(2);
    expect(result.focusSignals.some((entry) => entry.nodeId === "must" && entry.reasons.includes("must-one"))).toBe(true);
  });
});
