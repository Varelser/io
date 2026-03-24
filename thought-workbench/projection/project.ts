import { clamp } from "../utils/math";

export function projectPoint(point: [number, number, number], radiusPx: number, centerX: number, centerY: number, perspectiveStrength = 0.12) {
  const camera = 860;
  const perspective = camera / (camera - point[2] * radiusPx * perspectiveStrength);
  return {
    x: centerX + point[0] * radiusPx * 0.24 * perspective,
    y: centerY - point[1] * radiusPx * 0.24 * perspective,
    depth: point[2],
    scale: clamp(perspective, 0.7, 1.6),
    opacity: clamp(0.24 + ((point[2] + 4) / 8) * 0.8, 0.18, 1),
  };
}
