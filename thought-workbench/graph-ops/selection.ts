import type { AppState } from "../types";

export function resolveSelectionIds(nextState: AppState, preferredTopicId: string | null, preferredNodeId: string | null) {
  const nextTopic = nextState.topics.find((topic) => topic.id === preferredTopicId) || nextState.topics[0] || null;
  const nextNode = nextTopic?.nodes.find((node) => node.id === preferredNodeId) || nextTopic?.nodes[0] || null;
  return {
    topicId: nextTopic?.id || null,
    nodeId: nextNode?.id || null,
  };
}

export function getInitialSelectionState(initialState: AppState) {
  return resolveSelectionIds(initialState, initialState.topics[0]?.id || null, initialState.topics[0]?.nodes[0]?.id || null);
}
