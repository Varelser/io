import type { TopicItem, TopicLinkItem, NodeItem, EdgeItem } from "../types";
import { matchesIntakeStatus, matchesWorkStatus } from "./state-model";

export type RepairTarget = "node-layer" | "node-group" | "edge-relation";

export type RepairAction = {
  target: RepairTarget;
  value: string;
  reason: string;
  edgeId?: string;
};

export type MaintenanceIssue = {
  category: string;
  severity: "high" | "medium" | "low";
  label: string;
  topicId: string;
  nodeId?: string;
  edgeId?: string;
  repair?: RepairAction;
};

function countByValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function pickMostCommon(counts: Map<string, number>) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
}

function inferFromNeighbors(topic: TopicItem, nodeId: string, selector: (node: NodeItem) => string) {
  const neighborIds = new Set<string>();
  for (const edge of topic.edges) {
    if (edge.from === nodeId) neighborIds.add(edge.to);
    if (edge.to === nodeId) neighborIds.add(edge.from);
  }
  const neighborValues = topic.nodes
    .filter((node) => neighborIds.has(node.id))
    .map(selector)
    .filter(Boolean);
  return pickMostCommon(countByValues(neighborValues));
}

export function inferNodeLayer(topic: TopicItem, node: NodeItem) {
  const fromNeighbors = inferFromNeighbors(topic, node.id, (candidate) => candidate.layer?.trim() || "");
  if (fromNeighbors) {
    return {
      value: fromNeighbors,
      reason: `neighbor:${fromNeighbors}`,
    };
  }
  const topicMostCommon = pickMostCommon(countByValues(topic.nodes.map((candidate) => candidate.layer?.trim() || "")));
  return {
    value: topicMostCommon || "h1",
    reason: topicMostCommon ? `topic:${topicMostCommon}` : "default:h1",
  };
}

export function inferNodeGroup(topic: TopicItem, node: NodeItem) {
  const fromNeighbors = inferFromNeighbors(topic, node.id, (candidate) => candidate.group?.trim() || "");
  if (fromNeighbors) {
    return {
      value: fromNeighbors,
      reason: `neighbor:${fromNeighbors}`,
    };
  }
  const typeMatched = pickMostCommon(countByValues(
    topic.nodes
      .filter((candidate) => candidate.id !== node.id && candidate.type === node.type)
      .map((candidate) => candidate.group?.trim() || "")
  ));
  if (typeMatched) {
    return {
      value: typeMatched,
      reason: `type:${typeMatched}`,
    };
  }
  const topicMostCommon = pickMostCommon(countByValues(topic.nodes.map((candidate) => candidate.group?.trim() || "")));
  return {
    value: topicMostCommon || "default",
    reason: topicMostCommon ? `topic:${topicMostCommon}` : "default:default",
  };
}

function fallbackRelationForTypes(fromNode?: NodeItem, toNode?: NodeItem) {
  if (!fromNode || !toNode) return "参照";
  if (toNode.type === "根拠") return "根拠";
  if (toNode.type === "反対意見") return "反対意見";
  if (toNode.type === "問い") return "問題提起";
  if (toNode.type === "行動案") return "導出";
  if (fromNode.type === "問い" && toNode.type === "主張") return "解答候補";
  return "参照";
}

export function inferEdgeRelation(topic: TopicItem, edge: EdgeItem) {
  const nodeById = new Map(topic.nodes.map((node) => [node.id, node]));
  const fromNode = nodeById.get(edge.from);
  const toNode = nodeById.get(edge.to);
  const relationCounts = new Map<string, number>();

  for (const candidate of topic.edges) {
    if (candidate.id === edge.id || !candidate.relation?.trim()) continue;
    const candidateFrom = nodeById.get(candidate.from);
    const candidateTo = nodeById.get(candidate.to);
    if (!candidateFrom || !candidateTo) continue;
    if (candidateFrom.type === fromNode?.type && candidateTo.type === toNode?.type) {
      relationCounts.set(candidate.relation, (relationCounts.get(candidate.relation) || 0) + 1);
    }
  }

  const inferred = pickMostCommon(relationCounts) || fallbackRelationForTypes(fromNode, toNode);
  return {
    value: inferred,
    reason: relationCounts.size > 0 ? `pair:${fromNode?.type || "?"}->${toNode?.type || "?"}` : "fallback",
  };
}

