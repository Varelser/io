import type { TopicItem } from "../types";

export type WorkspaceArrangeMode = "align-x" | "align-y" | "distribute-x" | "distribute-y" | "grid" | "radial" | "pack" | "lane-x" | "lane-y" | "cluster";
export type WorkspaceArrangeGroupBy = "folder" | "para-category" | "method" | "must-one";

function topicRadius(topic: TopicItem) {
  return topic.workspace.size / 8.2;
}

function getArrangeGroupKey(topic: TopicItem, groupBy: WorkspaceArrangeGroupBy) {
  if (groupBy === "para-category") return topic.paraCategory || "(none)";
  if (groupBy === "method") return topic.activeMethods?.[0] || "(none)";
  if (groupBy === "must-one") return topic.mustOneNodeId ? "Must One" : "(none)";
  return topic.folder || "(none)";
}

function hasCollision(
  placed: Array<{ x: number; y: number; radius: number }>,
  x: number,
  y: number,
  radius: number,
  gap: number,
) {
  return placed.some((item) => Math.hypot(item.x - x, item.y - y) < item.radius + radius + gap);
}

export function getWorkspaceArrangeTopicIds(topics: TopicItem[], selectedTopicId: string | null): string[] {
  if (topics.length === 0) return [];
  const selectedTopic = selectedTopicId ? topics.find((topic) => topic.id === selectedTopicId) || null : null;
  const targetParentId = selectedTopic ? (selectedTopic.parentTopicId || null) : null;
  const group = topics.filter((topic) => (topic.parentTopicId || null) === targetParentId);
  return (group.length > 1 ? group : topics.filter((topic) => !topic.parentTopicId)).map((topic) => topic.id);
}

