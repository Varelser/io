import type { NodeItem, TopicItem } from "../types";
import { newId } from "../utils/id";
import { round } from "../utils/math";
import { createDefaultCenterNode } from "../constants/defaults";
import { autoNodePosition } from "../projection/sphere";

export function appendNodesToTopic(topic: TopicItem, appendedNodes: NodeItem[]): TopicItem {
  if (!appendedNodes.length) return topic;
  return { ...topic, nodes: [...topic.nodes, ...appendedNodes] };
}

export function updateNodeByIdInTopic(topic: TopicItem, nodeId: string, updater: (node: NodeItem) => NodeItem): TopicItem {
  return { ...topic, nodes: topic.nodes.map((node) => (node.id === nodeId ? updater(node) : node)) };
}

export function removeNodesFromTopic(topic: TopicItem, removedIds: Set<string>): TopicItem {
  let nextNodes = topic.nodes.filter((node) => !removedIds.has(node.id));
  if (!nextNodes.length) {
    nextNodes = [createDefaultCenterNode(newId("node"))];
  }
  const nextIds = new Set(nextNodes.map((node) => node.id));
  return normalizeTopicGraphAfterNodeFilter({ ...topic, nodes: nextNodes }, nextIds);
}

export function normalizeTopicGraphAfterNodeFilter(topic: TopicItem, allowedIds: Set<string>): TopicItem {
  return {
    ...topic,
    edges: topic.edges.filter((edge) => allowedIds.has(edge.from) && allowedIds.has(edge.to)),
    history: topic.history.map((frame) => ({
      ...frame,
      nodes: frame.nodes.filter((node) => allowedIds.has(node.id)),
    })),
    mustOneNodeId: topic.mustOneNodeId && allowedIds.has(topic.mustOneNodeId) ? topic.mustOneNodeId : null,
  };
}

export function mapSelectedNodesInTopic(topic: TopicItem, selectedIds: Set<string>, mapper: (node: NodeItem) => NodeItem): TopicItem {
  return { ...topic, nodes: topic.nodes.map((node) => (selectedIds.has(node.id) ? mapper(node) : node)) };
}

export function buildNewNodeItem(nodeCount: number, nextId?: string): NodeItem {
  const id = nextId || newId("node");
  return {
    id,
    label: `新規ノード ${nodeCount + 1}`,
    type: "主張",
    tense: "現在",
    position: autoNodePosition(nodeCount, nodeCount + 1),
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "default",
    layer: "h1",
  };
}

export function shiftNodePosition(position: [number, number, number], dx: number, dy: number, dz: number): [number, number, number] {
  return [round(position[0] + dx), round(position[1] + dy), round(position[2] + dz)];
}

export function createDuplicatedNodeItem(node: NodeItem, options?: { id?: string; labelSuffix?: string; dx?: number; dy?: number; dz?: number }): NodeItem {
  const nextId = options?.id || newId("node");
  const dx = typeof options?.dx === "number" ? options.dx : 0.28;
  const dy = typeof options?.dy === "number" ? options.dy : 0.18;
  const dz = typeof options?.dz === "number" ? options.dz : 0.12;
  return {
    ...node,
    id: nextId,
    label: options?.labelSuffix ? `${node.label}${options.labelSuffix}` : node.label,
    position: shiftNodePosition(node.position, dx, dy, dz),
  };
}

export function removeSelectedNodesInTopic(topic: TopicItem, selectedIds: Set<string>) {
  const nextTopic = removeNodesFromTopic(topic, selectedIds);
  return {
    topic: nextTopic,
    nextSelectedNodeId: nextTopic.nodes[0]?.id || null,
  };
}
