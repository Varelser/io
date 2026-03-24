import { describe, expect, it } from "vitest";
import type { AppState } from "../types";
import { APP_VERSION } from "../constants/defaults";
import { createPersistEnvelope, parsePersistEnvelope } from "./envelope";

function createState(): AppState {
  return {
    topics: [
      {
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
        unresolvedTopicLinks: [{ targetTitle: "Elsewhere", relation: "参照" }],
        nodes: [
          {
            id: "node-1",
            label: "Node",
            type: "主張",
            tense: "現在",
            position: [0, 0, 0],
            note: "",
            size: 0.6,
            frameScale: 1,
            group: "default",
            layer: "h1",
            intakeStatus: "structured",
            workStatus: "active",
            versionState: "snapshotted",
          },
          {
            id: "node-2",
            label: "Node 2",
            type: "根拠",
            tense: "現在",
            position: [1, 0, 0],
            note: "",
            size: 0.5,
            frameScale: 1,
            group: "support",
            layer: "h2",
          },
        ],
        edges: [{ id: "edge-1", from: "node-1", to: "node-2", relation: "参照", meaning: "", weight: 1, visible: true }],
        parentTopicId: null,
        outsideNodeIds: [],
      },
      {
        id: "topic-2",
        title: "Topic 2",
        folder: "default",
        description: "",
        axisPreset: { x: "x", y: "y", z: "z" },
        workspace: { x: 120, y: 0, size: 100 },
        style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
        history: [],
        paraCategory: "Resources",
        mustOneNodeId: null,
        sourceFile: "topic-2.md",
        unresolvedTopicLinks: [],
        nodes: [],
        edges: [],
        parentTopicId: null,
        outsideNodeIds: [],
      },
    ],
    topicLinks: [{ id: "link-1", from: "topic-1", to: "topic-2", relation: "parent", meaning: "" }],
    journals: [],
    smartFolders: [{
      id: "folder-1",
      label: "Structured",
      filter: { intakeStatus: "structured", workStatus: "active", versionState: "snapshotted", reviewState: "inReview", publicationState: "publishReady", urlState: "verified" },
    }],
  };
}

function createLegacyState() {
  return {
    ...createState(),
    topics: createState().topics.map((topic, topicIndex) => ({
      ...topic,
      nodes: topic.nodes.map((node, nodeIndex) => {
        if (topicIndex === 0 && nodeIndex === 0) {
          return {
            ...node,
            intakeStatus: "placed",
            workStatus: "organizing",
            versionState: "comparison",
          };
        }
        return node;
      }),
    })),
    smartFolders: [{
      id: "folder-1",
      label: "Structured",
      filter: { intakeStatus: "placed", workStatus: "organizing", versionState: "comparison", reviewState: "inReview", publicationState: "publishReady", urlState: "verified" },
    }],
  };
}

describe("persist envelope", () => {
  it("writes the current persist version and canonicalized payload", () => {
    const envelope = createPersistEnvelope(createState());

    expect(envelope.version).toBe(APP_VERSION);
    expect(envelope.state.topics[0].nodes[0].intakeStatus).toBe("structured");
    expect(envelope.state.topics[0].nodes[0].workStatus).toBe("active");
    expect(envelope.state.topics[0].nodes[0].versionState).toBe("snapshotted");
    expect(envelope.state.topics[0].edges[0].relation).toBe("references");
    expect(envelope.state.topicLinks[0].relation).toBe("contains");
    expect(envelope.state.smartFolders?.[0].filter.intakeStatus).toBe("structured");
    expect(envelope.state.smartFolders?.[0].filter.workStatus).toBe("active");
    expect(envelope.state.smartFolders?.[0].filter.versionState).toBe("snapshotted");
  });

  it("parses a legacy envelope and returns normalized runtime state", () => {
    const raw = JSON.stringify({
      version: 4,
      savedAt: "2026-03-22T00:00:00.000Z",
      state: createLegacyState(),
    });

    const parsed = parsePersistEnvelope(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.version).toBe(APP_VERSION);
    expect(parsed?.state.topics[0].nodes[0].intakeStatus).toBe("structured");
    expect(parsed?.state.topics[0].nodes[0].workStatus).toBe("active");
    expect(parsed?.state.topics[0].nodes[0].versionState).toBe("snapshotted");
    expect(parsed?.state.topics[0].edges[0].relation).toBe("references");
    expect(parsed?.state.topicLinks[0].relation).toBe("contains");
    expect(parsed?.state.smartFolders?.[0].filter.intakeStatus).toBe("structured");
    expect(parsed?.state.smartFolders?.[0].filter.workStatus).toBe("active");
    expect(parsed?.state.smartFolders?.[0].filter.versionState).toBe("snapshotted");
  });
});