export function arrangeWorkspaceTopics(
  topics: TopicItem[],
  topicIds: string[],
  mode: WorkspaceArrangeMode,
  groupBy: WorkspaceArrangeGroupBy = "folder",
) {
  const idSet = new Set(topicIds);
  const targetTopics = topics.filter((topic) => idSet.has(topic.id));
  if (targetTopics.length < 2) return topics;

  if (mode === "pack") {
    const sorted = [...targetTopics].sort((a, b) => topicRadius(b) - topicRadius(a));
    const centerX = sorted.reduce((sum, topic) => sum + topic.workspace.x, 0) / sorted.length;
    const centerY = sorted.reduce((sum, topic) => sum + topic.workspace.y, 0) / sorted.length;
    const maxDiameter = Math.max(...sorted.map((topic) => topicRadius(topic) * 2));
    const gap = Math.max(1.2, maxDiameter * 0.08);
    const ringStep = Math.max(2.4, maxDiameter * 0.32);
    const placed: Array<{ id: string; x: number; y: number; radius: number }> = [];
    const nextById = new Map<string, { x: number; y: number }>();

    sorted.forEach((topic, index) => {
      const radius = topicRadius(topic);
      if (index === 0) {
        placed.push({ id: topic.id, x: centerX, y: centerY, radius });
        nextById.set(topic.id, { x: centerX, y: centerY });
        return;
      }

      let placedPosition: { x: number; y: number } | null = null;
      const maxRing = Math.max(8, sorted.length * 3);
      for (let ring = 0; ring <= maxRing && !placedPosition; ring += 1) {
        const orbit = ring * ringStep;
        const stepCount = Math.max(12, Math.round((Math.PI * 2 * Math.max(orbit, ringStep)) / Math.max(1.6, radius * 0.9)));
        for (let step = 0; step < stepCount; step += 1) {
          const angle = (-Math.PI / 2) + (Math.PI * 2 * step) / stepCount;
          const x = centerX + Math.cos(angle) * orbit;
          const y = centerY + Math.sin(angle) * orbit;
          if (!hasCollision(placed, x, y, radius, gap)) {
            placedPosition = { x, y };
            break;
          }
        }
      }

      const fallbackAngle = (-Math.PI / 2) + (Math.PI * 2 * index) / sorted.length;
      const fallbackOrbit = ringStep * (1 + Math.ceil(index / 6));
      const next = placedPosition || {
        x: centerX + Math.cos(fallbackAngle) * fallbackOrbit,
        y: centerY + Math.sin(fallbackAngle) * fallbackOrbit,
      };
      placed.push({ id: topic.id, x: next.x, y: next.y, radius });
      nextById.set(topic.id, next);
    });

    return topics.map((topic) => {
      const next = nextById.get(topic.id);
      return next ? { ...topic, workspace: { ...topic.workspace, x: next.x, y: next.y } } : topic;
    });
  }

  if (mode === "cluster") {
    const groups = new Map<string, TopicItem[]>();
    for (const topic of targetTopics) {
      const key = getArrangeGroupKey(topic, groupBy);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(topic);
    }
    const clusters = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const centerX = targetTopics.reduce((sum, topic) => sum + topic.workspace.x, 0) / targetTopics.length;
    const centerY = targetTopics.reduce((sum, topic) => sum + topic.workspace.y, 0) / targetTopics.length;
    const maxTopicDiameter = Math.max(...targetTopics.map((topic) => topicRadius(topic) * 2));
    const clusterOrbit = Math.max(14, maxTopicDiameter * 3.2, clusters.length * 3.4);
    const nextById = new Map<string, { x: number; y: number }>();

    clusters.forEach(([_, clusterTopics], clusterIndex) => {
      const angle = (-Math.PI / 2) + (Math.PI * 2 * clusterIndex) / clusters.length;
      const clusterCenterX = centerX + Math.cos(angle) * clusterOrbit;
      const clusterCenterY = centerY + Math.sin(angle) * clusterOrbit;
      const sortedTopics = [...clusterTopics].sort((a, b) => a.title.localeCompare(b.title));
      const localRadius = Math.max(4, maxTopicDiameter * 0.7, sortedTopics.length * 1.45);
      sortedTopics.forEach((topic, index) => {
        if (sortedTopics.length === 1) {
          nextById.set(topic.id, { x: clusterCenterX, y: clusterCenterY });
          return;
        }
        const localAngle = (-Math.PI / 2) + (Math.PI * 2 * index) / sortedTopics.length;
        nextById.set(topic.id, {
          x: clusterCenterX + Math.cos(localAngle) * localRadius,
          y: clusterCenterY + Math.sin(localAngle) * localRadius,
        });
      });
    });

    return topics.map((topic) => {
      const next = nextById.get(topic.id);
      return next ? { ...topic, workspace: { ...topic.workspace, x: next.x, y: next.y } } : topic;
    });
  }

  if (mode === "lane-x" || mode === "lane-y") {
    const groups = new Map<string, TopicItem[]>();
    for (const topic of targetTopics) {
      const key = getArrangeGroupKey(topic, groupBy);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(topic);
    }
    const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const isHorizontalLane = mode === "lane-x";
    const maxDiameter = Math.max(...targetTopics.map((topic) => topicRadius(topic) * 2));
    const itemGap = Math.max(5, maxDiameter * 0.28);
    const laneGap = Math.max(10, maxDiameter * 1.15);
    const centerX = targetTopics.reduce((sum, topic) => sum + topic.workspace.x, 0) / targetTopics.length;
    const centerY = targetTopics.reduce((sum, topic) => sum + topic.workspace.y, 0) / targetTopics.length;
    const laneOffsets = sortedGroups.map((_, index) => (index - (sortedGroups.length - 1) / 2) * laneGap);
    const nextById = new Map<string, { x: number; y: number }>();

    sortedGroups.forEach(([_, laneTopics], laneIndex) => {
      const sortedLane = [...laneTopics].sort((a, b) => isHorizontalLane ? a.workspace.x - b.workspace.x : a.workspace.y - b.workspace.y);
      const laneSpan = sortedLane.reduce((sum, topic) => sum + topicRadius(topic) * 2, 0) + Math.max(0, sortedLane.length - 1) * itemGap;
      let cursor = -laneSpan / 2;
      sortedLane.forEach((topic) => {
        const radius = topicRadius(topic);
        const centerAlong = cursor + radius;
        nextById.set(topic.id, isHorizontalLane
          ? { x: centerX + centerAlong, y: centerY + laneOffsets[laneIndex] }
          : { x: centerX + laneOffsets[laneIndex], y: centerY + centerAlong });
        cursor += radius * 2 + itemGap;
      });
    });

    return topics.map((topic) => {
      const next = nextById.get(topic.id);
      return next ? { ...topic, workspace: { ...topic.workspace, x: next.x, y: next.y } } : topic;
    });
  }

  if (mode === "grid") {
    const sorted = [...targetTopics].sort((a, b) => a.workspace.y === b.workspace.y ? a.workspace.x - b.workspace.x : a.workspace.y - b.workspace.y);
    const columns = Math.ceil(Math.sqrt(sorted.length));
    const maxDiameter = Math.max(...sorted.map((topic) => topicRadius(topic) * 2));
    const gap = Math.max(6, maxDiameter * 0.35);
    const step = maxDiameter + gap;
    const centerX = sorted.reduce((sum, topic) => sum + topic.workspace.x, 0) / sorted.length;
    const centerY = sorted.reduce((sum, topic) => sum + topic.workspace.y, 0) / sorted.length;
    const rows = Math.ceil(sorted.length / columns);
    const startX = centerX - ((columns - 1) * step) / 2;
    const startY = centerY - ((rows - 1) * step) / 2;
    const nextById = new Map<string, { x: number; y: number }>();
    sorted.forEach((topic, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      nextById.set(topic.id, { x: startX + col * step, y: startY + row * step });
    });
    return topics.map((topic) => {
      const next = nextById.get(topic.id);
      return next ? { ...topic, workspace: { ...topic.workspace, x: next.x, y: next.y } } : topic;
    });
  }

  if (mode === "radial") {
    const sorted = [...targetTopics].sort((a, b) => a.title.localeCompare(b.title));
    const centerX = sorted.reduce((sum, topic) => sum + topic.workspace.x, 0) / sorted.length;
    const centerY = sorted.reduce((sum, topic) => sum + topic.workspace.y, 0) / sorted.length;
    const maxRadius = Math.max(...sorted.map((topic) => topicRadius(topic)));
    const orbit = Math.max(10, maxRadius * 2.8, sorted.length * 1.8);
    const nextById = new Map<string, { x: number; y: number }>();
    sorted.forEach((topic, index) => {
      const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / sorted.length;
      nextById.set(topic.id, {
        x: centerX + Math.cos(angle) * orbit,
        y: centerY + Math.sin(angle) * orbit,
      });
    });
    return topics.map((topic) => {
      const next = nextById.get(topic.id);
      return next ? { ...topic, workspace: { ...topic.workspace, x: next.x, y: next.y } } : topic;
    });
  }

  if (mode === "align-x") {
    const avgX = targetTopics.reduce((sum, topic) => sum + topic.workspace.x, 0) / targetTopics.length;
    return topics.map((topic) => idSet.has(topic.id) ? { ...topic, workspace: { ...topic.workspace, x: avgX } } : topic);
  }

  if (mode === "align-y") {
    const avgY = targetTopics.reduce((sum, topic) => sum + topic.workspace.y, 0) / targetTopics.length;
    return topics.map((topic) => idSet.has(topic.id) ? { ...topic, workspace: { ...topic.workspace, y: avgY } } : topic);
  }

  const isX = mode === "distribute-x";
  const sorted = [...targetTopics].sort((a, b) => isX ? a.workspace.x - b.workspace.x : a.workspace.y - b.workspace.y);
  const startEdge = isX
    ? sorted[0].workspace.x - topicRadius(sorted[0])
    : sorted[0].workspace.y - topicRadius(sorted[0]);
  const endEdge = isX
    ? sorted[sorted.length - 1].workspace.x + topicRadius(sorted[sorted.length - 1])
    : sorted[sorted.length - 1].workspace.y + topicRadius(sorted[sorted.length - 1]);
  const occupiedSpan = sorted.reduce((sum, topic) => sum + topicRadius(topic) * 2, 0);
  const gap = sorted.length > 1 ? Math.max(0, (endEdge - startEdge - occupiedSpan) / (sorted.length - 1)) : 0;

  let cursor = startEdge;
  const nextCenterById = new Map<string, number>();
  for (const topic of sorted) {
    const radius = topicRadius(topic);
    nextCenterById.set(topic.id, cursor + radius);
    cursor += radius * 2 + gap;
  }

  return topics.map((topic) => {
    const nextCenter = nextCenterById.get(topic.id);
    if (typeof nextCenter !== "number") return topic;
    return isX
      ? { ...topic, workspace: { ...topic.workspace, x: nextCenter } }
      : { ...topic, workspace: { ...topic.workspace, y: nextCenter } };
  });
}
