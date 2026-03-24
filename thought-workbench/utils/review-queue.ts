import type { NodeItem, TopicItem } from "../types";

export interface ReviewQueueEntry {
  nodeId: string;
  topicId: string;
  topicTitle: string;
  label: string;
  score: number;
  reasons: string[];
}

function staleDays(node: NodeItem): number {
  const ref = node.updatedAt || node.createdAt;
  if (!ref) return 0;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

export function buildReviewQueue(
  topics: TopicItem[],
  maxItems = 100
): ReviewQueueEntry[] {
  const entries: ReviewQueueEntry[] = [];

  for (const topic of topics) {
    const nodes = topic.nodes || [];
    const edges = topic.edges || [];

    for (const node of nodes) {
      let score = 0;
      const reasons: string[] = [];

      // reviewState
      if (node.reviewState === "queued" || node.reviewState === "needsFollowUp") {
        score += 3;
        reasons.push(node.reviewState === "queued" ? "queued for review" : "needs follow-up");
      }

      // staleness
      const days = staleDays(node);
      if (days > 30) {
        const bonus = Math.floor(days / 30);
        score += bonus;
        reasons.push(`stale ${days}d`);
      }

      // low confidence
      if (typeof node.confidence === "number" && node.confidence < 0.5) {
        score += 1;
        reasons.push("low confidence");
      }

      // no edges
      const hasEdge = edges.some((e) => e.from === node.id || e.to === node.id);
      if (!hasEdge) {
        score += 0.5;
        reasons.push("no connections");
      }

      // intake
      if (node.intakeStatus === "inbox" || node.intakeStatus === "staging") {
        score += 1;
        reasons.push(`intake: ${node.intakeStatus}`);
      }

      if (score > 0) {
        entries.push({
          nodeId: node.id,
          topicId: topic.id,
          topicTitle: topic.title || topic.id,
          label: node.label || node.id,
          score,
          reasons,
        });
      }
    }
  }

  return entries.sort((a, b) => b.score - a.score).slice(0, maxItems);
}
