import type { TopicItem, NodeItem, EdgeItem, HistoryFrame } from "../types";
import { newId } from "../utils/id";
import { normalizeSourceFilename } from "../utils/slug";
import { createDefaultTopicStyle, createDefaultAxisPreset, createDefaultCenterNode } from "../constants/defaults";
import { normalizeNodeItem } from "./node";
import { normalizeEdgeItem } from "./edge";
import { normalizeHistoryFrameItem } from "./history";

export function normalizeAxisPreset(axisPreset: TopicItem["axisPreset"] | undefined) {
  const defaults = createDefaultAxisPreset();
  return {
    x: axisPreset?.x || defaults.x,
    y: axisPreset?.y || defaults.y,
    z: axisPreset?.z || defaults.z,
  };
}

export function normalizeWorkspace(workspace: TopicItem["workspace"] | undefined, index: number) {
  return {
    x: typeof workspace?.x === "number" ? workspace.x : 18 + (index % 4) * 18,
    y: typeof workspace?.y === "number" ? workspace.y : 18 + (index % 3) * 16,
    size: typeof workspace?.size === "number" ? workspace.size : 112,
  };
}

export function normalizeTopicStyle(style: TopicItem["style"] | undefined) {
  const defaults = createDefaultTopicStyle();
  return {
    sphereOpacity: typeof style?.sphereOpacity === "number" ? style.sphereOpacity : defaults.sphereOpacity,
    edgeOpacity: typeof style?.edgeOpacity === "number" ? style.edgeOpacity : defaults.edgeOpacity,
    gridOpacity: typeof style?.gridOpacity === "number" ? style.gridOpacity : defaults.gridOpacity,
    nodeScale: typeof style?.nodeScale === "number" ? style.nodeScale : defaults.nodeScale,
    labelScale: typeof style?.labelScale === "number" ? style.labelScale : defaults.labelScale,
    perspective: typeof style?.perspective === "number" ? style.perspective : defaults.perspective,
    showLabels: typeof style?.showLabels === "boolean" ? style.showLabels : defaults.showLabels,
    centerOffsetX: typeof style?.centerOffsetX === "number" ? style.centerOffsetX : defaults.centerOffsetX,
    centerOffsetY: typeof style?.centerOffsetY === "number" ? style.centerOffsetY : defaults.centerOffsetY,
  };
}

export function normalizeTopicItem(topic: Partial<TopicItem> | null | undefined, index: number): TopicItem {
  const normalizedNodes: NodeItem[] = Array.isArray(topic?.nodes) && topic.nodes.length
    ? topic.nodes.map((node, nodeIndex) => normalizeNodeItem(node, nodeIndex))
    : [createDefaultCenterNode(newId("node"), "center")];

  const validNodeIds = new Set(normalizedNodes.map((node) => node.id));

  const normalizedEdges: EdgeItem[] = Array.isArray(topic?.edges)
    ? topic.edges
        .map((edge) => normalizeEdgeItem(edge))
        .filter((edge) => !!edge.from && !!edge.to && edge.from !== edge.to && validNodeIds.has(edge.from) && validNodeIds.has(edge.to))
    : [];

  const edgeDedup = new Set<string>();
  const dedupedEdges = normalizedEdges.filter((edge) => {
    const key = `${edge.from}->${edge.to}:${edge.relation}:${edge.meaning}`;
    if (edgeDedup.has(key)) return false;
    edgeDedup.add(key);
    return true;
  });

  const normalizedHistory: HistoryFrame[] = Array.isArray(topic?.history)
    ? topic.history.map((frame, frameIndex) => normalizeHistoryFrameItem(frame, frameIndex, validNodeIds))
    : [];

  const normalizedMustOneNodeId = topic?.mustOneNodeId && validNodeIds.has(topic.mustOneNodeId) ? topic.mustOneNodeId : null;
  const normalizedMustOneHistory = Array.isArray((topic as any)?.mustOneHistory)
    ? (topic as any).mustOneHistory
        .filter((entry: any) => entry && typeof entry.date === "string" && typeof entry.label === "string")
        .map((entry: any) => ({
          date: entry.date,
          nodeId: typeof entry.nodeId === "string" && validNodeIds.has(entry.nodeId) ? entry.nodeId : "",
          label: entry.label,
        }))
        .filter((entry: any) => entry.nodeId)
    : undefined;

  return {
    id: topic?.id || newId("topic"),
    title: topic?.title || `Topic ${index + 1}`,
    folder: topic?.folder || "uncategorized",
    description: topic?.description || "",
    axisPreset: normalizeAxisPreset(topic?.axisPreset),
    workspace: normalizeWorkspace(topic?.workspace, index),
    style: normalizeTopicStyle(topic?.style),
    history: normalizedHistory,
    paraCategory: topic?.paraCategory || "Resources",
    mustOneNodeId: normalizedMustOneNodeId,
    mustOneDate: typeof (topic as any)?.mustOneDate === "string" ? (topic as any).mustOneDate : normalizedMustOneNodeId ? new Date().toISOString().slice(0, 10) : null,
    mustOneHistory: normalizedMustOneHistory,
    sourceFile: topic?.sourceFile || normalizeSourceFilename(topic?.title || `topic-${index + 1}`),
    unresolvedTopicLinks: Array.isArray(topic?.unresolvedTopicLinks) ? topic.unresolvedTopicLinks : [],
    nodes: normalizedNodes,
    edges: dedupedEdges,
    parentTopicId: typeof topic?.parentTopicId === "string" ? topic.parentTopicId : null,
    outsideNodeIds: Array.isArray(topic?.outsideNodeIds)
      ? topic.outsideNodeIds.filter((id: string) => validNodeIds.has(id))
      : [],
    activeMethods: Array.isArray(topic?.activeMethods)
      ? topic.activeMethods.filter((m: string) => typeof m === "string")
      : undefined,
    canvasRegions: Array.isArray((topic as any)?.canvasRegions)
      ? (topic as any).canvasRegions.filter(
          (r: any) => r && typeof r.id === "string" && typeof r.label === "string" && r.bounds && typeof r.bounds === "object"
        )
      : undefined,
    layerStyles: (topic as any)?.layerStyles && typeof (topic as any).layerStyles === "object"
      ? Object.fromEntries(
          Object.entries((topic as any).layerStyles).filter((entry): entry is [string, { visible?: boolean; color?: string }] => {
            const value = entry[1];
            return !!value && typeof value === "object";
          }).map(([layer, value]) => [
            layer,
            {
              visible: typeof value.visible === "boolean" ? value.visible : true,
              color: typeof value.color === "string" ? value.color : "#38bdf8",
            },
          ])
        )
      : undefined,
  };
}
