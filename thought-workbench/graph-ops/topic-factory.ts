import type { TopicItem } from "../types";
import { newId } from "../utils/id";
import { normalizeSourceFilename } from "../utils/slug";
import { createDefaultAxisPreset, createDefaultWorkspace, createDefaultTopicStyle, createDefaultCenterNode } from "../constants/defaults";

export function createDefaultTopic(title: string, x: number, y: number, indexHint = 1): TopicItem {
  const nodeId = newId("node");
  return {
    id: newId("topic"),
    title,
    folder: "未分類",
    description: "新しい球体トピック。",
    axisPreset: createDefaultAxisPreset(),
    workspace: createDefaultWorkspace(x, y, 112),
    style: createDefaultTopicStyle(),
    history: [],
    paraCategory: "Resources",
    mustOneNodeId: null,
    mustOneDate: null,
    sourceFile: normalizeSourceFilename(title || `新規トピック ${indexHint}`),
    unresolvedTopicLinks: [],
    nodes: [createDefaultCenterNode(nodeId)],
    edges: [],
  };
}
