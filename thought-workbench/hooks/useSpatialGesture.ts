import { useCallback, useRef } from "react";

/**
 * Spatial gesture detection for drag operations.
 *
 * Modifiers:
 * - Plain drag: move node
 * - Alt+drag: duplicate node to new position
 * - Shift+drag: create edge between source and drop target
 *
 * Overlap detection:
 * - If dropped within threshold of another node, trigger merge prompt
 */

export type GestureResult =
  | { type: "move"; nodeId: string; position: [number, number, number] }
  | { type: "duplicate"; sourceNodeId: string; position: [number, number, number] }
  | { type: "link"; fromNodeId: string; toNodeId: string }
  | { type: "merge_prompt"; nodeA: string; nodeB: string; screenPos: { x: number; y: number } };

export type GestureModifiers = {
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};

const OVERLAP_THRESHOLD = 0.12; // 3D distance threshold for merge prompt

export function useSpatialGesture(opts: {
  getNodePosition: (nodeId: string) => [number, number, number] | null;
  getAllNodeIds: () => string[];
  onGesture: (result: GestureResult) => void;
}) {
  const { getNodePosition, getAllNodeIds, onGesture } = opts;
  const dragStartRef = useRef<{ nodeId: string; modifiers: GestureModifiers } | null>(null);

  const startDrag = useCallback((nodeId: string, modifiers: GestureModifiers) => {
    dragStartRef.current = { nodeId, modifiers };
  }, []);

  const endDrag = useCallback((nodeId: string, newPosition: [number, number, number], endModifiers: GestureModifiers) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;

    const modifiers = { ...start.modifiers, ...endModifiers };

    // Check for overlap with another node
    const allIds = getAllNodeIds();
    let nearestId: string | null = null;
    let nearestDist = Infinity;
    for (const otherId of allIds) {
      if (otherId === nodeId) continue;
      const otherPos = getNodePosition(otherId);
      if (!otherPos) continue;
      const dx = newPosition[0] - otherPos[0];
      const dy = newPosition[1] - otherPos[1];
      const dz = newPosition[2] - otherPos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = otherId;
      }
    }

    // Alt+drag = duplicate
    if (modifiers.altKey) {
      onGesture({ type: "duplicate", sourceNodeId: nodeId, position: newPosition });
      return;
    }

    // Shift+drag near another node = create link
    if (modifiers.shiftKey && nearestId && nearestDist < OVERLAP_THRESHOLD * 3) {
      onGesture({ type: "link", fromNodeId: nodeId, toNodeId: nearestId });
      return;
    }

    // Close overlap = merge prompt
    if (nearestId && nearestDist < OVERLAP_THRESHOLD) {
      // Estimate screen position (approximate center)
      onGesture({
        type: "merge_prompt",
        nodeA: nodeId,
        nodeB: nearestId,
        screenPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      });
      return;
    }

    // Normal move
    onGesture({ type: "move", nodeId, position: newPosition });
  }, [getNodePosition, getAllNodeIds, onGesture]);

  return { startDrag, endDrag };
}
