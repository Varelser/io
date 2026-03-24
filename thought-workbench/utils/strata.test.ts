import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { buildStrataLayerEntries, buildTopicLayerStyles, filterTopicByVisibleLayers } from "./strata";

function makeNode(id: string, layer: string, patch: Partial<NodeItem> = {}): NodeItem {
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
    layer,
    ...patch,
  };
}

function makeTopic(): TopicItem {
  return {
    id: "topic",
    title: "Topic",
    folder: "Folder",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Resources",
    mustOneNodeId: null,
    mustOneDate: null,
    sourceFile: "topic.md",
    unresolvedTopicLinks: [],
    nodes: [
      makeNode("a", "h1", { createdAt: "2026-03-01T00:00:00.000Z" }),
      makeNode("b", "h2", { updatedAt: "2026-03-20T00:00:00.000Z" }),
      makeNode("c", "h2", { createdAt: "2026-03-10T00:00:00.000Z" }),
    ],
    edges: [
      { id: "e1", from: "a", to: "b", relation: "生成", meaning: "up", weight: 1, visible: true },
      { id: "e2", from: "b", to: "c", relation: "参照", meaning: "peer", weight: 1, visible: true },
    ],
    layerStyles: { h1: { visible: true, color: "#fff" }, h2: { visible: false, color: "#000" } },
    parentTopicId: null,
    outsideNodeIds: [],
  };
}

describe("strata utils", () => {
  it("buildTopicLayerStyles は既存 style と fallback を返す", () => {
    const topic = makeTopic();
    const styles = buildTopicLayerStyles(topic);
    expect(styles.h1.color).toBe("#fff");
    expect(styles.h2.visible).toBe(false);
  });

  it("buildStrataLayerEntries は時系列情報を集計する", () => {
    const entries = buildStrataLayerEntries(makeTopic());
    expect(entries.find((entry) => entry.layer === "h2")?.count).toBe(2);
    expect(entries.find((entry) => entry.layer === "h2")?.newestDate).toBe("2026-03-20T00:00:00.000Z");
  });

  it("filterTopicByVisibleLayers は hidden layer を除外する", () => {
    const filtered = filterTopicByVisibleLayers(makeTopic());
    expect(filtered.nodes.map((node) => node.id)).toEqual(["a"]);
    expect(filtered.edges).toHaveLength(0);
  });
});
