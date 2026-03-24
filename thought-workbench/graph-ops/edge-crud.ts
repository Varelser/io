import type { EdgeItem, TopicItem } from "../types";
import { newId } from "../utils/id";
import { canonicalizeRelationType } from "../utils/relation-model";

export function updateEdgeListInTopic(topic: TopicItem, updater: (edges: EdgeItem[]) => EdgeItem[]): TopicItem {
  return { ...topic, edges: updater(topic.edges) };
}

export function appendEdgesToTopic(topic: TopicItem, appendedEdges: EdgeItem[]): TopicItem {
  if (!appendedEdges.length) return topic;
  return updateEdgeListInTopic(topic, (edges) => [...edges, ...appendedEdges]);
}

export function updateEdgeByIdInTopic(topic: TopicItem, edgeId: string, updater: (edge: EdgeItem) => EdgeItem): TopicItem {
  return updateEdgeListInTopic(topic, (edges) => edges.map((edge) => (edge.id === edgeId ? updater(edge) : edge)));
}

export function removeEdgeByIdFromTopic(topic: TopicItem, edgeId: string): TopicItem {
  return updateEdgeListInTopic(topic, (edges) => edges.filter((edge) => edge.id !== edgeId));
}

export function createEdgeItem(params: { id?: string; from: string; to: string; relation: string; meaning: string; weight?: number; visible?: boolean; contradictionType?: EdgeItem["contradictionType"]; transformOp?: EdgeItem["transformOp"] }): EdgeItem {
  return {
    id: params.id || newId("edge"),
    from: params.from,
    to: params.to,
    relation: canonicalizeRelationType(params.relation, "references"),
    meaning: params.meaning,
    weight: typeof params.weight === "number" ? params.weight : 1,
    visible: typeof params.visible === "boolean" ? params.visible : true,
    contradictionType: params.contradictionType,
    transformOp: params.transformOp,
  };
}
