import { describe, expect, it } from "vitest";
import type { NodeItem, TopicItem, TopicLinkItem } from "../types";
import { applyNodeReasoningPreset, applyTopicFramework, buildTopicMoc } from "./thinking-frameworks";

function createNode(id: string, label: string, layer: string): NodeItem {
  return {
    id,
    label,
    type: "主張",
    tense: "現在",
    position: [0, 0, 2],
    note: "",
    size: 1,
    group: "default",
    layer,
  };
}

function createTopic(id: string, title: string, parentTopicId: string | null = null): TopicItem {
  return {
    id,
    title,
    folder: "Projects",
    description: "",
    axisPreset: { x: "X", y: "Y", z: "Z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: {
      sphereOpacity: 0.1,
      edgeOpacity: 0.3,
      gridOpacity: 0.1,
      nodeScale: 1,
      labelScale: 1,
      perspective: 0.1,
      showLabels: true,
    },
    history: [],
    paraCategory: "Projects",
    mustOneNodeId: "n1",
    sourceFile: "topic.md",
    unresolvedTopicLinks: [],
    nodes: [createNode("n1", "Core claim", "claim"), createNode("n2", "Evidence", "grounds")],
    edges: [],
    parentTopicId,
    canvasRegions: [{ id: "r1", label: "Workspace", color: "rgba(59,130,246,0.4)", bounds: { x: 0, y: 0, w: 20, h: 20 } }],
  };
}

describe("thinking-frameworks", () => {
  it("builds MOC summary from topic hierarchy and links", () => {
    const root = createTopic("t1", "Root");
    const child = createTopic("t2", "Child", "t1");
    const links: TopicLinkItem[] = [{ id: "l1", from: "t1", to: "t2", relation: "supports", meaning: "supports" }];
    const moc = buildTopicMoc(root, [root, child], links, "en");

    expect(moc.parentTitle).toBeNull();
    expect(moc.childTitles).toEqual(["Child"]);
    expect(moc.outgoingLinks[0]).toEqual({ title: "Child", relation: "supports" });
    expect(moc.mustOneLabel).toBe("Core claim");
    expect(moc.markdown).toContain("# MOC: Root");
    expect(moc.markdown).toContain("## Child Topics");
  });

  it("applies an issue tree scaffold with nodes and regions", () => {
    const topic = createTopic("t1", "Root");
    const patch = applyTopicFramework(topic, "issue_tree", "ja");

    expect(patch.nodes.some((node) => node.label === "中心問い")).toBe(true);
    expect(patch.nodes.some((node) => node.label === "選択肢 A")).toBe(true);
    expect(patch.edges.some((edge) => edge.relation === "option")).toBe(true);
    expect((patch.canvasRegions || []).some((region) => region.label === "Drivers")).toBe(true);
    expect(patch.description).toContain("Issue Tree");
  });

  it("applies Toulmin presets without destroying existing tags", () => {
    const node = createNode("n1", "Draft", "misc");
    node.tags = ["existing"];
    const patch = applyNodeReasoningPreset(node, "rebuttal", "ja");

    expect(patch.type).toBe("反対意見");
    expect(patch.layer).toBe("rebuttal");
    expect(patch.group).toBe("toulmin");
    expect(patch.tags).toEqual(expect.arrayContaining(["existing", "toulmin", "rebuttal"]));
    expect(patch.note).toContain("崩れる");
  });
});
