import type { HistoryFrame } from "../types";
import { newId } from "../utils/id";

export function normalizeHistoryFrameItem(frame: Partial<HistoryFrame> | null | undefined, frameIndex: number, validNodeIds: Set<string>): HistoryFrame {
  return {
    id: frame?.id || newId("frame"),
    label: frame?.label || `snapshot ${frameIndex + 1}`,
    createdAt: frame?.createdAt || new Date().toISOString(),
    nodes: Array.isArray(frame?.nodes)
      ? frame.nodes
          .map((node: any) => ({
            id: node?.id,
            position: Array.isArray(node?.position) && node.position.length === 3 ? node.position : [0, 0, 0],
            size: typeof node?.size === "number" ? node.size : 0.6,
            frameScale: typeof node?.frameScale === "number" ? node.frameScale : 1,
          }))
          .filter((node: any) => node.id && validNodeIds.has(node.id))
      : [],
  };
}
