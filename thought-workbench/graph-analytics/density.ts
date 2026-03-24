import type { TopicItem } from "../types";

export type LayerHeatCell = {
  row: string;
  column: string;
  edgeCount: number;
  possibleEdges: number;
  density: number;
  intensity: number;
};

export type SphereDensityBand = {
  id: string;
  title: string;
  nodes: number;
  edges: number;
  density: number;
  intensity: number;
};

const FALLBACK_LAYER = "(none)";

function pairKey(left: string, right: string) {
  return left <= right ? `${left}::${right}` : `${right}::${left}`;
}

export function computeLayerConnectionHeatmap(topics: TopicItem[]) {
  const layerCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();

  for (const topic of topics) {
    const nodeById = new Map(topic.nodes.map((node) => [node.id, node]));
    for (const node of topic.nodes) {
      const layer = node.layer || FALLBACK_LAYER;
      layerCounts.set(layer, (layerCounts.get(layer) || 0) + 1);
    }

    for (const edge of topic.edges) {
      if (edge.visible === false) continue;
      const fromNode = nodeById.get(edge.from);
      const toNode = nodeById.get(edge.to);
      if (!fromNode || !toNode) continue;
      const fromLayer = fromNode.layer || FALLBACK_LAYER;
      const toLayer = toNode.layer || FALLBACK_LAYER;
      const key = pairKey(fromLayer, toLayer);
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    }
  }

  const layers = [...layerCounts.keys()].sort((left, right) => left.localeCompare(right));
  const cells: LayerHeatCell[][] = layers.map((row) => layers.map((column) => {
    const edgeCount = pairCounts.get(pairKey(row, column)) || 0;
    const rowCount = layerCounts.get(row) || 0;
    const columnCount = layerCounts.get(column) || 0;
    const possibleEdges = row === column
      ? Math.max((rowCount * (rowCount - 1)) / 2, 0)
      : rowCount * columnCount;
    const density = possibleEdges > 0 ? edgeCount / possibleEdges : 0;
    return {
      row,
      column,
      edgeCount,
      possibleEdges,
      density,
      intensity: 0,
    };
  }));

  const maxDensity = Math.max(...cells.flat().map((cell) => cell.density), 0);
  const normalizedCells = cells.map((row) => row.map((cell) => ({
    ...cell,
    intensity: maxDensity > 0 ? cell.density / maxDensity : 0,
  })));

  return {
    layers,
    cells: normalizedCells,
  };
}

export function computeSphereDensityBands(topics: TopicItem[]): SphereDensityBand[] {
  const bands = topics.map((topic) => {
    const possibleEdges = topic.nodes.length > 1
      ? (topic.nodes.length * (topic.nodes.length - 1)) / 2
      : 0;
    const density = possibleEdges > 0 ? topic.edges.length / possibleEdges : 0;
    return {
      id: topic.id,
      title: topic.title,
      nodes: topic.nodes.length,
      edges: topic.edges.length,
      density,
      intensity: 0,
    };
  }).sort((left, right) => right.density - left.density || right.nodes - left.nodes || left.title.localeCompare(right.title));

  const maxDensity = Math.max(...bands.map((band) => band.density), 0);
  return bands.map((band) => ({
    ...band,
    intensity: maxDensity > 0 ? band.density / maxDensity : 0,
  }));
}
