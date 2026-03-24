import type { AppState, NodeTask } from "../types";

type ExchangeNodePatch = {
  nodeId: string;
  label?: string;
  type?: string;
  tense?: string;
  layer?: string;
  group?: string;
  confidence?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  note?: string;
  task?: NodeTask;
};

type ExchangeTopicPatch = {
  topicId: string;
  title?: string;
  folder?: string;
  description?: string;
  paraCategory?: string;
  mustOneNodeId?: string | null;
  nodes?: ExchangeNodePatch[];
};

export type ObsidianExchange = {
  kind: "thought-workbench-obsidian-exchange";
  version: number;
  generatedAt?: string;
  source?: string;
  importTargetFolder?: string;
  topics: ExchangeTopicPatch[];
};

export type ObsidianExchangeApplyResult = {
  state: AppState;
  touchedTopics: number;
  touchedNodes: number;
  missingTopicIds: string[];
  missingNodeIds: string[];
  conflictNodeIds: string[];
};

function parseTimestamp(value?: string) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function isObsidianExchange(value: unknown): value is ObsidianExchange {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ObsidianExchange>;
  return candidate.kind === "thought-workbench-obsidian-exchange" && Array.isArray(candidate.topics);
}

export function applyObsidianExchange(state: AppState, exchange: ObsidianExchange): ObsidianExchangeApplyResult {
  const missingTopicIds: string[] = [];
  const missingNodeIds: string[] = [];
  const conflictNodeIds: string[] = [];
  let touchedTopics = 0;
  let touchedNodes = 0;

  const resolvedTopicPatchMap = new Map<string, ExchangeTopicPatch>();
  for (const topicPatch of exchange.topics) {
    const byId = state.topics.find((topic) => topic.id === topicPatch.topicId);
    if (byId) {
      resolvedTopicPatchMap.set(byId.id, topicPatch);
      continue;
    }
    const titleMatches = topicPatch.title ? state.topics.filter((topic) => topic.title === topicPatch.title) : [];
    if (titleMatches.length === 1) {
      resolvedTopicPatchMap.set(titleMatches[0].id, topicPatch);
      continue;
    }
    missingTopicIds.push(topicPatch.topicId || topicPatch.title || "(unknown-topic)");
  }

  const nextState: AppState = {
    ...state,
    topics: state.topics.map((topic) => {
      const topicPatch = resolvedTopicPatchMap.get(topic.id);
      if (!topicPatch) return topic;

      touchedTopics += 1;
      const nodePatches = topicPatch.nodes || [];
      const resolvedNodePatchMap = new Map<string, ExchangeNodePatch>();
      const unresolvedNodeKeys: string[] = [];
      for (const nodePatch of nodePatches) {
        const byId = topic.nodes.find((node) => node.id === nodePatch.nodeId);
        if (byId) {
          resolvedNodePatchMap.set(byId.id, nodePatch);
          continue;
        }
        const labelMatches = nodePatch.label ? topic.nodes.filter((node) => node.label === nodePatch.label) : [];
        if (labelMatches.length === 1) {
          resolvedNodePatchMap.set(labelMatches[0].id, nodePatch);
          continue;
        }
        unresolvedNodeKeys.push(nodePatch.nodeId || nodePatch.label || "(unknown-node)");
      }

      const nextTopic = {
        ...topic,
        title: topicPatch.title ?? topic.title,
        folder: topicPatch.folder ?? topic.folder,
        description: topicPatch.description ?? topic.description,
        paraCategory: topicPatch.paraCategory ?? topic.paraCategory,
        mustOneNodeId: topicPatch.mustOneNodeId !== undefined ? topicPatch.mustOneNodeId : topic.mustOneNodeId,
        nodes: topic.nodes.map((node) => {
          const nodePatch = resolvedNodePatchMap.get(node.id);
          if (!nodePatch) return node;

          const incomingUpdatedAt = parseTimestamp(nodePatch.updatedAt);
          const currentUpdatedAt = parseTimestamp(node.updatedAt);
          if (incomingUpdatedAt !== null && currentUpdatedAt !== null && incomingUpdatedAt < currentUpdatedAt) {
            conflictNodeIds.push(`${topic.id}:${node.id}`);
            return node;
          }
          touchedNodes += 1;
          return {
            ...node,
            label: nodePatch.label ?? node.label,
            type: nodePatch.type ?? node.type,
            tense: nodePatch.tense ?? node.tense,
            layer: nodePatch.layer ?? node.layer,
            group: nodePatch.group ?? node.group,
            confidence: nodePatch.confidence ?? node.confidence,
            tags: nodePatch.tags ?? node.tags,
            createdAt: nodePatch.createdAt ?? node.createdAt,
            updatedAt: nodePatch.updatedAt ?? node.updatedAt,
            note: nodePatch.note ?? node.note,
            task: nodePatch.task ?? node.task,
          };
        }),
      };

      unresolvedNodeKeys.forEach((nodeId) => missingNodeIds.push(`${topic.id}:${nodeId}`));
      return nextTopic;
    }),
  };

  return {
    state: nextState,
    touchedTopics,
    touchedNodes,
    missingTopicIds,
    missingNodeIds,
    conflictNodeIds,
  };
}
