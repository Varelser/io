import { describe, expect, it } from "vitest";
import type { TopicItem } from "../types";
import { countSmartFolderMatches, findFirstSmartFolderMatch, matchesSmartFolderFilter, sanitizeSmartFolderFilter } from "./smart-folder";

function makeTopic(): TopicItem {
  return {
    id: "topic-1",
    title: "Topic",
    folder: "default",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    workspace: { x: 0, y: 0, size: 100 },
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    history: [],
    paraCategory: "Resources",
    mustOneNodeId: null,
    sourceFile: "topic.md",
    unresolvedTopicLinks: [],
    nodes: [
      {
        id: "node-1",
        label: "Alpha",
        type: "claim",
        tense: "present",
        position: [0, 0, 0],
        note: "verified note",
        size: 0.6,
        frameScale: 1,
        group: "core",
        layer: "h1",
        intakeStatus: "structured",
        workStatus: "review",
        versionState: "snapshotted",
        reviewState: "inReview",
        publicationState: "publishReady",
        urlState: "verified",
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        confidence: 0.2,
      },
      {
        id: "node-2",
        label: "Beta",
        type: "question",
        tense: "present",
        position: [1, 0, 0],
        note: "orphan",
        size: 0.5,
        frameScale: 1,
        group: "edge",
        layer: "h2",
        intakeStatus: "inbox",
        workStatus: "onHold",
        versionState: "working",
        reviewState: "queued",
        publicationState: "private",
        urlState: "broken",
        updatedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        confidence: 0.9,
      },
    ],
    edges: [{ id: "edge-1", from: "node-1", to: "node-2", relation: "references", meaning: "", weight: 1, visible: true }],
    parentTopicId: null,
    outsideNodeIds: [],
  };
}

describe("smart folder utils", () => {
  it("matches canonical and legacy-alias filter values", () => {
    const topic = makeTopic();
    expect(matchesSmartFolderFilter(topic.nodes[0], topic, {
      intakeStatus: "placed",
      versionState: "comparison",
      reviewState: "inReview",
      publicationState: "publishReady",
      urlState: "verified",
    })).toBe(true);
  });

  it("counts matches and finds the first matching node", () => {
    const topics = [makeTopic()];
    expect(countSmartFolderMatches(topics, { workStatus: "review" })).toBe(1);
    expect(findFirstSmartFolderMatch(topics, { workStatus: "review" })).toEqual({ topicId: "topic-1", nodeId: "node-1" });
    expect(findFirstSmartFolderMatch(topics, { hasEdges: false, workStatus: "review" })).toBeNull();
  });

  it("sanitizes empty filter values", () => {
    expect(sanitizeSmartFolderFilter({
      textMatch: "  alpha  ",
      workStatus: "",
      hasEdges: false,
      lowConfidence: 2,
    })).toEqual({
      textMatch: "alpha",
      hasEdges: false,
      lowConfidence: 1,
    });
  });
});
