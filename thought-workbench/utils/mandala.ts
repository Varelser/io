import type { TopicItem } from "../types";

export const MANDALA_SLOT_IDS = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;

export type MandalaSlotId = (typeof MANDALA_SLOT_IDS)[number];

export type MandalaSlot = {
  id: MandalaSlotId;
  position: [number, number, number];
  nodeId: string | null;
};

const SLOT_POSITIONS: Record<MandalaSlotId, [number, number, number]> = {
  "top-left": [-2, 2, 0],
  top: [0, 2, 0],
  "top-right": [2, 2, 0],
  left: [-2, 0, 0],
  center: [0, 0, 0],
  right: [2, 0, 0],
  "bottom-left": [-2, -2, 0],
  bottom: [0, -2, 0],
  "bottom-right": [2, -2, 0],
};

function isMandalaPosition(position: [number, number, number], expected: [number, number, number]) {
  return position[0] === expected[0] && position[1] === expected[1] && position[2] === expected[2];
}

export function buildMandalaSlots(topic: TopicItem): MandalaSlot[] {
  const assigned = new Set<string>();
  const slots = MANDALA_SLOT_IDS.map((id) => {
    const match = topic.nodes.find((node) => !assigned.has(node.id) && isMandalaPosition(node.position, SLOT_POSITIONS[id]));
    if (match) assigned.add(match.id);
    return { id, position: SLOT_POSITIONS[id], nodeId: match?.id || null };
  });

  const unassigned = topic.nodes.filter((node) => !assigned.has(node.id));
  let fallbackIndex = 0;
  const fallbackOrder: MandalaSlotId[] = ["center", "top-left", "top", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"];
  const slotMap = new Map(slots.map((slot) => [slot.id, slot] as const));
  fallbackOrder.forEach((slotId) => {
    const slot = slotMap.get(slotId);
    if (!slot || slot.nodeId) return;
    const fallback = unassigned[fallbackIndex];
    fallbackIndex += 1;
    slot.nodeId = fallback?.id || null;
  });
  return MANDALA_SLOT_IDS.map((slotId) => slotMap.get(slotId) || { id: slotId, position: SLOT_POSITIONS[slotId], nodeId: null });
}

export function applyMandalaSlotLayout(topic: TopicItem, slotNodeIds: Partial<Record<MandalaSlotId, string | null>>) {
  const nextNodes = topic.nodes.map((node) => ({ ...node }));
  const nodeMap = new Map(nextNodes.map((node) => [node.id, node]));

  MANDALA_SLOT_IDS.forEach((slotId) => {
    const nodeId = slotNodeIds[slotId];
    if (!nodeId) return;
    const node = nodeMap.get(nodeId);
    if (!node) return;
    node.position = SLOT_POSITIONS[slotId];
    node.group = slotId === "center" ? "center" : "ring";
    node.layer = "h1";
  });

  return nextNodes;
}

export function createMandalaLayoutWithCenter(topic: TopicItem, centerNodeId: string) {
  const otherNodeIds = topic.nodes.map((node) => node.id).filter((id) => id !== centerNodeId).slice(0, 8);
  const ordered: Record<MandalaSlotId, string | null> = {
    "top-left": otherNodeIds[0] || null,
    top: otherNodeIds[1] || null,
    "top-right": otherNodeIds[2] || null,
    left: otherNodeIds[3] || null,
    center: centerNodeId,
    right: otherNodeIds[4] || null,
    "bottom-left": otherNodeIds[5] || null,
    bottom: otherNodeIds[6] || null,
    "bottom-right": otherNodeIds[7] || null,
  };
  return applyMandalaSlotLayout(topic, ordered);
}
