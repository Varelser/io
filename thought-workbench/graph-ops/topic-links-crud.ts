import type { TopicLinkItem, AppState, UnresolvedTopicLink } from "../types";
import { newId } from "../utils/id";
import { updateTopicListById, patchTopicItem } from "./topic-crud";
import { canonicalizeRelationType } from "../utils/relation-model";

export function appendTopicLinkItem(links: TopicLinkItem[], link: TopicLinkItem): TopicLinkItem[] {
  return [...links, link];
}

export function removeTopicLinkById(links: TopicLinkItem[], topicLinkId: string): TopicLinkItem[] {
  return links.filter((link) => link.id !== topicLinkId);
}

export function removeTopicLinksByTopicId(links: TopicLinkItem[], topicId: string): TopicLinkItem[] {
  return links.filter((link) => link.from !== topicId && link.to !== topicId);
}

export function topicLinkExists(links: TopicLinkItem[], from: string, to: string, relation?: string) {
  return links.some((link) => {
    const samePair = (link.from === from && link.to === to) || (link.from === to && link.to === from);
    if (!samePair) return false;
    return relation ? link.relation === relation : true;
  });
}

export function appendTopicLinkIfMissing(links: TopicLinkItem[], link: TopicLinkItem): TopicLinkItem[] {
  return topicLinkExists(links, link.from, link.to, link.relation) ? links : appendTopicLinkItem(links, link);
}

export function createTopicLinkItem(params: { id?: string; from: string; to: string; relation: string; meaning: string }): TopicLinkItem {
  return {
    id: params.id || newId("topic-link"),
    from: params.from,
    to: params.to,
    relation: canonicalizeRelationType(params.relation, "references"),
    meaning: params.meaning,
  };
}

export function resolveUnresolvedTopicLinkInState(appState: AppState, topicId: string, ref: UnresolvedTopicLink, targetId: string, unresolvedIndex: number) {
  appState.topicLinks = appendTopicLinkIfMissing(appState.topicLinks, createTopicLinkItem({
    id: ref.id || newId("topic-link"),
    from: topicId,
    to: targetId,
    relation: canonicalizeRelationType(ref.relation, "references"),
    meaning: ref.meaning || "resolved topic link",
  }));
  appState.topics = updateTopicListById(appState.topics, topicId, (topic) => patchTopicItem(topic, {
    unresolvedTopicLinks: (topic.unresolvedTopicLinks || []).filter((_, i) => i !== unresolvedIndex),
  }));
  return appState;
}
