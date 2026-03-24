import type { TopicItem } from "../types";

type GraphData = {
  ids: string[];
  undirected: number[][];
  incoming: number[][];
  outgoing: number[][];
};

export type CommunityCluster = {
  id: string;
  label: string;
  nodeIds: string[];
  size: number;
  density: number;
};

function buildGraph(topic: TopicItem | null): GraphData {
  const nodes = topic?.nodes || [];
  const ids = nodes.map((node) => node.id);
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const undirectedSets = Array.from({ length: ids.length }, () => new Set<number>());
  const incomingSets = Array.from({ length: ids.length }, () => new Set<number>());
  const outgoingSets = Array.from({ length: ids.length }, () => new Set<number>());

  for (const edge of topic?.edges || []) {
    if (edge.visible === false) continue;
    const from = indexById.get(edge.from);
    const to = indexById.get(edge.to);
    if (from == null || to == null) continue;
    outgoingSets[from].add(to);
    incomingSets[to].add(from);
    if (from !== to) {
      undirectedSets[from].add(to);
      undirectedSets[to].add(from);
    }
  }

  return {
    ids,
    undirected: undirectedSets.map((set) => [...set]),
    incoming: incomingSets.map((set) => [...set]),
    outgoing: outgoingSets.map((set) => [...set]),
  };
}

export function computeDegreeCentrality(topic: TopicItem | null) {
  const { ids, undirected } = buildGraph(topic);
  if (ids.length === 0) return new Map<string, number>();
  const denominator = Math.max(ids.length - 1, 1);
  return new Map(ids.map((id, index) => [id, undirected[index].length / denominator]));
}

export function computeBetweennessCentrality(topic: TopicItem | null) {
  const { ids, undirected } = buildGraph(topic);
  const nodeCount = ids.length;
  if (nodeCount === 0) return new Map<string, number>();

  const scores = Array(nodeCount).fill(0);

  for (let source = 0; source < nodeCount; source += 1) {
    const stack: number[] = [];
    const predecessors = Array.from({ length: nodeCount }, () => [] as number[]);
    const sigma = Array(nodeCount).fill(0);
    const distance = Array(nodeCount).fill(-1);
    sigma[source] = 1;
    distance[source] = 0;
    const queue = [source];

    while (queue.length > 0) {
      const vertex = queue.shift()!;
      stack.push(vertex);
      for (const neighbor of undirected[vertex]) {
        if (distance[neighbor] < 0) {
          queue.push(neighbor);
          distance[neighbor] = distance[vertex] + 1;
        }
        if (distance[neighbor] === distance[vertex] + 1) {
          sigma[neighbor] += sigma[vertex];
          predecessors[neighbor].push(vertex);
        }
      }
    }

    const dependency = Array(nodeCount).fill(0);
    while (stack.length > 0) {
      const vertex = stack.pop()!;
      for (const predecessor of predecessors[vertex]) {
        dependency[predecessor] += (sigma[predecessor] / sigma[vertex]) * (1 + dependency[vertex]);
      }
      if (vertex !== source) scores[vertex] += dependency[vertex];
    }
  }

  const normalized = nodeCount > 2
    ? scores.map((score) => (score / 2) / (((nodeCount - 1) * (nodeCount - 2)) / 2))
    : scores.map(() => 0);
  return new Map(ids.map((id, index) => [id, normalized[index]]));
}

export function computeHITS(topic: TopicItem | null, iterations = 24) {
  const { ids, incoming, outgoing } = buildGraph(topic);
  const nodeCount = ids.length;
  if (nodeCount === 0) {
    return {
      hubMap: new Map<string, number>(),
      authorityMap: new Map<string, number>(),
    };
  }

  let hubs = Array(nodeCount).fill(1);
  let authorities = Array(nodeCount).fill(1);

  const normalize = (values: number[]) => {
    const length = Math.hypot(...values);
    if (length === 0) return values.map(() => 0);
    return values.map((value) => value / length);
  };

  for (let index = 0; index < iterations; index += 1) {
    const nextAuthorities = Array(nodeCount).fill(0);
    for (let i = 0; i < nodeCount; i += 1) {
      for (const source of incoming[i]) nextAuthorities[i] += hubs[source];
    }
    authorities = normalize(nextAuthorities);

    const nextHubs = Array(nodeCount).fill(0);
    for (let i = 0; i < nodeCount; i += 1) {
      for (const target of outgoing[i]) nextHubs[i] += authorities[target];
    }
    hubs = normalize(nextHubs);
  }

  return {
    hubMap: new Map(ids.map((id, index) => [id, hubs[index]])),
    authorityMap: new Map(ids.map((id, index) => [id, authorities[index]])),
  };
}

export function computeCommunityClusters(topic: TopicItem | null, iterations = 20) {
  const { ids, undirected } = buildGraph(topic);
  const nodeCount = ids.length;
  if (nodeCount === 0) {
    return {
      communityMap: new Map<string, string>(),
      communities: [] as CommunityCluster[],
    };
  }

  let labels = ids.map((id) => id);
  for (let round = 0; round < iterations; round += 1) {
    let changed = false;
    for (let index = 0; index < nodeCount; index += 1) {
      const neighbors = undirected[index];
      if (neighbors.length === 0) continue;
      const counts = new Map<string, number>();
      for (const neighbor of neighbors) {
        const label = labels[neighbor];
        counts.set(label, (counts.get(label) || 0) + 1);
      }
      const nextLabel = [...counts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
      if (nextLabel !== labels[index]) {
        labels[index] = nextLabel;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const nodeIdsByLabel = new Map<string, string[]>();
  labels.forEach((label, index) => {
    const list = nodeIdsByLabel.get(label) || [];
    list.push(ids[index]);
    nodeIdsByLabel.set(label, list);
  });

  const communities = [...nodeIdsByLabel.values()]
    .sort((left, right) => right.length - left.length || left[0].localeCompare(right[0]))
    .map((nodeIds, index) => {
      const nodeIndexSet = new Set(nodeIds.map((nodeId) => ids.indexOf(nodeId)));
      let internalEdges = 0;
      for (const nodeId of nodeIds) {
        const nodeIndex = ids.indexOf(nodeId);
        for (const neighbor of undirected[nodeIndex]) {
          if (nodeIndexSet.has(neighbor)) internalEdges += 1;
        }
      }
      internalEdges /= 2;
      const possibleEdges = nodeIds.length > 1 ? (nodeIds.length * (nodeIds.length - 1)) / 2 : 1;
      return {
        id: `community-${index + 1}`,
        label: `C${index + 1}`,
        nodeIds,
        size: nodeIds.length,
        density: internalEdges / possibleEdges,
      };
    });

  const communityMap = new Map<string, string>();
  for (const community of communities) {
    for (const nodeId of community.nodeIds) communityMap.set(nodeId, community.label);
  }

  return { communityMap, communities };
}
