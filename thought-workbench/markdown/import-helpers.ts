import type { TopicItem, AppState, ImportResult, UnresolvedTopicLink } from "../types";
import { newId } from "../utils/id";
import { normalizeSourceFilename } from "../utils/slug";
import { normalizeState } from "../normalize/state";
import { appendTopicLinkIfMissing, createTopicLinkItem } from "../graph-ops/topic-links-crud";

export function normalizeSingleTopicForImport(input: TopicItem | null | undefined): TopicItem {
  const normalized = normalizeState({ topics: [input as TopicItem], topicLinks: [], journals: [] }).topics[0];
  return {
    ...normalized,
    title: normalized.title || "Imported Topic",
    sourceFile: normalized.sourceFile || normalizeSourceFilename(normalized.title || "Imported Topic"),
    unresolvedTopicLinks: Array.isArray(normalized.unresolvedTopicLinks) ? normalized.unresolvedTopicLinks : [],
  };
}

export function describeImportDelta(before: TopicItem | null | undefined, after: TopicItem) {
  const messages: string[] = [];
  const beforeNodes = Array.isArray(before?.nodes) ? before!.nodes.length : 0;
  const afterNodes = Array.isArray(after.nodes) ? after.nodes.length : 0;
  const beforeEdges = Array.isArray(before?.edges) ? before!.edges.length : 0;
  const afterEdges = Array.isArray(after.edges) ? after.edges.length : 0;
  if (!beforeNodes && afterNodes) messages.push("nodes repaired");
  if (beforeEdges !== afterEdges) messages.push(`edges ${beforeEdges}→${afterEdges}`);
  if (beforeNodes !== afterNodes && beforeNodes > 0) messages.push(`nodes ${beforeNodes}→${afterNodes}`);
  if (!messages.length) messages.push("ok");
  return messages.join(" / ");
}

export function buildImportReport(label: string, results: ImportResult[]) {
  const okCount = results.filter((item) => item.ok).length;
  const failCount = results.length - okCount;
  const lines = [`${label}: ${okCount} ok / ${failCount} failed`];
  results.slice(0, 8).forEach((item) => {
    lines.push(`${item.source}: ${item.message}`);
  });
  return lines.join(" | ");
}

export function createImportedTopicPlacement(baseCount: number, index: number) {
  return {
    x: 18 + ((baseCount + index) % 4) * 18,
    y: 18 + ((baseCount + index) % 3) * 16,
  };
}

export function resolveImportedTopicLinkRefs(prev: AppState, topic: TopicItem, titleToId: Map<string, string>, fileToId: Map<string, string>) {
  const unresolved: UnresolvedTopicLink[] = [];
  ((topic as any).topicLinkRefs || []).forEach((ref: UnresolvedTopicLink) => {
    const targetId = fileToId.get(ref.targetFile || "") || titleToId.get(ref.targetTitle || "") || ref.targetId;
    if (!targetId || targetId === topic.id) {
      unresolved.push(ref);
      return;
    }
    prev.topicLinks = appendTopicLinkIfMissing(prev.topicLinks, createTopicLinkItem({
      id: ref.id || newId("topic-link"),
      from: topic.id,
      to: targetId,
      relation: ref.relation || "参照",
      meaning: ref.meaning || "imported topic link",
    }));
  });
  topic.unresolvedTopicLinks = unresolved;
  delete (topic as any).topicLinkRefs;
}

export function mergeImportedTopicsIntoState(prev: AppState, imported: TopicItem[]) {
  const titleToId = new Map(prev.topics.map((topic) => [topic.title, topic.id]));
  const fileToId = new Map(prev.topics.map((topic) => [topic.sourceFile || normalizeSourceFilename(topic.title || "topic"), topic.id]));

  imported.forEach((topic, index) => {
    const placement = createImportedTopicPlacement(prev.topics.length, index);
    topic.workspace.x = placement.x;
    topic.workspace.y = placement.y;
    titleToId.set(topic.title, topic.id);
    fileToId.set(topic.sourceFile || normalizeSourceFilename(topic.title || "topic"), topic.id);
    prev.topics.push(topic);
  });

  imported.forEach((topic) => {
    resolveImportedTopicLinkRefs(prev, topic, titleToId, fileToId);
  });

  return prev;
}
