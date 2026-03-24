import type { TopicItem, HistoryFrame } from "../types";
import { newId } from "../utils/id";

export function buildHistorySnapshotFrame(topic: TopicItem): HistoryFrame {
  return {
    id: newId("frame"),
    label: `snapshot ${topic.history.length + 1}`,
    createdAt: new Date().toISOString(),
    nodes: topic.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      size: node.size,
      frameScale: node.frameScale ?? 1,
      label: node.label,
      nodeType: node.type,
      workStatus: node.workStatus,
      intakeStatus: node.intakeStatus,
    })),
  };
}

export function appendHistoryFrameToTopic(topic: TopicItem, frame: HistoryFrame, limit = 24): TopicItem {
  return { ...topic, history: [frame, ...topic.history].slice(0, limit) };
}

export function applyHistoryFrameToTopic(topic: TopicItem, frame: HistoryFrame): TopicItem {
  const byId = new Map(frame.nodes.map((node) => [node.id, node]));
  return {
    ...topic,
    nodes: topic.nodes.map((node) => {
      const hit = byId.get(node.id);
      return hit
        ? { ...node, position: hit.position, size: hit.size, frameScale: typeof hit.frameScale === "number" ? hit.frameScale : (node.frameScale ?? 1) }
        : node;
    }),
  };
}

export function removeHistoryFrameByIdFromTopic(topic: TopicItem, frameId: string): TopicItem {
  return { ...topic, history: topic.history.filter((frame) => frame.id !== frameId) };
}
