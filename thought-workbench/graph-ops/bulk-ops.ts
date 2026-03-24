import type { NodeItem, EdgeItem, TopicItem } from "../types";
import { newId } from "../utils/id";
import { clamp, round } from "../utils/math";
import { createDuplicatedNodeItem } from "./node-crud";
import { appendEdgesToTopic, createEdgeItem } from "./edge-crud";
import { normalizeNodeToSphere } from "../projection/sphere";

export function buildBulkConnectPairs(nodeIds: string[], mode: "chain" | "pairwise"): Array<[string, string]> {
  const orderedIds = nodeIds.filter((id, index, arr) => !!id && arr.indexOf(id) === index);
  const pairs: Array<[string, string]> = [];
  if (mode === "chain") {
    for (let i = 0; i < orderedIds.length - 1; i += 1) {
      pairs.push([orderedIds[i], orderedIds[i + 1]]);
    }
  } else {
    for (let i = 0; i < orderedIds.length; i += 1) {
      for (let j = i + 1; j < orderedIds.length; j += 1) {
        pairs.push([orderedIds[i], orderedIds[j]]);
      }
    }
  }
  return pairs;
}

export function appendBulkConnectedEdgesToTopic(topic: TopicItem, pairs: Array<[string, string]>, relation: string, meaning: string, weight: number) {
  const exists = new Set(topic.edges.map((edge) => `${edge.from}->${edge.to}:${edge.relation}`));
  const appendedEdges: EdgeItem[] = [];
  let addedCount = 0;
  pairs.forEach(([from, to]) => {
    if (!from || !to || from === to) return;
    const key = `${from}->${to}:${relation}`;
    if (exists.has(key)) return;
    exists.add(key);
    appendedEdges.push(createEdgeItem({ id: newId("edge"), from, to, relation, meaning, weight, visible: true }));
    addedCount += 1;
  });
  return { topic: appendEdgesToTopic(topic, appendedEdges), addedCount };
}

export function buildBulkDuplicatedNodes(topic: TopicItem, selectedIds: Set<string>): { duplicates: NodeItem[]; createdIds: string[] } {
  const createdIds: string[] = [];
  const duplicates = topic.nodes
    .filter((node) => selectedIds.has(node.id))
    .map((node, index) => {
      const id = newId("node");
      createdIds.push(id);
      return createDuplicatedNodeItem(node, { id, labelSuffix: " copy", dx: 0.28 + index * 0.03, dy: 0.18, dz: 0.12 });
    });
  return { duplicates, createdIds };
}

export function clampBulkOffsetValue(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clamp(parsed, -10, 10) : 0;
}

export function clampNodeSizeValue(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clamp(parsed, 0.05, 2.4) : 0.6;
}

export function clampFrameScaleValue(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clamp(parsed, 0.3, 2.6) : 1;
}

export function clampEdgeWeightValue(raw: string | number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clamp(parsed, 0.2, 6) : 1;
}
