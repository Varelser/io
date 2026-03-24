import type { TopicItem, AppState } from "../types";
import { NL } from "../constants/defaults";
import { normalizeSourceFilename } from "../utils/slug";
import { serializeTopicToMarkdown } from "./serializer";

export function getTopicMarkdownFilename(topic: TopicItem) {
  return topic.sourceFile || normalizeSourceFilename(topic.title);
}

export function buildAllTopicsMarkdownBundle(appState: AppState) {
  return appState.topics
    .map((topic) => `<!-- topic-file: ${getTopicMarkdownFilename(topic)} -->${NL}${serializeTopicToMarkdown(topic, appState.topicLinks, appState.topics)}`)
    .join(`${NL}${NL}${NL}`);
}
