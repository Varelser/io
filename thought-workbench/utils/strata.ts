import type { EdgeItem, NodeItem, TopicItem, TopicLayerStyle } from "../types";

const STRATA_PALETTE = ["#38bdf8", "#f59e0b", "#22c55e", "#e879f9", "#f87171", "#a3e635", "#818cf8", "#fb7185"];

export type StrataLayerEntry = {
  layer: string;
  count: number;
  color: string;
  visible: boolean;
  oldestDate: string | null;
  newestDate: string | null;
  examples: string[];
};

function fallbackColor(index: number) {
  return STRATA_PALETTE[index % STRATA_PALETTE.length];
}

function dateRange(nodes: NodeItem[]) {
  const dates = nodes
    .map((node) => node.updatedAt || node.createdAt || "")
    .filter((value) => !!value)
    .sort();
  return {
    oldestDate: dates[0] || null,
    newestDate: dates[dates.length - 1] || null,
  };
}

export function buildTopicLayerStyles(topic: TopicItem): Record<string, TopicLayerStyle> {
  const layers = Array.from(new Set(topic.nodes.map((node) => node.layer || "(none)")));
  const next: Record<string, TopicLayerStyle> = {};
  layers.forEach((layer, index) => {
    next[layer] = {
      visible: topic.layerStyles?.[layer]?.visible ?? true,
      color: topic.layerStyles?.[layer]?.color || fallbackColor(index),
    };
  });
  return next;
}

export function buildStrataLayerEntries(topic: TopicItem): StrataLayerEntry[] {
  const styles = buildTopicLayerStyles(topic);
  return Object.entries(styles)
    .map(([layer, style]) => {
      const nodes = topic.nodes.filter((node) => (node.layer || "(none)") === layer);
      const range = dateRange(nodes);
      return {
        layer,
        count: nodes.length,
        color: style.color,
        visible: style.visible,
        oldestDate: range.oldestDate,
        newestDate: range.newestDate,
        examples: nodes.slice(0, 3).map((node) => node.label),
      };
    })
    .sort((left, right) => left.layer.localeCompare(right.layer));
}

export function filterTopicByVisibleLayers(topic: TopicItem): TopicItem {
  const styles = buildTopicLayerStyles(topic);
  const visibleNodeIds = new Set(
    topic.nodes
      .filter((node) => styles[node.layer || "(none)"]?.visible !== false)
      .map((node) => node.id)
  );
  return {
    ...topic,
    layerStyles: styles,
    nodes: topic.nodes.filter((node) => visibleNodeIds.has(node.id)),
    edges: topic.edges.filter((edge: EdgeItem) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)),
  };
}
