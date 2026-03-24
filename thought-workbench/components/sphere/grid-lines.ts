import { rotatePoint } from "../../projection/rotate";
import { projectPoint } from "../../projection/project";

export function computeGridLines(yaw: number, pitch: number, radiusPx: number, centerX: number, centerY: number, perspectiveStrength: number) {
  const lines: Array<{ key: string; points: string }> = [];
  const latitudes = [-60, -30, 0, 30, 60];
  const longitudes = [0, 30, 60, 90, 120, 150];

  latitudes.forEach((lat) => {
    const pts: string[] = [];
    for (let lon = 0; lon <= 360; lon += 10) {
      const phi = (lat * Math.PI) / 180;
      const theta = (lon * Math.PI) / 180;
      const point: [number, number, number] = [Math.cos(phi) * Math.cos(theta) * 4, Math.sin(phi) * 4, Math.cos(phi) * Math.sin(theta) * 4];
      const projected = projectPoint(rotatePoint(point, yaw, pitch), radiusPx, centerX, centerY, perspectiveStrength);
      pts.push(`${projected.x},${projected.y}`);
    }
    lines.push({ key: `lat-${lat}`, points: pts.join(" ") });
  });

  longitudes.forEach((lon) => {
    const pts: string[] = [];
    for (let lat = -90; lat <= 90; lat += 10) {
      const phi = (lat * Math.PI) / 180;
      const theta = (lon * Math.PI) / 180;
      const point: [number, number, number] = [Math.cos(phi) * Math.cos(theta) * 4, Math.sin(phi) * 4, Math.cos(phi) * Math.sin(theta) * 4];
      const projected = projectPoint(rotatePoint(point, yaw, pitch), radiusPx, centerX, centerY, perspectiveStrength);
      pts.push(`${projected.x},${projected.y}`);
    }
    lines.push({ key: `lon-${lon}`, points: pts.join(" ") });
  });

  return lines;
}
