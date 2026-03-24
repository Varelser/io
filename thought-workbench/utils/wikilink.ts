import type { NodeItem, TopicItem } from "../types";

/** [[ノード名]] パターン */
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

/** テキストから [[ref]] を全て抽出 */
export function extractWikilinks(text: string): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

/** 全球体のノードラベル → {nodeId, topicId} のインデックスを構築 */
export function buildLabelIndex(topics: TopicItem[]): Map<string, { nodeId: string; topicId: string }> {
  const index = new Map<string, { nodeId: string; topicId: string }>();
  for (const topic of topics) {
    for (const node of topic.nodes) {
      // 大文字小文字を区別しない
      const key = node.label.toLowerCase().trim();
      if (key && !index.has(key)) {
        index.set(key, { nodeId: node.id, topicId: topic.id });
      }
    }
  }
  return index;
}

export type WikilinkMatch = {
  raw: string;      // "[[ノード名]]"
  label: string;    // "ノード名"
  nodeId?: string;
  topicId?: string;
  resolved: boolean;
};

/** テキスト中のwikilinkを解決 */
export function resolveWikilinks(
  text: string,
  index: Map<string, { nodeId: string; topicId: string }>,
): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    const label = m[1].trim();
    const found = index.get(label.toLowerCase());
    matches.push({
      raw: m[0],
      label,
      nodeId: found?.nodeId,
      topicId: found?.topicId,
      resolved: !!found,
    });
  }
  return matches;
}

/** テキストを [text, WikilinkMatch | null][] のセグメントに分割 */
export type TextSegment = { type: "text"; value: string } | { type: "wikilink"; match: WikilinkMatch };

export function parseTextWithWikilinks(
  text: string,
  index: Map<string, { nodeId: string; topicId: string }>,
): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, m.index) });
    }
    const label = m[1].trim();
    const found = index.get(label.toLowerCase());
    segments.push({
      type: "wikilink",
      match: {
        raw: m[0],
        label,
        nodeId: found?.nodeId,
        topicId: found?.topicId,
        resolved: !!found,
      },
    });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}
