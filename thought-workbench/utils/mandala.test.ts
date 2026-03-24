import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { applyMandalaSlotLayout, buildMandalaSlots, createMandalaLayoutWithCenter } from "./mandala";

function makeNode(id: string, label = id): NodeItem {
  return {
    id,
    label,
    type: "主張",
    tense: "現在",
    position: [9, 9, 9],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "default",
    layer: "h2",
  };
}

function makeTopic(nodes: NodeItem[]): TopicItem {
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
    sourceFile: "topic.md",
    unresolvedTopicLinks: [],
    nodes,
    edges: [],
    parentTopicId: null,
    outsideNodeIds: [],
  };
}

describe("mandala", () => {
  it("buildMandalaSlots は 9 ノードまでを埋める", () => {
    const topic = makeTopic(["a", "b", "c"].map((id) => makeNode(id)));
    const slots = buildMandalaSlots(topic);
    expect(slots.find((slot) => slot.id === "center")?.nodeId).toBe("a");
    expect(slots.find((slot) => slot.id === "top-left")?.nodeId).toBe("b");
    expect(slots.find((slot) => slot.id === "top")?.nodeId).toBe("c");
  });

  it("applyMandalaSlotLayout は slot に合わせて再配置する", () => {
    const topic = makeTopic(["a", "b"].map((id) => makeNode(id)));
    const nodes = applyMandalaSlotLayout(topic, { center: "b", top: "a" });
    expect(nodes.find((node) => node.id === "b")?.position).toEqual([0, 0, 0]);
    expect(nodes.find((node) => node.id === "b")?.group).toBe("center");
    expect(nodes.find((node) => node.id === "a")?.position).toEqual([0, 2, 0]);
    expect(nodes.find((node) => node.id === "a")?.group).toBe("ring");
  });

  it("createMandalaLayoutWithCenter は center 変更時に周辺を詰め直す", () => {
    const topic = makeTopic(["a", "b", "c", "d"].map((id) => makeNode(id)));
    const nodes = createMandalaLayoutWithCenter(topic, "c");
    expect(nodes.find((node) => node.id === "c")?.position).toEqual([0, 0, 0]);
    expect(nodes.find((node) => node.id === "a")?.position).toEqual([-2, 2, 0]);
    expect(nodes.find((node) => node.id === "b")?.position).toEqual([0, 2, 0]);
    expect(nodes.find((node) => node.id === "d")?.position).toEqual([2, 2, 0]);
  });
});
