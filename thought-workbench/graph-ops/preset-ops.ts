import type { TopicItem, NodeItem, EdgeItem } from "../types";
import { newId } from "../utils/id";
import { round } from "../utils/math";
import { createSeedBundle } from "../constants/presets";
import { autoNodePosition } from "../projection/sphere";
import { patchTopicItem } from "./topic-crud";

export function applyPresetToTopic(topic: TopicItem, preset: string): TopicItem {
  if (preset === "para") {
    return patchTopicItem(topic, { folder: topic.paraCategory });
  }

  let nodes = topic.nodes.slice();
  if (preset === "mandala") {
    const positions: [number, number, number][] = [[0, 0, 0], [-2, 2, 0], [0, 2, 0], [2, 2, 0], [-2, 0, 0], [2, 0, 0], [-2, -2, 0], [0, -2, 0], [2, -2, 0]];
    nodes = nodes.map((node, i) => ({ ...node, position: positions[i] || node.position, group: i === 0 ? "center" : "ring", layer: "h1" }));
  }
  if (preset === "zettelkasten") {
    const linked = new Set<string>();
    topic.edges.forEach((edge) => { linked.add(edge.from); linked.add(edge.to); });
    nodes = nodes.map((node, i) => ({ ...node, group: linked.has(node.id) ? "linked" : "orphan", layer: linked.has(node.id) ? "zettel" : "inbox", position: autoNodePosition(i, nodes.length) }));
  }
  if (preset === "gtd") {
    nodes = nodes.map((node, i) => ({ ...node, group: ["inbox", "next", "waiting", "someday", "review"][i % 5], layer: "gtd", position: [round(-3.2 + (i % 5) * 1.6), round(2.4 - Math.floor(i / 5) * 1.2), 0] as [number, number, number] }));
  }
  if (preset === "poincare") {
    const R = 2.3;
    nodes = nodes.map((node, i) => {
      const t = nodes.length <= 1 ? 0 : i / (nodes.length - 1);
      const hyperbolicDist = t * 3.0;
      const euclideanR = Math.tanh(hyperbolicDist / 2) * R;
      const angle = (Math.PI * 2 * i) / Math.max(1, nodes.length) + Math.PI * 0.15;
      const phi = Math.sin(i * 1.7) * 0.6;
      const x = round(euclideanR * Math.cos(angle) * Math.cos(phi));
      const y = round(euclideanR * Math.sin(angle) * Math.cos(phi));
      const z = round(euclideanR * Math.sin(phi));
      const layerName = t < 0.25 ? "core" : t < 0.6 ? "geodesic" : "horizon";
      const groupName = t < 0.25 ? "nucleus" : t < 0.6 ? "inner" : "boundary";
      return { ...node, position: [x, y, z] as [number, number, number], layer: layerName, group: groupName, size: round(0.85 - t * 0.4) };
    });
  }
  if (preset === "hebbian") {
    const edgeFromCount = new Map<string, number>();
    const edgeToCount = new Map<string, number>();
    topic.edges.forEach((e) => {
      edgeFromCount.set(e.from, (edgeFromCount.get(e.from) || 0) + 1);
      edgeToCount.set(e.to, (edgeToCount.get(e.to) || 0) + 1);
    });
    nodes = nodes.map((node, i) => {
      const outDeg = edgeFromCount.get(node.id) || 0;
      const inDeg = edgeToCount.get(node.id) || 0;
      const totalDeg = outDeg + inDeg;
      const layerX = outDeg > inDeg ? -1 : inDeg > outDeg ? 1 : 0;
      const spread = nodes.length <= 1 ? 0 : (i / (nodes.length - 1) - 0.5) * 2;
      const x = round(layerX * 2.0);
      const y = round(spread * 2.2);
      const z = round(Math.sin(i * 2.1) * 0.6);
      const groupName = outDeg > inDeg ? "input" : inDeg > outDeg ? "output" : totalDeg > 0 ? "association" : "inhibitory";
      const layerName = outDeg > inDeg ? "pre" : inDeg > outDeg ? "post" : "synapse";
      return { ...node, position: [x, y, z] as [number, number, number], layer: layerName, group: groupName };
    });
    const edges = topic.edges.map((e) => {
      const coActivation = ((edgeFromCount.get(e.from) || 0) + (edgeToCount.get(e.to) || 0)) * 0.15;
      return { ...e, weight: round(Math.min(2.0, Math.max(0.3, (e.weight || 1) + coActivation))) };
    });
    return { ...topic, nodes, edges };
  }
  if (preset === "dialectic") {
    const triads = Math.max(1, Math.floor(nodes.length / 3));
    nodes = nodes.map((node, i) => {
      const triadIndex = Math.floor(i / 3);
      const role = i % 3;
      const yBase = round(-1.0 + triadIndex * (2.8 / Math.max(1, triads - 1 || 1)));
      if (role === 0) return { ...node, position: [-1.8, yBase, 0] as [number, number, number], group: "thesis", layer: `d${triadIndex + 1}` };
      if (role === 1) return { ...node, position: [1.8, yBase, 0] as [number, number, number], group: "antithesis", layer: `d${triadIndex + 1}` };
      return { ...node, position: [0, round(yBase + 1.4), 0.5] as [number, number, number], group: "synthesis", layer: `d${triadIndex + 1}`, size: round(Math.min(0.9, (node.size || 0.6) + 0.1)) };
    });
  }
  if (preset === "toulmin") {
    const roles = ["claim", "data", "warrant", "backing", "qualifier", "rebuttal"];
    const positions: [number, number, number][] = [[0, 1.8, 0], [-1.8, -0.6, 0], [0, 0.4, 0.6], [0, -1.4, 1.0], [1.6, 0.8, -0.4], [1.8, -0.6, 0]];
    nodes = nodes.map((node, i) => {
      const roleIdx = i % roles.length;
      const pos = positions[roleIdx];
      const rowOffset = Math.floor(i / roles.length) * 0.4;
      return { ...node, position: [round(pos[0]), round(pos[1] + rowOffset), round(pos[2])] as [number, number, number], group: roles[roleIdx], layer: roleIdx === 0 || roleIdx === 4 ? "conclusion" : roleIdx === 2 ? "bridge" : "ground" };
    });
  }
  if (preset === "causal") {
    const loopSize = Math.max(3, nodes.length);
    nodes = nodes.map((node, i) => {
      const angle = (Math.PI * 2 * i) / loopSize - Math.PI / 2;
      const r = 1.8;
      return { ...node, position: [round(Math.cos(angle) * r), round(Math.sin(angle) * r), round(Math.sin(i * 1.3) * 0.4)] as [number, number, number], group: "variable", layer: "system" };
    });
    const edges = topic.edges.map((e) => {
      const fromIdx = nodes.findIndex((n) => n.id === e.from);
      const toIdx = nodes.findIndex((n) => n.id === e.to);
      if (fromIdx < 0 || toIdx < 0) return e;
      const isAdjacent = Math.abs(fromIdx - toIdx) === 1 || Math.abs(fromIdx - toIdx) === nodes.length - 1;
      return { ...e, relation: isAdjacent ? "影響" : "調整", weight: round(isAdjacent ? 1.0 : 0.7) };
    });
    return { ...topic, nodes, edges };
  }
  if (preset === "kj") {
    const linked = new Map<string, Set<string>>();
    topic.edges.forEach((e) => {
      if (!linked.has(e.to)) linked.set(e.to, new Set());
      linked.get(e.to)!.add(e.from);
      if (!linked.has(e.from)) linked.set(e.from, new Set());
      linked.get(e.from)!.add(e.to);
    });
    const visited = new Set<string>();
    const clusters: string[][] = [];
    nodes.forEach((node) => {
      if (visited.has(node.id)) return;
      const cluster: string[] = [node.id];
      visited.add(node.id);
      const neighbors = linked.get(node.id);
      if (neighbors) neighbors.forEach((nid) => { if (!visited.has(nid)) { cluster.push(nid); visited.add(nid); } });
      clusters.push(cluster);
    });
    const clusterMap = new Map<string, number>();
    clusters.forEach((cluster, ci) => cluster.forEach((nid) => clusterMap.set(nid, ci)));
    const clusterCount = clusters.length;
    nodes = nodes.map((node) => {
      const ci = clusterMap.get(node.id) || 0;
      const clusterAngle = (Math.PI * 2 * ci) / Math.max(1, clusterCount);
      const clusterR = clusterCount <= 1 ? 0 : 1.6;
      const cx = clusterR * Math.cos(clusterAngle);
      const cy = clusterR * Math.sin(clusterAngle);
      const membersInCluster = clusters[ci];
      const memberIdx = membersInCluster ? membersInCluster.indexOf(node.id) : 0;
      const isLabel = memberIdx === 0 && (membersInCluster?.length || 0) > 1;
      const memberAngle = (Math.PI * 2 * memberIdx) / Math.max(1, (membersInCluster?.length || 1));
      const memberR = isLabel ? 0 : 0.5;
      return {
        ...node,
        position: [round(cx + memberR * Math.cos(memberAngle)), round(cy + memberR * Math.sin(memberAngle)), round(isLabel ? 0.3 : 0)] as [number, number, number],
        group: `cluster-${ci}`,
        layer: isLabel ? "label" : "card",
        size: round(isLabel ? 0.7 : 0.5),
      };
    });
  }
  return patchTopicItem(topic, { nodes });
}

export function buildSeedItemsForPreset(preset: string): { nodes: NodeItem[]; edges: EdgeItem[] } {
  const bundle = createSeedBundle(preset);
  const createdNodes: NodeItem[] = bundle.nodes.map((node: any) => ({
    ...node,
    id: newId("node"),
    frameScale: typeof node.frameScale === "number" ? node.frameScale : 1,
  }));
  const createdEdges: EdgeItem[] = bundle.edges
    .map((edge: any) => ({
      id: newId("edge"),
      from: createdNodes[edge.fromIndex]?.id,
      to: createdNodes[edge.toIndex]?.id,
      relation: edge.relation,
      meaning: edge.meaning,
      weight: edge.weight,
      visible: true,
    }))
    .filter((edge: EdgeItem) => !!edge.from && !!edge.to);
  return { nodes: createdNodes, edges: createdEdges };
}

export function appendSeedBundleToTopic(topic: TopicItem, preset: string): TopicItem {
  const seed = buildSeedItemsForPreset(preset);
  return { ...topic, nodes: [...topic.nodes, ...seed.nodes], edges: [...topic.edges, ...seed.edges] };
}
