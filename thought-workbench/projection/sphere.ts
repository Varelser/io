import { round } from "../utils/math";

export function normalizeNodeToSphere(position: [number, number, number], radius = 2.3): [number, number, number] {
  const len = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
  if (!len) return [radius, 0, 0];
  return [round((position[0] / len) * radius), round((position[1] / len) * radius), round((position[2] / len) * radius)];
}

export function autoNodePosition(index: number, total: number): [number, number, number] {
  const angle = (Math.PI * 2 * index) / Math.max(1, total);
  const radius = total <= 1 ? 0 : 2.3;
  return [round(Math.cos(angle) * radius), round(Math.sin(angle) * radius), round(Math.sin(angle * 0.7) * 0.8)];
}
