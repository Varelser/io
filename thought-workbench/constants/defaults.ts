import type { NodeItem, TopicItem } from "../types";
import { newId } from "../utils/id";

export const STORAGE_KEY = "thought-workbench-clean-v3";
export const STORAGE_BACKUP_KEY = "thought-workbench-clean-v3-backup";
export const APP_VERSION = 6;
export const SAVE_DEBOUNCE_MS = 180;
export const NL = "\n";

export function createDefaultTopicStyle(): TopicItem["style"] {
  return {
    sphereOpacity: 0.18,
    edgeOpacity: 0.55,
    gridOpacity: 0.18,
    nodeScale: 1,
    labelScale: 1,
    perspective: 0.12,
    showLabels: true,
    centerOffsetX: 0,
    centerOffsetY: 0,
  };
}

export function createDefaultAxisPreset(x = "A ↔ B", y = "過去 ↔ 未来", z = "暗黙 ↔ 明示") {
  return { x, y, z };
}

export function createDefaultWorkspace(x: number, y: number, size = 112) {
  return { x, y, size };
}

export function createDefaultCenterNode(id: string, label = "中心"): NodeItem {
  const now = new Date().toISOString();
  return {
    id,
    label,
    type: "主張",
    tense: "現在",
    position: [0, 0, 0],
    note: "",
    size: 0.6,
    frameScale: 1,
    group: "default",
    layer: "default",
    createdAt: now,
    updatedAt: now,
  };
}
