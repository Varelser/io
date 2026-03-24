import type { NodeItem, TopicItem } from "../types";

export type PageRankVariant = "balanced" | "flow" | "focus";

export type PageRankFocusSignal = {
  nodeId: string;
  label: string;
  reasons: string[];
  weight: number;
};

export type PageRankAnalysis = {
  balancedMap: Map<string, number>;
  flowMap: Map<string, number>;
  focusMap: Map<string, number>;
  focusSignals: PageRankFocusSignal[];
};

type WeightedEdge = {
  to: number;
  weight: number;
};

type VariantConfig = {
  damping: number;
  reverseWeight: number;
  focusMultiplier: number;
};

const VARIANT_CONFIG: Record<PageRankVariant, VariantConfig> = {
  balanced: { damping: 0.85, reverseWeight: 0.6, focusMultiplier: 0.4 },
  flow: { damping: 0.88, reverseWeight: 0, focusMultiplier: 0 },
  focus: { damping: 0.74, reverseWeight: 0.45, focusMultiplier: 1.1 },
};

function normalizeWeights(weights: number[]) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    const uniform = 1 / Math.max(weights.length, 1);
    return weights.map(() => uniform);
  }
  return weights.map((value) => value / total);
}

function mapFromScores(ids: string[], scores: number[]) {
  return new Map(ids.map((id, index) => [id, scores[index] || 0]));
}

function getRecencyScore(node: NodeItem) {
  const source = node.updatedAt || node.createdAt;
  if (!source) return 0;
  const ts = Date.parse(source);
  if (Number.isNaN(ts)) return 0;
  const days = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60 * 24));
  return Math.max(0, 1 - days / 45);
}

function getNodeFocusWeight(node: NodeItem, topic: TopicItem, variant: PageRankVariant) {
  const recency = getRecencyScore(node);
  const depth = Math.max(0, Math.min((node.depth || 0) / 10, 1));
  const confidence = Math.max(0, Math.min(node.confidence || 0, 1));
  const isMustOne = topic.mustOneNodeId === node.id;
  const isTask = Boolean(node.task && node.task.status !== "archived");
  const config = VARIANT_CONFIG[variant];
  let weight = 1;
  weight += depth * 0.35;
  weight += confidence * 0.25;
  weight += recency * 0.3;
  if (isTask) weight += 0.35 * (1 + config.focusMultiplier * 0.35);
  if (isMustOne) weight += 1.4 * (1 + config.focusMultiplier);
  return weight;
}

function describeNodeFocus(node: NodeItem, topic: TopicItem) {
  const reasons: string[] = [];
  if (topic.mustOneNodeId === node.id) reasons.push("must-one");
  if (node.task && node.task.status !== "archived") reasons.push("task");
  if (getRecencyScore(node) >= 0.25) reasons.push("recent");
  if ((node.depth || 0) >= 7) reasons.push("deep");
  if ((node.confidence || 0) >= 0.75) reasons.push("confident");
  return reasons;
}

function buildOutgoing(topic: TopicItem, variant: PageRankVariant, nodeWeights: number[]) {
  const ids = topic.nodes.map((node) => node.id);
  const idToIndex = new Map(ids.map((id, index) => [id, index]));
  const outgoing = Array.from({ length: ids.length }, () => [] as WeightedEdge[]);
  const reverseWeight = VARIANT_CONFIG[variant].reverseWeight;
  topic.edges.forEach((edge) => {
    if (edge.visible === false) return;
    const from = idToIndex.get(edge.from);
    const to = idToIndex.get(edge.to);
    if (from == null || to == null) return;
    const baseWeight = Math.max(0.1, edge.weight || 1);
    const targetBoost = variant === "focus" ? 1 + nodeWeights[to] * 0.18 : 1;
    outgoing[from].push({ to, weight: baseWeight * targetBoost });
    if (reverseWeight > 0) {
      outgoing[to].push({ to: from, weight: baseWeight * reverseWeight });
    }
  });
  return outgoing;
}

function computeVariant(topic: TopicItem, variant: PageRankVariant) {
  const nodes = topic.nodes || [];
  if (!nodes.length) return new Map<string, number>();
  const ids = nodes.map((node) => node.id);
  const teleport = normalizeWeights(nodes.map((node) => getNodeFocusWeight(node, topic, variant)));
  const outgoing = buildOutgoing(topic, variant, teleport);
  const config = VARIANT_CONFIG[variant];
  let scores = Array(nodes.length).fill(1 / nodes.length);

  for (let iter = 0; iter < 28; iter += 1) {
    const next = teleport.map((weight) => (1 - config.damping) * weight);
    for (let index = 0; index < nodes.length; index += 1) {
      const edges = outgoing[index];
      if (!edges.length) {
        for (let target = 0; target < nodes.length; target += 1) {
          next[target] += config.damping * scores[index] * teleport[target];
        }
        continue;
      }
      const totalWeight = edges.reduce((sum, edge) => sum + edge.weight, 0);
      if (totalWeight <= 0) continue;
      edges.forEach((edge) => {
        next[edge.to] += config.damping * scores[index] * (edge.weight / totalWeight);
      });
    }
    scores = normalizeWeights(next);
  }

  return mapFromScores(ids, scores);
}

export function computePageRank(topic: TopicItem | null, variant: PageRankVariant = "balanced") {
  if (!topic) return new Map<string, number>();
  return computeVariant(topic, variant);
}

export function computePageRankAnalysis(topic: TopicItem | null): PageRankAnalysis {
  if (!topic) {
    return {
      balancedMap: new Map<string, number>(),
      flowMap: new Map<string, number>(),
      focusMap: new Map<string, number>(),
      focusSignals: [],
    };
  }

  const balancedMap = computeVariant(topic, "balanced");
  const flowMap = computeVariant(topic, "flow");
  const focusMap = computeVariant(topic, "focus");
  const focusSignals = topic.nodes
    .map((node) => ({
      nodeId: node.id,
      label: node.label,
      reasons: describeNodeFocus(node, topic),
      weight: getNodeFocusWeight(node, topic, "focus"),
    }))
    .filter((entry) => entry.reasons.length > 0)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 5);

  return { balancedMap, flowMap, focusMap, focusSignals };
}
