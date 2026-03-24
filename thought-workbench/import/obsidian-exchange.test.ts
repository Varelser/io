import { describe, expect, it } from "vitest";
import { applyObsidianExchange, isObsidianExchange } from "./obsidian-exchange";
import { createSampleAppState } from "../utils/sample-state";

describe("obsidian-exchange", () => {
  it("detects exchange payloads", () => {
    expect(isObsidianExchange({ kind: "thought-workbench-obsidian-exchange", topics: [] })).toBe(true);
    expect(isObsidianExchange({ kind: "other", topics: [] })).toBe(false);
  });

  it("applies topic and node patches onto existing state", () => {
    const state = createSampleAppState("story-branch");
    const result = applyObsidianExchange(state, {
      kind: "thought-workbench-obsidian-exchange",
      version: 1,
      topics: [
        {
          topicId: "topic-story",
          title: "Story Engine Updated",
          description: "Imported from Obsidian",
          mustOneNodeId: "story-theme",
          nodes: [
            {
              nodeId: "story-theme",
              label: "Theme from Vault",
              note: "Updated note body",
              tags: ["theme", "vault"],
              task: { status: "todo", priority: 3 },
            },
          ],
        },
      ],
    });

    expect(result.touchedTopics).toBe(1);
    expect(result.touchedNodes).toBe(1);
    expect(result.missingTopicIds).toEqual([]);
    expect(result.missingNodeIds).toEqual([]);
    expect(result.conflictNodeIds).toEqual([]);
    expect(result.state.topics.find((topic) => topic.id === "topic-story")?.title).toBe("Story Engine Updated");
    expect(result.state.topics.find((topic) => topic.id === "topic-story")?.mustOneNodeId).toBe("story-theme");
    expect(result.state.topics.find((topic) => topic.id === "topic-story")?.nodes.find((node) => node.id === "story-theme")?.label).toBe("Theme from Vault");
  });

  it("skips stale node patches when current state is newer", () => {
    const state = createSampleAppState("story-branch");
    const currentLabel = state.topics.find((topic) => topic.id === "topic-story")?.nodes.find((node) => node.id === "story-theme")?.label;
    const result = applyObsidianExchange(state, {
      kind: "thought-workbench-obsidian-exchange",
      version: 1,
      topics: [
        {
          topicId: "topic-story",
          nodes: [
            {
              nodeId: "story-theme",
              label: "Stale Vault Label",
              updatedAt: "2026-03-01T00:00:00.000Z",
            },
          ],
        },
      ],
    });

    expect(result.touchedNodes).toBe(0);
    expect(result.conflictNodeIds).toEqual(["topic-story:story-theme"]);
    expect(result.state.topics.find((topic) => topic.id === "topic-story")?.nodes.find((node) => node.id === "story-theme")?.label).toBe(currentLabel);
  });

  it("falls back to topic title and node label when ids do not match", () => {
    const state = createSampleAppState("story-branch");
    const result = applyObsidianExchange(state, {
      kind: "thought-workbench-obsidian-exchange",
      version: 1,
      topics: [
        {
          topicId: "missing-topic-id",
          title: "作品構想 / Story Engine",
          nodes: [
            {
              nodeId: "missing-node-id",
              label: "作品核",
              note: "Matched by label fallback",
            },
          ],
        },
      ],
    });

    expect(result.touchedTopics).toBe(1);
    expect(result.touchedNodes).toBe(1);
    expect(result.missingTopicIds).toEqual([]);
    expect(result.missingNodeIds).toEqual([]);
    expect(result.state.topics.find((topic) => topic.id === "topic-story")?.nodes.find((node) => node.id === "story-core")?.note).toBe("Matched by label fallback");
  });
});
