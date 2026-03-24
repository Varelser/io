import type { NodeItem, TopicItem, EdgeItem } from "../types";
import { newId } from "../utils/id";
import { shiftNodePosition } from "./node-crud";

/**
 * ノード分割: 1ノードを2つの子ノードに分割し、splitFrom エッジを自動作成
 * 元ノードは保持され、2つの新ノードへ derivedFrom/splitFrom のエッジを張る
 */
export function splitNodeInTopic(
  topic: TopicItem,
  sourceNodeId: string,
): { topic: TopicItem; newNodeIds: [string, string] } | null {
  const sourceNode = topic.nodes.find((n) => n.id === sourceNodeId);
  if (!sourceNode) return null;

  const now = new Date().toISOString();
  const id1 = newId("node");
  const id2 = newId("node");

  const child1: NodeItem = {
    ...sourceNode,
    id: id1,
    label: `${sourceNode.label} (1)`,
    position: shiftNodePosition(sourceNode.position, -0.2, 0.15, 0),
    note: "",
    createdAt: now,
    updatedAt: now,
    counterArgumentNodeIds: undefined,
    sharedId: undefined,
    task: undefined,
    confidenceLog: undefined,
  };

  const child2: NodeItem = {
    ...sourceNode,
    id: id2,
    label: `${sourceNode.label} (2)`,
    position: shiftNodePosition(sourceNode.position, 0.2, 0.15, 0),
    note: "",
    createdAt: now,
    updatedAt: now,
    counterArgumentNodeIds: undefined,
    sharedId: undefined,
    task: undefined,
    confidenceLog: undefined,
  };

  const edge1: EdgeItem = {
    id: newId("edge"),
    from: sourceNodeId,
    to: id1,
    relation: "splitFrom",
    meaning: "split child 1",
    weight: 1,
    visible: true,
    transformOp: "split",
  };

  const edge2: EdgeItem = {
    id: newId("edge"),
    from: sourceNodeId,
    to: id2,
    relation: "splitFrom",
    meaning: "split child 2",
    weight: 1,
    visible: true,
    transformOp: "split",
  };

  return {
    topic: {
      ...topic,
      nodes: [...topic.nodes, child1, child2],
      edges: [...topic.edges, edge1, edge2],
    },
    newNodeIds: [id1, id2],
  };
}

/**
 * ノード統合: 2ノードを1つの新ノードに統合
 * 両ノードの note, tags を結合し、mergedFrom エッジを作成
 * 元の2ノードは保持される（削除は呼び出し側の判断）
 */
export function mergeNodesInTopic(
  topic: TopicItem,
  nodeIdA: string,
  nodeIdB: string,
): { topic: TopicItem; mergedNodeId: string } | null {
  const nodeA = topic.nodes.find((n) => n.id === nodeIdA);
  const nodeB = topic.nodes.find((n) => n.id === nodeIdB);
  if (!nodeA || !nodeB) return null;

  const now = new Date().toISOString();
  const mergedId = newId("node");

  const mergedNote = [nodeA.note, nodeB.note].filter(Boolean).join("\n---\n");
  const mergedTags = Array.from(new Set([...(nodeA.tags || []), ...(nodeB.tags || [])]));
  const midPos: [number, number, number] = [
    (nodeA.position[0] + nodeB.position[0]) / 2,
    (nodeA.position[1] + nodeB.position[1]) / 2,
    (nodeA.position[2] + nodeB.position[2]) / 2,
  ];

  const mergedNode: NodeItem = {
    id: mergedId,
    label: `${nodeA.label} + ${nodeB.label}`,
    type: nodeA.type,
    tense: nodeA.tense,
    position: midPos,
    note: mergedNote,
    size: Math.max(nodeA.size, nodeB.size),
    frameScale: nodeA.frameScale,
    group: nodeA.group,
    layer: nodeA.layer,
    depth: nodeA.depth != null && nodeB.depth != null ? Math.max(nodeA.depth, nodeB.depth) : (nodeA.depth ?? nodeB.depth),
    confidence: nodeA.confidence != null && nodeB.confidence != null ? (nodeA.confidence + nodeB.confidence) / 2 : (nodeA.confidence ?? nodeB.confidence),
    tags: mergedTags.length > 0 ? mergedTags : undefined,
    intakeStatus: nodeA.intakeStatus,
    workStatus: nodeA.workStatus,
    evidenceBasis: nodeA.evidenceBasis,
    versionState: "working",
    createdAt: now,
    updatedAt: now,
  };

  const edgeA: EdgeItem = {
    id: newId("edge"),
    from: nodeIdA,
    to: mergedId,
    relation: "mergedFrom",
    meaning: "merged source A",
    weight: 1,
    visible: true,
    transformOp: "integrate",
  };

  const edgeB: EdgeItem = {
    id: newId("edge"),
    from: nodeIdB,
    to: mergedId,
    relation: "mergedFrom",
    meaning: "merged source B",
    weight: 1,
    visible: true,
    transformOp: "integrate",
  };

  return {
    topic: {
      ...topic,
      nodes: [...topic.nodes, mergedNode],
      edges: [...topic.edges, edgeA, edgeB],
    },
    mergedNodeId: mergedId,
  };
}
