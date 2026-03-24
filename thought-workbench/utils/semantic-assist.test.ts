import { describe, expect, it } from "vitest";
import type { NodeItem } from "../types";
import { buildSemanticLayerSummary, buildSemanticRelationSuggestions } from "./semantic-assist";

function makeNode(id: string, label: string, patch: Partial<NodeItem> = {}): NodeItem {
  return {
    id,
    label,
    type: "主張",
    tense: "現在",
    position: [0, 0, 0],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "semantic",
    layer: "h2",
    ...patch,
  };
}

describe("semantic assist", () => {
  it("layer summary は depth 順に並べる", () => {
    const nodes = [
      makeNode("a", "Core", { layer: "h1" }),
      makeNode("b", "Example", { layer: "h3" }),
      makeNode("c", "Bridge", { layer: "h2" }),
    ];
    const result = buildSemanticLayerSummary(nodes);
    expect(result.map((item) => item.layer)).toEqual(["h1", "h2", "h3"]);
  });

  it("relation suggestions は layer 差と node type を反映する", () => {
    const nodes = [
      makeNode("a", "Concept", { layer: "h1", type: "主張" }),
      makeNode("b", "Example", { layer: "h3", type: "根拠" }),
      makeNode("c", "Counter", { layer: "h1", type: "反対意見" }),
    ];
    const downward = buildSemanticRelationSuggestions(nodes, "a", "b");
    expect(downward.some((item) => item.relation === "具体化")).toBe(true);
    expect(downward.some((item) => item.relation === "支持")).toBe(true);

    const counter = buildSemanticRelationSuggestions(nodes, "a", "c");
    expect(counter.some((item) => item.relation === "反論")).toBe(true);
    expect(counter.some((item) => item.relation === "参照")).toBe(true);
  });
});