export function collectMaintenanceIssues(topics: TopicItem[], topicLinks: TopicLinkItem[]): MaintenanceIssue[] {
  const issues: MaintenanceIssue[] = [];
  const now = Date.now();
  const staleMs = 30 * 24 * 60 * 60 * 1000;
  const labelCount = new Map<string, { count: number; entries: { topicId: string; nodeId: string }[] }>();

  for (const topic of topics) {
    for (const node of topic.nodes) {
      const labelKey = node.label.trim().toLowerCase();
      if (!labelCount.has(labelKey)) labelCount.set(labelKey, { count: 0, entries: [] });
      const entry = labelCount.get(labelKey)!;
      entry.count += 1;
      entry.entries.push({ topicId: topic.id, nodeId: node.id });

      if (matchesIntakeStatus(node.intakeStatus, "inbox")) {
        issues.push({ category: "inbox", severity: "medium", label: `Inbox: ${node.label}`, topicId: topic.id, nodeId: node.id });
      }

      if (node.updatedAt) {
        const age = now - new Date(node.updatedAt).getTime();
        if (age > staleMs && !matchesWorkStatus(node.workStatus, "done") && !matchesWorkStatus(node.workStatus, "frozen") && node.publicationState !== "published" && node.publicationState !== "deprecated") {
          issues.push({ category: "stale", severity: "low", label: `Stale (${Math.floor(age / 86400000)}d): ${node.label}`, topicId: topic.id, nodeId: node.id });
        }
      }

      if ((node.confidence != null && node.confidence < 0.3) && node.evidenceBasis === "unverified") {
        issues.push({ category: "confidence", severity: "high", label: `Low confidence + unverified: ${node.label}`, topicId: topic.id, nodeId: node.id });
      }

      const hasEdge = topic.edges.some((edge) => edge.from === node.id || edge.to === node.id);
      if (!hasEdge && topic.nodes.length > 1) {
        issues.push({ category: "orphan", severity: "low", label: `Orphan: ${node.label}`, topicId: topic.id, nodeId: node.id });
      }

      if (node.materialStatus === "unread") {
        issues.push({ category: "material", severity: "medium", label: `Unread material: ${node.label}`, topicId: topic.id, nodeId: node.id });
      }

      if (node.linkedUrls && node.linkedUrls.length > 0 && !node.evidenceBasis) {
        issues.push({ category: "url", severity: "low", label: `URL unverified: ${node.label}`, topicId: topic.id, nodeId: node.id });
      }

      if (!node.layer?.trim()) {
        const inferred = inferNodeLayer(topic, node);
        issues.push({
          category: "missing-layer",
          severity: "medium",
          label: `Missing layer: ${node.label}`,
          topicId: topic.id,
          nodeId: node.id,
          repair: {
            target: "node-layer",
            value: inferred.value,
            reason: inferred.reason,
          },
        });
      }

      if (!node.group?.trim()) {
        const inferred = inferNodeGroup(topic, node);
        issues.push({
          category: "missing-group",
          severity: "medium",
          label: `Missing group: ${node.label}`,
          topicId: topic.id,
          nodeId: node.id,
          repair: {
            target: "node-group",
            value: inferred.value,
            reason: inferred.reason,
          },
        });
      }
    }

    const nodeIds = new Set(topic.nodes.map((node) => node.id));
    for (const edge of topic.edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        issues.push({ category: "broken", severity: "high", label: `Broken edge: ${edge.from} → ${edge.to}`, topicId: topic.id });
      }

      if (!edge.relation?.trim()) {
        const inferred = inferEdgeRelation(topic, edge);
        issues.push({
          category: "missing-relation",
          severity: "medium",
          label: `Missing relation: ${edge.from} → ${edge.to}`,
          topicId: topic.id,
          edgeId: edge.id,
          repair: {
            target: "edge-relation",
            value: inferred.value,
            reason: inferred.reason,
            edgeId: edge.id,
          },
        });
      }
    }
  }

  for (const [name, entry] of labelCount) {
    if (entry.count > 1) {
      for (const duplicate of entry.entries) {
        issues.push({ category: "duplicate", severity: "medium", label: `Duplicate name: "${name}"`, topicId: duplicate.topicId, nodeId: duplicate.nodeId });
      }
    }
  }

  const topicIds = new Set(topics.map((topic) => topic.id));
  for (const link of topicLinks) {
    if (!topicIds.has(link.from) || !topicIds.has(link.to)) {
      issues.push({ category: "broken", severity: "high", label: `Broken topic link: ${link.from} → ${link.to}`, topicId: link.from });
    }
  }

  return issues;
}
