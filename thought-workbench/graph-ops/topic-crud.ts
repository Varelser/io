import type { TopicItem, AppState } from "../types";
import { newId } from "../utils/id";
import { round } from "../utils/math";
import { normalizeSourceFilename } from "../utils/slug";
import { createDefaultTopic } from "./topic-factory";
import { createDuplicatedNodeItem } from "./node-crud";
import { removeTopicLinksByTopicId } from "./topic-links-crud";

export function updateTopicListById(topics: TopicItem[], topicId: string, updater: (topic: TopicItem) => TopicItem): TopicItem[] {
  return topics.map((topic) => (topic.id === topicId ? updater(topic) : topic));
}

export function patchTopicItem(topic: TopicItem, patch: Partial<TopicItem>): TopicItem {
  return { ...topic, ...patch };
}

export function appendTopicItemsToState(appState: AppState, appendedTopics: TopicItem[]): AppState {
  if (!appendedTopics.length) return appState;
  appState.topics.push(...appendedTopics);
  return appState;
}

export function removeTopicByIdFromState(appState: AppState, topicId: string): AppState {
  const remainingTopics = appState.topics.filter((topic) => topic.id !== topicId);
  if (!remainingTopics.length) {
    const fallbackTopic = createDefaultTopic("新規トピック 1", 18, 20, 1);
    return { topics: [fallbackTopic], topicLinks: [], journals: appState.journals || [] };
  }
  return {
    topics: remainingTopics,
    topicLinks: removeTopicLinksByTopicId(appState.topicLinks, topicId),
    journals: appState.journals || [],
  };
}

export function removeSelectedTopicInState(appState: AppState, topicId: string) {
  const nextState = removeTopicByIdFromState(appState, topicId);
  return {
    state: nextState,
    nextTopicId: nextState.topics[0]?.id || null,
    nextNodeId: nextState.topics[0]?.nodes[0]?.id || null,
  };
}

export function buildNewTopicItem(topicCount: number): { topic: TopicItem; topicId: string; nodeId: string } {
  const topicId = newId("topic");
  const nodeId = newId("node");
  const title = `新規トピック ${topicCount + 1}`;
  return {
    topicId,
    nodeId,
    topic: {
      ...createDefaultTopic(title, 18 + (topicCount % 4) * 18, 20 + (topicCount % 3) * 16, topicCount + 1),
      id: topicId,
      sourceFile: normalizeSourceFilename(title),
      nodes: [{ id: nodeId, label: "中心", type: "主張", tense: "現在", position: [0, 0, 0], note: "", size: 0.6, frameScale: 1, group: "default", layer: "default" }],
    },
  };
}

export function buildDuplicatedTopicItem(sourceTopic: TopicItem): { topic: TopicItem; firstNodeId: string | null; nodeIdMap: { sourceId: string; sandboxId: string }[] } {
  const nodeIdMap = new Map<string, string>();
  sourceTopic.nodes.forEach((node) => { nodeIdMap.set(node.id, newId("node")); });

  const duplicatedNodes = sourceTopic.nodes.map((node) =>
    createDuplicatedNodeItem(node, { id: nodeIdMap.get(node.id) || newId("node"), labelSuffix: " copy", dx: 0.15, dy: 0.15, dz: 0.1 })
  );

  const duplicatedEdges = sourceTopic.edges
    .map((edge) => ({ ...edge, id: newId("edge"), from: nodeIdMap.get(edge.from) || "", to: nodeIdMap.get(edge.to) || "" }))
    .filter((edge) => !!edge.from && !!edge.to);

  const duplicatedHistory = sourceTopic.history.map((frame) => ({
    ...frame,
    id: newId("frame"),
    nodes: frame.nodes.map((node) => ({ ...node, id: nodeIdMap.get(node.id) || "" })).filter((node) => !!node.id),
  }));

  const duplicatedTopicId = newId("topic");
  const duplicatedTopic: TopicItem = {
    ...sourceTopic,
    id: duplicatedTopicId,
    title: `${sourceTopic.title} copy`,
    sourceFile: normalizeSourceFilename(`${sourceTopic.title} copy`),
    workspace: { ...sourceTopic.workspace, x: round(sourceTopic.workspace.x + 8), y: round(sourceTopic.workspace.y + 6) },
    history: duplicatedHistory,
    mustOneNodeId: sourceTopic.mustOneNodeId ? (nodeIdMap.get(sourceTopic.mustOneNodeId) || null) : null,
    mustOneDate: sourceTopic.mustOneDate || null,
    mustOneHistory: (sourceTopic.mustOneHistory || [])
      .map((entry) => ({
        ...entry,
        nodeId: nodeIdMap.get(entry.nodeId) || "",
      }))
      .filter((entry) => !!entry.nodeId),
    unresolvedTopicLinks: [],
    nodes: duplicatedNodes,
    edges: duplicatedEdges,
  };

  return {
    topic: duplicatedTopic,
    firstNodeId: duplicatedNodes[0]?.id || null,
    nodeIdMap: sourceTopic.nodes.map((node) => ({
      sourceId: node.id,
      sandboxId: nodeIdMap.get(node.id) || "",
    })).filter((item) => !!item.sandboxId),
  };
}
