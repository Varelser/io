import type { NodeItem, TopicItem, TopicLinkItem } from "../types";

export function collectUniqueNodeFieldValues(nodes: NodeItem[] | undefined, key: "layer" | "group") {
  return Array.from(new Set((nodes || []).map((node) => node[key]).filter(Boolean))).sort();
}

export function filterTopicNodes(topic: TopicItem | null, searchQuery: string, layerFilter: string, groupFilter: string) {
  if (!topic) return null;
  const q = searchQuery.trim().toLowerCase();
  const nodes = topic.nodes.filter((node) => {
    const hitQuery = !q || node.label.toLowerCase().includes(q) || node.note.toLowerCase().includes(q);
    const hitLayer = !layerFilter || node.layer === layerFilter;
    const hitGroup = !groupFilter || node.group === groupFilter;
    return hitQuery && hitLayer && hitGroup;
  });
  const allowed = new Set(nodes.map((node) => node.id));
  const edges = topic.edges.filter((edge) => allowed.has(edge.from) && allowed.has(edge.to));
  return { ...topic, nodes, edges };
}

export function searchNodesInTopic(topic: TopicItem | null, searchQuery: string) {
  const q = searchQuery.trim().toLowerCase();
  if (!q || !topic) return [];
  return topic.nodes.filter((node) => node.label.toLowerCase().includes(q) || node.note.toLowerCase().includes(q)).slice(0, 10);
}

export function buildSphereTopic(selectedTopic: TopicItem | null, filteredTopic: TopicItem | null) {
  if (!selectedTopic) return null;
  if (!filteredTopic) return selectedTopic;
  return { ...selectedTopic, nodes: filteredTopic.nodes, edges: filteredTopic.edges };
}

export function selectTopicLinksForTopic(topic: TopicItem | null, topicLinks: TopicLinkItem[]) {
  return topic ? topicLinks.filter((link) => link.from === topic.id || link.to === topic.id) : [];
}
