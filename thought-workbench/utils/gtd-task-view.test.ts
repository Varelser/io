import { describe, expect, it, vi } from "vitest";
import type { NodeItem, TopicItem } from "../types";
import { buildGtdTaskSummary } from "./gtd-task-view";

function makeNode(patch: Partial<NodeItem> & Pick<NodeItem, "id" | "label">): NodeItem {
  const { id, label, ...rest } = patch;
  return {
    id,
    label,
    type: "タスク",
    tense: "現在",
    position: [0, 0, 0],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "gtd",
    layer: "gtd",
    ...rest,
  };
}

function makeTopic(nodes: NodeItem[]): TopicItem {
  return {
    id: "topic-1",
    title: "Task Flow",
    folder: "Tasks",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Projects",
    mustOneNodeId: null,
    sourceFile: "task.md",
    unresolvedTopicLinks: [],
    nodes,
    edges: [],
    activeMethods: ["task-gtd"],
    parentTopicId: null,
    outsideNodeIds: [],
  };
}

describe("buildGtdTaskSummary", () => {
  it("next / waiting / review / inbox を GTD signal から抽出する", () => {
    vi.setSystemTime(new Date("2026-03-21T00:00:00.000Z"));
    const topic = makeTopic([
      makeNode({ id: "next-1", label: "Next", group: "next", layer: "next", task: { status: "todo", priority: 3 }, updatedAt: "2026-03-20T00:00:00.000Z" }),
      makeNode({ id: "waiting-1", label: "Waiting", group: "waiting", layer: "waiting", task: { status: "todo", priority: 2 }, workStatus: "onHold", updatedAt: "2026-03-11T00:00:00.000Z" }),
      makeNode({ id: "review-1", label: "Review", group: "review", layer: "review", task: { status: "todo", priority: 1 }, workStatus: "review", updatedAt: "2026-03-01T00:00:00.000Z" }),
      makeNode({ id: "inbox-1", label: "Inbox", group: "inbox", layer: "inbox", task: { status: "todo", priority: 1 }, workStatus: "unprocessed" }),
      makeNode({ id: "done-1", label: "Done", group: "done", layer: "done", task: { status: "done", priority: 1 } }),
    ]);

    const summary = buildGtdTaskSummary([topic]);
    expect(summary.gtdSignalsDetected).toBe(true);
    expect(summary.nextActions[0]?.nodeId).toBe("next-1");
    expect(summary.waitingItems.some((item) => item.nodeId === "waiting-1")).toBe(true);
    expect(summary.reviewItems.some((item) => item.nodeId === "review-1")).toBe(true);
    expect(summary.inboxItems.some((item) => item.nodeId === "inbox-1")).toBe(true);
    expect(summary.staleTasks.some((item) => item.nodeId === "review-1")).toBe(true);
    expect(summary.weeklyReview.find((item) => item.id === "wins")?.count).toBe(1);
    vi.useRealTimers();
  });

  it("gtd signal がなくても task から next action を作る", () => {
    const topic = makeTopic([
      makeNode({ id: "todo-1", label: "Todo", group: "default", layer: "h1", task: { status: "todo", priority: 5 } }),
    ]);
    topic.activeMethods = [];

    const summary = buildGtdTaskSummary([topic]);
    expect(summary.gtdSignalsDetected).toBe(false);
    expect(summary.nextActions.some((item) => item.nodeId === "todo-1")).toBe(true);
  });
});
