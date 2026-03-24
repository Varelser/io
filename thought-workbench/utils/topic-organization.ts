import type { MustOneHistoryEntry, TopicItem } from "../types";

export function collectTopicSubtreeIds(topics: TopicItem[], rootTopicId: string) {
  const childMap = new Map<string, string[]>();
  topics.forEach((topic) => {
    if (!topic.parentTopicId) return;
    if (!childMap.has(topic.parentTopicId)) childMap.set(topic.parentTopicId, []);
    childMap.get(topic.parentTopicId)!.push(topic.id);
  });

  const result = new Set<string>();
  const stack = [rootTopicId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    (childMap.get(current) || []).forEach((childId) => stack.push(childId));
  }
  return result;
}

export function buildParaFolderPath(category: string, currentTitle: string, parentFolder?: string) {
  const suffix = currentTitle.trim();
  if (!suffix) return category;
  if (!parentFolder) return `${category}/${suffix}`;
  const normalizedParent = parentFolder.split("/").slice(1).join("/");
  return normalizedParent ? `${category}/${normalizedParent}` : `${category}/${suffix}`;
}

export function appendMustOneHistory(
  history: MustOneHistoryEntry[] | undefined,
  nodeId: string,
  label: string,
  date: string,
) {
  const next = (history || []).filter((entry) => !(entry.date === date && entry.nodeId === nodeId));
  return [{ date, nodeId, label }, ...next].slice(0, 30);
}
