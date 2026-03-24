import { describe, expect, it } from "vitest";
import { createAppendableSampleAppState, createSampleAppState, describeSampleAppState } from "./sample-state";

describe("sample-state", () => {
  it("builds the method studio sample with richer preset coverage", () => {
    const sample = createSampleAppState("method-studio");
    const summary = describeSampleAppState("method-studio");

    expect(sample.topics).toHaveLength(3);
    expect(summary.topics).toBe(3);
    expect(summary.layouts).toBe(1);
    expect(summary.bundles).toBe(1);
    expect(sample.topics[0]?.layerStyles?.backlog?.visible).toBe(false);
    expect(sample.topics[0]?.mustOneHistory).toHaveLength(2);
  });

  it("remaps must-one history node ids on append", () => {
    const appended = createAppendableSampleAppState("method-studio", {
      titleSuffix: "[Imported]",
      workspaceOffset: { x: 12, y: 8 },
    });

    const rootTopic = appended.topics.find((topic) => topic.title.includes("Method Studio"));
    expect(rootTopic).toBeTruthy();
    expect(rootTopic?.mustOneNodeId).not.toBe("stack-decision");
    expect(rootTopic?.mustOneHistory?.some((entry) => entry.nodeId === "stack-decision")).toBe(false);
    expect(rootTopic?.mustOneHistory?.every((entry) => rootTopic.nodes.some((node) => node.id === entry.nodeId))).toBe(true);
  });
});
