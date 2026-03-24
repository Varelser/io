import type { NodeItem, TopicItem } from "../types";

export type TimelineAxis = "created" | "updated";

export type TimelinePoint = {
  node: NodeItem;
  topicId: string;
  topicTitle: string;
  ts: number;
  dateStr: string;
};

export type TimelineWindow = {
  startTs: number;
  endTs: number;
  anchorTs: number;
  items: TimelinePoint[];
  nodeIds: Set<string>;
};

export type TimelineComparisonSummary = {
  nodeCount: number;
  topicCount: number;
  typeCount: number;
  avgPerDay: number;
};

export type TimelineDeltaEntry = {
  key: string;
  countA: number;
  countB: number;
  delta: number;
};

function sortDeltaEntries(countsA: Map<string, number>, countsB: Map<string, number>) {
  const keys = new Set<string>([...countsA.keys(), ...countsB.keys()]);
  return [...keys]
    .map((key) => {
      const countA = countsA.get(key) || 0;
      const countB = countsB.get(key) || 0;
      return {
        key,
        countA,
        countB,
        delta: countB - countA,
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || right.countB - left.countB || left.key.localeCompare(right.key));
}

function countBy(items: TimelinePoint[], selector: (item: TimelinePoint) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function summarizeWindow(items: TimelinePoint[], windowMs: number): TimelineComparisonSummary {
  const topicIds = new Set(items.map((item) => item.topicId));
  const types = new Set(items.map((item) => item.node.type));
  const days = Math.max(windowMs / 86400000, 1);
  return {
    nodeCount: items.length,
    topicCount: topicIds.size,
    typeCount: types.size,
    avgPerDay: items.length / days,
  };
}

function buildWindow(items: TimelinePoint[], anchorTs: number, windowMs: number): TimelineWindow {
  const halfWindow = Math.max(windowMs / 2, 1);
  const startTs = anchorTs - halfWindow;
  const endTs = anchorTs + halfWindow;
  const windowItems = items.filter((item) => item.ts >= startTs && item.ts <= endTs);
  return {
    startTs,
    endTs,
    anchorTs,
    items: windowItems,
    nodeIds: new Set(windowItems.map((item) => item.node.id)),
  };
}

export function buildTimelinePoints(topics: TopicItem[], axis: TimelineAxis): TimelinePoint[] {
  const items: TimelinePoint[] = [];
  for (const topic of topics) {
    for (const node of topic.nodes) {
      const raw = axis === "updated" ? (node.updatedAt || node.createdAt) : node.createdAt;
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (Number.isNaN(ts)) continue;
      items.push({
        node,
        topicId: topic.id,
        topicTitle: topic.title,
        ts,
        dateStr: new Date(raw).toLocaleDateString(),
      });
    }
  }
  items.sort((left, right) => left.ts - right.ts);
  return items;
}

export function computeTimelineComparison(items: TimelinePoint[], anchorATs: number, anchorBTs: number, windowMs: number) {
  const safeWindowMs = Math.max(windowMs, 3600000);
  const windowA = buildWindow(items, anchorATs, safeWindowMs);
  const windowB = buildWindow(items, anchorBTs, safeWindowMs);

  return {
    windowA,
    windowB,
    summaryA: summarizeWindow(windowA.items, safeWindowMs),
    summaryB: summarizeWindow(windowB.items, safeWindowMs),
    typeDeltas: sortDeltaEntries(
      countBy(windowA.items, (item) => item.node.type),
      countBy(windowB.items, (item) => item.node.type)
    ),
    layerDeltas: sortDeltaEntries(
      countBy(windowA.items, (item) => item.node.layer || "(none)"),
      countBy(windowB.items, (item) => item.node.layer || "(none)")
    ),
    topicDeltas: sortDeltaEntries(
      countBy(windowA.items, (item) => item.topicTitle),
      countBy(windowB.items, (item) => item.topicTitle)
    ),
  };
}
