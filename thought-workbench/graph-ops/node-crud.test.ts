import { describe, it, expect } from "vitest";
import {
  appendNodesToTopic,
  updateNodeByIdInTopic,
  removeNodesFromTopic,
  buildNewNodeItem,
  createDuplicatedNodeItem,
  shiftNodePosition,
} from "./node-crud";
import type { TopicItem, NodeItem } from "../types";

function makeNode(overrides: Partial<NodeItem> = {}): NodeItem {
  return {
    id: "n1",
    label: "テストノード",
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
    title: "テスト球体",
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
    nodes: [makeNode({ id: "n1", label: "既存ノード" })],
    edges: [],
    parentTopicId: null,
    outsideNodeIds: [],
    ...overrides,
  };
}

describe("appendNodesToTopic", () => {
  it("ノードを追加して新しい topic を返す（不変）", () => {
    const topic = makeTopic();
    const newNode = makeNode({ id: "n2", label: "新規" });
    const result = appendNodesToTopic(topic, [newNode]);
    expect(result.nodes.length).toBe(2);
    expect(topic.nodes.length).toBe(1); // 元の配列は変化しない
  });

  it("空配列を渡した場合は同じ topic オブジェクトを返す", () => {
    const topic = makeTopic();
    const result = appendNodesToTopic(topic, []);
    expect(result).toBe(topic); // 参照が同じ
  });

  it("複数ノードを一度に追加できる", () => {
    const topic = makeTopic({ nodes: [] });
    const nodes = [
      makeNode({ id: "n1" }),
      makeNode({ id: "n2" }),
      makeNode({ id: "n3" }),
    ];
    const result = appendNodesToTopic(topic, nodes);
    expect(result.nodes.length).toBe(3);
  });
});

describe("updateNodeByIdInTopic", () => {
  it("指定した id のノードだけ更新される（不変）", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "n1", label: "A" }),
        makeNode({ id: "n2", label: "B" }),
      ],
    });
    const result = updateNodeByIdInTopic(topic, "n1", (n) => ({ ...n, label: "Updated" }));
    expect(result.nodes.find((n) => n.id === "n1")!.label).toBe("Updated");
    expect(result.nodes.find((n) => n.id === "n2")!.label).toBe("B");
    expect(topic.nodes[0].label).toBe("A"); // 元は変化しない
  });

  it("存在しない id を渡しても topic はそのまま返る", () => {
    const topic = makeTopic();
    const result = updateNodeByIdInTopic(topic, "nonexistent", (n) => ({ ...n, label: "X" }));
    expect(result.nodes[0].label).toBe("既存ノード");
  });
});

describe("removeNodesFromTopic", () => {
  it("指定した id のノードを削除する", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "n1" }),
        makeNode({ id: "n2" }),
        makeNode({ id: "n3" }),
      ],
    });
    const result = removeNodesFromTopic(topic, new Set(["n2"]));
    expect(result.nodes.length).toBe(2);
    expect(result.nodes.find((n) => n.id === "n2")).toBeUndefined();
  });

  it("全ノードを削除しても最低 1 つのノードが残る", () => {
    const topic = makeTopic({ nodes: [makeNode({ id: "n1" })] });
    const result = removeNodesFromTopic(topic, new Set(["n1"]));
    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it("ノード削除時に関連エッジも除去される", () => {
    const topic = makeTopic({
      nodes: [makeNode({ id: "n1" }), makeNode({ id: "n2" })],
      edges: [{ id: "e1", from: "n1", to: "n2", relation: "r", meaning: "m", weight: 1, visible: true }],
    });
    const result = removeNodesFromTopic(topic, new Set(["n2"]));
    expect(result.edges.length).toBe(0);
  });
});

describe("buildNewNodeItem", () => {
  it("有効な NodeItem を生成する", () => {
    const node = buildNewNodeItem(0);
    expect(typeof node.id).toBe("string");
    expect(typeof node.label).toBe("string");
    expect(node.position.length).toBe(3);
  });

  it("nodeCount に基づいてラベルに番号が含まれる", () => {
    const node = buildNewNodeItem(4);
    expect(node.label).toContain("5");
  });

  it("任意の id を指定できる", () => {
    const node = buildNewNodeItem(0, "custom-id");
    expect(node.id).toBe("custom-id");
  });
});

describe("shiftNodePosition", () => {
  it("位置を正しくシフトする", () => {
    const result = shiftNodePosition([1, 2, 3], 0.5, -1, 0.25);
    expect(result[0]).toBeCloseTo(1.5);
    expect(result[1]).toBeCloseTo(1);
    expect(result[2]).toBeCloseTo(3.25);
  });

  it("ゼロシフトでは元の値を返す", () => {
    const pos: [number, number, number] = [1, 2, 3];
    const result = shiftNodePosition(pos, 0, 0, 0);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("createDuplicatedNodeItem", () => {
  it("元ノードとは異なる id を持つ", () => {
    const original = makeNode({ id: "original" });
    const dup = createDuplicatedNodeItem(original);
    expect(dup.id).not.toBe("original");
  });

  it("任意の id を指定できる", () => {
    const original = makeNode();
    const dup = createDuplicatedNodeItem(original, { id: "new-id" });
    expect(dup.id).toBe("new-id");
  });

  it("ラベルサフィックスが付けられる", () => {
    const original = makeNode({ label: "Original" });
    const dup = createDuplicatedNodeItem(original, { labelSuffix: " (copy)" });
    expect(dup.label).toBe("Original (copy)");
  });

  it("サフィックスなしでは元のラベルをそのまま使う", () => {
    const original = makeNode({ label: "Original" });
    const dup = createDuplicatedNodeItem(original);
    expect(dup.label).toBe("Original");
  });

  it("position がデフォルトでシフトされる", () => {
    const original = makeNode({ position: [0, 0, 0] });
    const dup = createDuplicatedNodeItem(original);
    expect(dup.position[0]).not.toBe(0); // 何らかのオフセットがある
  });
});
