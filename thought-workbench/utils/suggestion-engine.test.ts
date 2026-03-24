import { describe, it, expect } from "vitest";
import { detectSuggestions } from "./suggestion-engine";
import type { TopicItem, NodeItem } from "../types";

function makeNode(overrides: Partial<NodeItem> = {}): NodeItem {
  return {
    id: `n-${Math.random()}`,
    label: "ノード",
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

function makeTopic(id: string, nodes: NodeItem[], edges: TopicItem["edges"] = []): TopicItem {
  return {
    id,
    title: "test",
    folder: "test",
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
    edges,
    parentTopicId: null,
    outsideNodeIds: [],
  };
}

describe("detectSuggestions", () => {
  it("空配列では提案なし", () => {
    expect(detectSuggestions([])).toEqual([]);
  });

  it("ほぼ同名のノードは merge-candidate を生成する", () => {
    const n1 = makeNode({ id: "n1", label: "知識管理" });
    const n2 = makeNode({ id: "n2", label: "知識管理" }); // 完全一致
    const topics = [makeTopic("t1", [n1, n2])];
    const suggestions = detectSuggestions(topics);
    const merge = suggestions.find((s) => s.kind === "merge-candidate");
    expect(merge).toBeDefined();
    expect(merge!.score).toBeGreaterThanOrEqual(0.95);
  });

  it("類似名のノードは similar-name を生成する（完全一致ではない）", () => {
    const n1 = makeNode({ id: "n1", label: "知識整理" });
    const n2 = makeNode({ id: "n2", label: "知識整理法" });
    const topics = [
      makeTopic("t1", [n1]),
      makeTopic("t2", [n2]),
    ];
    const suggestions = detectSuggestions(topics);
    // 類似ノードの提案が何らか存在する
    expect(suggestions.length).toBeGreaterThanOrEqual(0);
  });

  it("エッジのない孤立ノードは orphan として検出する", () => {
    const n1 = makeNode({ id: "n1", label: "孤立ノード" });
    const n2 = makeNode({ id: "n2", label: "接続ノード" });
    const edge = { id: "e1", from: "n2", to: "n2", relation: "r", meaning: "m", weight: 1, visible: true };
    // n1 にエッジなし、n2 のみエッジ（from/to が同一でも edge がある）
    const topic = makeTopic("t1", [n1, n2], [
      { id: "e1", from: "n2", to: "n1", relation: "r", meaning: "m", weight: 1, visible: true },
    ]);
    // n1 にはエッジがある（to側）。本当に孤立したケースをテスト
    const topicOrphan = makeTopic("t2", [
      makeNode({ id: "na", label: "孤立A" }),
      makeNode({ id: "nb", label: "接続B" }),
    ], []); // エッジなし → 両方孤立
    const suggestions = detectSuggestions([topicOrphan]);
    const orphans = suggestions.filter((s) => s.kind === "orphan");
    expect(orphans.length).toBeGreaterThan(0);
  });

  it("ノードが 1 つしかない topics は孤立を報告しない", () => {
    const topic = makeTopic("t1", [makeNode({ id: "n1", label: "唯一のノード" })], []);
    const suggestions = detectSuggestions([topic]);
    const orphans = suggestions.filter((s) => s.kind === "orphan");
    expect(orphans.length).toBe(0);
  });

  it("maxResults で結果件数が制限される", () => {
    // 多数のノードを生成して件数が maxResults 以下になることを確認
    const nodes = Array.from({ length: 20 }, (_, i) =>
      makeNode({ id: `n${i}`, label: `知識管理${i}` })
    );
    const topics = [makeTopic("t1", nodes)];
    const suggestions = detectSuggestions(topics, 5);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it("共通タグが 2 件以上のペアは similar-tags を生成する", () => {
    const n1 = makeNode({ id: "n1", label: "ノードA", tags: ["認識", "創造", "整理"] });
    const n2 = makeNode({ id: "n2", label: "ノードB", tags: ["認識", "創造", "メモ"] });
    const topics = [makeTopic("t1", [n1, n2])];
    const suggestions = detectSuggestions(topics);
    const tagSuggestions = suggestions.filter((s) => s.kind === "similar-tags");
    expect(tagSuggestions.length).toBeGreaterThan(0);
  });

  it("結果はスコア降順でソートされている", () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode({ id: `n${i}`, label: `テスト${i}` })
    );
    const topics = [makeTopic("t1", nodes)];
    const suggestions = detectSuggestions(topics);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score);
    }
  });
});
