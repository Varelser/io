import type { TopicLinkItem } from "../types";
import { canonicalizeRelationType } from "../utils/relation-model";

export function normalizeTopicLinks(links: TopicLinkItem[] | null | undefined, validTopicIds: Set<string>): TopicLinkItem[] {
  if (!Array.isArray(links)) return [];
  const topicLinkDedup = new Set<string>();
  return links.map((link) => ({
    ...link,
    relation: canonicalizeRelationType(link.relation, "references"),
  })).filter((link) => {
    if (!validTopicIds.has(link.from) || !validTopicIds.has(link.to) || link.from === link.to) return false;
    const key = [link.from, link.to].sort().join("<->") + `:${link.relation}:${link.meaning}`;
    if (topicLinkDedup.has(key)) return false;
    topicLinkDedup.add(key);
    return true;
  });
}
