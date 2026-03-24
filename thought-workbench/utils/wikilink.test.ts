import { describe, it, expect } from "vitest";
import {
  extractWikilinks,
  buildLabelIndex,
  resolveWikilinks,
  parseTextWithWikilinks,
} from "./wikilink";
import type { TopicItem } from "../types";

function makeTopic(id: string, nodes: { id: string; label: string }[]): TopicItem {
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
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: "主張",
      tense: "現在",
      position: [0, 0, 0] as [number, number, number],
      note: "",
      size: 0.6,
      frameScale: 1,
      group: "default",
      layer: "h1",
    })),
    edges: [],
    parentTopicId: null,
    outsideNodeIds: [],
  };
}

describe("extractWikilinks", () => {
  it("[[...]] パターンを抽出する", () => {
    const result = extractWikilinks("これは [[ノードA]] と [[ノードB]] を参照する");
    expect(result).toEqual(["ノードA", "ノードB"]);
  });

  it("wikilink がない場合は空配列を返す", () => {
    expect(extractWikilinks("通常のテキスト")).toEqual([]);
  });

  it("空文字列で空配列を返す", () => {
    expect(extractWikilinks("")).toEqual([]);
  });

  it("前後のスペースをトリムする", () => {
    const result = extractWikilinks("[[ スペース付き ]]");
    expect(result).toEqual(["スペース付き"]);
  });

  it("複数の wikilink を全て抽出する", () => {
    const result = extractWikilinks("[[A]] [[B]] [[C]]");
    expect(result).toEqual(["A", "B", "C"]);
  });
});

describe("buildLabelIndex", () => {
  it("ノードラベルを小文字化してインデックス化する", () => {
    const topics = [makeTopic("t1", [{ id: "n1", label: "Apple" }])];
    const index = buildLabelIndex(topics);
    expect(index.get("apple")).toEqual({ nodeId: "n1", topicId: "t1" });
  });

  it("複数トピックのノードを全てインデックスに含める", () => {
    const topics = [
      makeTopic("t1", [{ id: "n1", label: "Alpha" }]),
      makeTopic("t2", [{ id: "n2", label: "Beta" }]),
    ];
    const index = buildLabelIndex(topics);
    expect(index.size).toBe(2);
    expect(index.get("alpha")).toEqual({ nodeId: "n1", topicId: "t1" });
    expect(index.get("beta")).toEqual({ nodeId: "n2", topicId: "t2" });
  });

  it("同名ノードは最初のものが優先される", () => {
    const topics = [
      makeTopic("t1", [{ id: "n1", label: "dup" }]),
      makeTopic("t2", [{ id: "n2", label: "dup" }]),
    ];
    const index = buildLabelIndex(topics);
    expect(index.get("dup")?.nodeId).toBe("n1");
  });

  it("空のトピック配列で空の Map を返す", () => {
    expect(buildLabelIndex([]).size).toBe(0);
  });
});

describe("resolveWikilinks", () => {
  it("一致するノードを resolve=true で返す", () => {
    const topics = [makeTopic("t1", [{ id: "n1", label: "テスト" }])];
    const index = buildLabelIndex(topics);
    const result = resolveWikilinks("[[テスト]] を参照", index);
    expect(result.length).toBe(1);
    expect(result[0].resolved).toBe(true);
    expect(result[0].nodeId).toBe("n1");
    expect(result[0].topicId).toBe("t1");
  });

  it("一致しない wikilink は resolve=false を返す", () => {
    const index = new Map<string, { nodeId: string; topicId: string }>();
    const result = resolveWikilinks("[[存在しない]]", index);
    expect(result[0].resolved).toBe(false);
    expect(result[0].nodeId).toBeUndefined();
  });

  it("大文字小文字を区別せずに解決する", () => {
    const topics = [makeTopic("t1", [{ id: "n1", label: "UPPER" }])];
    const index = buildLabelIndex(topics);
    const result = resolveWikilinks("[[upper]]", index);
    expect(result[0].resolved).toBe(true);
  });
});

describe("parseTextWithWikilinks", () => {
  it("テキストと wikilink を交互のセグメントに分割する", () => {
    const topics = [makeTopic("t1", [{ id: "n1", label: "Node" }])];
    const index = buildLabelIndex(topics);
    const result = parseTextWithWikilinks("前 [[Node]] 後", index);
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ type: "text", value: "前 " });
    expect(result[1].type).toBe("wikilink");
    expect(result[2]).toEqual({ type: "text", value: " 後" });
  });

  it("wikilink のみのテキストで wikilink セグメントのみを返す", () => {
    const index = new Map<string, { nodeId: string; topicId: string }>();
    const result = parseTextWithWikilinks("[[単独]]", index);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("wikilink");
  });

  it("wikilink がないテキストはテキストセグメントとして返す", () => {
    const index = new Map<string, { nodeId: string; topicId: string }>();
    const result = parseTextWithWikilinks("普通のテキスト", index);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ type: "text", value: "普通のテキスト" });
  });

  it("空文字列で空配列を返す", () => {
    const index = new Map<string, { nodeId: string; topicId: string }>();
    expect(parseTextWithWikilinks("", index)).toEqual([]);
  });
});
