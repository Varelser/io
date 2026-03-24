import type { TopicItem, NodeItem } from "../types";
import { matchesIntakeStatus, matchesWorkStatus } from "./state-model";

/** レーベンシュタイン距離 */
function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[la][lb];
}

/** 正規化された類似度 (0.0 = 完全不一致, 1.0 = 完全一致) */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export type SuggestionKind = "similar-name" | "similar-tags" | "link-candidate" | "merge-candidate" | "orphan";

export type Suggestion = {
  kind: SuggestionKind;
  message: string;
  nodeIdA: string;
  topicIdA: string;
  nodeIdB?: string;
  topicIdB?: string;
  score: number;
};

/**
 * 全トピックを横断して類似ノード・マージ候補・リンク候補を検出する。
 * 提案型: 結果を表示するだけで、自動的な変更は行わない。
 */
export function detectSuggestions(topics: TopicItem[], maxResults = 30): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Flatten all nodes with their topic context
  const allNodes: { node: NodeItem; topicId: string; topicTitle: string }[] = [];
  for (const topic of topics) {
    for (const node of topic.nodes) {
      allNodes.push({ node, topicId: topic.id, topicTitle: topic.title });
    }
  }

  // Detect similar names (O(n²) but limited by maxResults)
  const SIMILARITY_THRESHOLD = 0.7;
  const seen = new Set<string>();

  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const a = allNodes[i];
      const b = allNodes[j];
      if (a.node.id === b.node.id) continue;

      const labelA = a.node.label.toLowerCase().trim();
      const labelB = b.node.label.toLowerCase().trim();

      // Skip very short labels
      if (labelA.length < 3 || labelB.length < 3) continue;

      const sim = similarity(labelA, labelB);
      const pairKey = [a.node.id, b.node.id].sort().join(":");

      if (sim >= SIMILARITY_THRESHOLD && !seen.has(pairKey)) {
        seen.add(pairKey);

        if (sim >= 0.95) {
          suggestions.push({
            kind: "merge-candidate",
            message: `ほぼ同名: "${a.node.label}" ≈ "${b.node.label}" (${(sim * 100).toFixed(0)}%)`,
            nodeIdA: a.node.id,
            topicIdA: a.topicId,
            nodeIdB: b.node.id,
            topicIdB: b.topicId,
            score: sim,
          });
        } else if (sim >= 0.8) {
          suggestions.push({
            kind: "similar-name",
            message: `類似名: "${a.node.label}" ≈ "${b.node.label}" (${(sim * 100).toFixed(0)}%)`,
            nodeIdA: a.node.id,
            topicIdA: a.topicId,
            nodeIdB: b.node.id,
            topicIdB: b.topicId,
            score: sim,
          });
        } else {
          suggestions.push({
            kind: "link-candidate",
            message: `関連候補: "${a.node.label}" ↔ "${b.node.label}" (${(sim * 100).toFixed(0)}%)`,
            nodeIdA: a.node.id,
            topicIdA: a.topicId,
            nodeIdB: b.node.id,
            topicIdB: b.topicId,
            score: sim,
          });
        }
      }

      // Tag overlap detection
      const tagsA = new Set(a.node.tags || []);
      const tagsB = new Set(b.node.tags || []);
      if (tagsA.size > 0 && tagsB.size > 0) {
        const overlap = [...tagsA].filter((t) => tagsB.has(t));
        if (overlap.length >= 2 && !seen.has(`tags:${pairKey}`)) {
          seen.add(`tags:${pairKey}`);
          suggestions.push({
            kind: "similar-tags",
            message: `共通タグ(${overlap.length}): "${a.node.label}" ↔ "${b.node.label}" [${overlap.join(", ")}]`,
            nodeIdA: a.node.id,
            topicIdA: a.topicId,
            nodeIdB: b.node.id,
            topicIdB: b.topicId,
            score: overlap.length / Math.max(tagsA.size, tagsB.size),
          });
        }
      }
    }
  }

  // Orphan nodes (no edges, not in inbox)
  for (const topic of topics) {
    const nodeIds = new Set(topic.nodes.map((n) => n.id));
    for (const node of topic.nodes) {
      if (topic.nodes.length <= 1) continue;
      const hasEdge = topic.edges.some((e) => e.from === node.id || e.to === node.id);
      if (!hasEdge && !matchesIntakeStatus(node.intakeStatus, "inbox") && !matchesWorkStatus(node.workStatus, "frozen")) {
        suggestions.push({
          kind: "orphan",
          message: `孤立: "${node.label}" (${topic.title})`,
          nodeIdA: node.id,
          topicIdA: topic.id,
          score: 0.5,
        });
      }
    }
  }

  // Sort by score descending, limit
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, maxResults);
}
