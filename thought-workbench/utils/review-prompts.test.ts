import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { buildReviewPromptSet } from "./review-prompts";

function makeNode(overrides: Partial<NodeItem> = {}): NodeItem {
  return {
    id: "n1",
    label: "仮説",
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

describe("buildReviewPromptSet", () => {
  it("主張ノードに反対意見と検証問いを返す", () => {
    const prompts = buildReviewPromptSet({
      topic: makeTopic(),
      node: makeNode(),
      categories: [],
      staleDays: 0,
      hasEdges: true,
    }, "ja");

    expect(prompts.counter.some((prompt) => prompt.includes("成り立たない条件"))).toBe(true);
    expect(prompts.inquiry.some((prompt) => prompt.includes("最小の観測"))).toBe(true);
  });

  it("低確信度と孤立ノードに追加の問い返しを返す", () => {
    const prompts = buildReviewPromptSet({
      topic: makeTopic({ activeMethods: ["zettelkasten"] }),
      node: makeNode({ confidence: 0.2, evidenceBasis: "unverified" }),
      categories: ["low-confidence", "no-edges", "no-extensions", "stale"],
      staleDays: 21,
      hasEdges: false,
    }, "ja");

    expect(prompts.counter.some((prompt) => prompt.includes("取り下げる"))).toBe(true);
    expect(prompts.inquiry.some((prompt) => prompt.includes("接続する"))).toBe(true);
    expect(prompts.inquiry.some((prompt) => prompt.includes("変わった事実"))).toBe(true);
    expect(prompts.inquiry.length).toBeLessThanOrEqual(3);
  });
});
