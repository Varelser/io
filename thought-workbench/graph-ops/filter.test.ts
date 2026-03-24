import { describe, it, expect } from "vitest";
import {
  filterTopicNodes,
  searchNodesInTopic,
  collectUniqueNodeFieldValues,
  buildSphereTopic,
  selectTopicLinksForTopic,
} from "./filter";
import type { TopicItem, TopicLinkItem, NodeItem } from "../types";

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
    nodes: [],
    edges: [],
    parentTopicId: null,
    outsideNodeIds: [],
    ...overrides,
  };
}

describe("filterTopicNodes", () => {
  it("null topic を渡したとき null を返す", () => {
    expect(filterTopicNodes(null, "", "", "")).toBeNull();
  });

  it("searchQuery に一致するノードだけ返す", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "n1", label: "りんご" }),
        makeNode({ id: "n2", label: "バナナ" }),
        makeNode({ id: "n3", label: "りんごジュース" }),
      ],
      edges: [],
    });
    const result = filterTopicNodes(topic, "りんご", "", "");
    expect(result!.nodes.length).toBe(2);
    expect(result!.nodes.map((n) => n.id)).toContain("n1");
    expect(result!.nodes.map((n) => n.id)).toContain("n3");
  });

  it("layer フィルタが機能する", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "n1", label: "A", layer: "h1" }),
        makeNode({ id: "n2", label: "B", layer: "h2" }),
      ],
      edges: [],
    });
    const result = filterTopicNodes(topic, "", "h1", "");
    expect(result!.nodes.length).toBe(1);
    expect(result!.nodes[0].id).toBe("n1");
  });

  it("group フィルタが機能する", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "n1", label: "A", group: "core" }),
        makeNode({ id: "n2", label: "B", group: "other" }),
      ],
      edges: [],
    });
    const result = filterTopicNodes(topic, "", "", "core");
    expect(result!.nodes.length).toBe(1);
    expect(result!.nodes[0].id).toBe("n1");
  });

  it("フィルタなしでは全ノードを返す", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "n1", label: "A" }),
        makeNode({ id: "n2", label: "B" }),
      ],
      edges: [],
    });
    const result = filterTopicNodes(topic, "", "", "");
    expect(result!.nodes.length).toBe(2);
  });

  it("ノードがフィルタアウトされるとエッジも除外される", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "n1", label: "りんご" }),
        makeNode({ id: "n2", label: "バナナ" }),
      ],
      edges: [{ id: "e1", from: "n1", to: "n2", relation: "r", meaning: "m", weight: 1, visible: true }],
    });
    const result = filterTopicNodes(topic, "りんご", "", "");
    expect(result!.nodes.length).toBe(1);
    expect(result!.edges.length).toBe(0); // n2 は除外されたのでエッジも除外
  });
});

describe("searchNodesInTopic", () => {
  it("null topic で空配列を返す", () => {
    expect(searchNodesInTopic(null, "test")).toEqual([]);
  });

  it("空クエリで空配列を返す", () => {
    const topic = makeTopic({ nodes: [makeNode({ label: "test" })] });
    expect(searchNodesInTopic(topic, "")).toEqual([]);
  });

  it("ラベルに一致するノードを返す", () => {
    const topic = makeTopic({
      nodes: [
        makeNode({ id: "n1", label: "apple" }),
        makeNode({ id: "n2", label: "banana" }),
      ],
    });
    const result = searchNodesInTopic(topic, "apple");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("n1");
  });

  it("note に一致するノードも返す", () => {
    const topic = makeTopic({
      nodes: [makeNode({ id: "n1", label: "ノード", note: "詳細な説明" })],
    });
    const result = searchNodesInTopic(topic, "詳細");
    expect(result.length).toBe(1);
  });
});

describe("collectUniqueNodeFieldValues", () => {
  it("ユニークな layer 値をソートして返す", () => {
    const nodes = [
      makeNode({ layer: "h2" }),
      makeNode({ layer: "h1" }),
      makeNode({ layer: "h1" }),
      makeNode({ layer: "h3" }),
    ];
    const result = collectUniqueNodeFieldValues(nodes, "layer");
    expect(result).toEqual(["h1", "h2", "h3"]);
  });

  it("undefined を渡しても空配列を返す", () => {
    const result = collectUniqueNodeFieldValues(undefined, "layer");
    expect(result).toEqual([]);
  });
});

describe("buildSphereTopic", () => {
  it("selectedTopic が null なら null を返す", () => {
    expect(buildSphereTopic(null, null)).toBeNull();
  });

  it("filteredTopic が null なら selectedTopic をそのまま返す", () => {
    const topic = makeTopic({ id: "t1" });
    const result = buildSphereTopic(topic, null);
    expect(result).toBe(topic);
  });

  it("filteredTopic の nodes/edges を selectedTopic に適用する", () => {
    const selected = makeTopic({
      nodes: [makeNode({ id: "n1" }), makeNode({ id: "n2" })],
      edges: [],
    });
    const filtered = { ...selected, nodes: [makeNode({ id: "n1" })], edges: [] };
    const result = buildSphereTopic(selected, filtered as any);
    expect(result!.nodes.length).toBe(1);
  });
});

describe("selectTopicLinksForTopic", () => {
  it("null topic で空配列を返す", () => {
    const links: TopicLinkItem[] = [{ id: "l1", from: "t1", to: "t2", relation: "r", meaning: "m" }];
    expect(selectTopicLinksForTopic(null, links)).toEqual([]);
  });

  it("from または to が topic.id に一致するリンクだけ返す", () => {
    const topic = makeTopic({ id: "t1" });
    const links: TopicLinkItem[] = [
      { id: "l1", from: "t1", to: "t2", relation: "r", meaning: "m" },
      { id: "l2", from: "t3", to: "t4", relation: "r", meaning: "m" },
      { id: "l3", from: "t5", to: "t1", relation: "r", meaning: "m" },
    ];
    const result = selectTopicLinksForTopic(topic, links);
    expect(result.length).toBe(2);
    expect(result.map((l) => l.id)).toContain("l1");
    expect(result.map((l) => l.id)).toContain("l3");
  });
});
