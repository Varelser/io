/**
 * search.worker.ts — 全トピック横断検索を Web Worker でオフロードする。
 *
 * メインスレッドから postMessage({ type: "search", query, topics }) を受取り、
 * 検索完了後に postMessage({ type: "result", results }) で返す。
 *
 * 使い方 (メインスレッド):
 *   const worker = new Worker(new URL("../workers/search.worker.ts", import.meta.url), { type: "module" });
 *   worker.postMessage({ type: "search", query: "ノードA", topics });
 *   worker.onmessage = (e) => { const { results } = e.data; };
 */

import type { TopicItem, NodeItem } from "../types";

export type SearchWorkerRequest =
  | { type: "search"; query: string; topics: TopicItem[] }
  | { type: "ping" };

export type SearchWorkerResult =
  | { type: "result"; results: SearchResult[] }
  | { type: "pong" };

export type SearchResult = {
  topicId: string;
  topicTitle: string;
  node: NodeItem;
  score: number;
};

/** ノードのテキストフィールドを結合した検索対象文字列を生成 */
function buildSearchTarget(node: NodeItem): string {
  return [
    node.label,
    node.note ?? "",
    (node.tags ?? []).join(" "),
    node.group ?? "",
    node.layer ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

/** クエリをトークンに分割 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s\u3000\u30fb、。,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** トークン全一致スコア（全トークンが含まれるほど高スコア） */
function score(target: string, tokens: string[]): number {
  if (!tokens.length) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (target.includes(t)) hits++;
  }
  return hits / tokens.length;
}

function search(query: string, topics: TopicItem[]): SearchResult[] {
  if (!query.trim()) return [];
  const tokens = tokenize(query);
  const results: SearchResult[] = [];
  for (const topic of topics) {
    for (const node of topic.nodes) {
      const target = buildSearchTarget(node);
      const s = score(target, tokens);
      if (s > 0) {
        results.push({
          topicId: topic.id,
          topicTitle: topic.title,
          node,
          score: s,
        });
      }
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

// Worker メッセージハンドラ
self.onmessage = (e: MessageEvent<SearchWorkerRequest>) => {
  const msg = e.data;
  if (msg.type === "ping") {
    self.postMessage({ type: "pong" } satisfies SearchWorkerResult);
    return;
  }
  if (msg.type === "search") {
    const results = search(msg.query, msg.topics);
    self.postMessage({ type: "result", results } satisfies SearchWorkerResult);
  }
};
