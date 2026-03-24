import type { NodeItem, TopicItem } from "../types";
import { extractWikilinks } from "./wikilink";

export type MustOneConnection = {
  nodeId: string;
  label: string;
  kind: "forward-link" | "backlink" | "edge-link" | "orphan-candidate" | "task-support";
};

export type MustOneFocus = {
  topicId: string;
  topicTitle: string;
  mustOneNode: NodeItem;
  zettelkastenCompatible: boolean;
  connections: MustOneConnection[];
};

function includesZettelkastenSignals(topic: TopicItem) {
  if ((topic.activeMethods || []).some((methodId) => methodId.toLowerCase().includes("zettel"))) return true;
  if (topic.nodes.some((node) => node.layer === "zettel" || node.group === "linked" || node.group === "orphan")) return true;
  if (topic.nodes.some((node) => node.note.includes("[["))) return true;
  return false;
}

function hasEdge(topic: TopicItem, nodeId: string) {
  return topic.edges.some((edge) => edge.from === nodeId || edge.to === nodeId);
}

function pushConnection(list: MustOneConnection[], next: MustOneConnection) {
  if (!list.some((item) => item.nodeId === next.nodeId && item.kind === next.kind)) {
    list.push(next);
  }
}

export function collectMustOneZettelkastenFocus(topics: TopicItem[]) {
  const result: MustOneFocus[] = [];

  for (const topic of topics) {
    if (!topic.mustOneNodeId) continue;
    const mustOneNode = topic.nodes.find((node) => node.id === topic.mustOneNodeId);
    if (!mustOneNode) continue;

    const connections: MustOneConnection[] = [];
    const mustOneLinks = new Set(extractWikilinks(mustOneNode.note).map((label) => label.toLowerCase()));

    for (const node of topic.nodes) {
      if (node.id === mustOneNode.id) continue;
      const nodeLinks = new Set(extractWikilinks(node.note).map((label) => label.toLowerCase()));
      const edgeLinked = topic.edges.some((edge) =>
        (edge.from === mustOneNode.id && edge.to === node.id) ||
        (edge.to === mustOneNode.id && edge.from === node.id)
      );

      if (mustOneLinks.has(node.label.toLowerCase())) {
        pushConnection(connections, { nodeId: node.id, label: node.label, kind: "forward-link" });
      }
      if (nodeLinks.has(mustOneNode.label.toLowerCase())) {
        pushConnection(connections, { nodeId: node.id, label: node.label, kind: "backlink" });
      }
      if (edgeLinked) {
        pushConnection(connections, { nodeId: node.id, label: node.label, kind: "edge-link" });
      }
      if (!hasEdge(topic, node.id) && (node.group === "orphan" || node.layer === "inbox" || nodeLinks.has(mustOneNode.label.toLowerCase()))) {
        pushConnection(connections, { nodeId: node.id, label: node.label, kind: "orphan-candidate" });
      }
      if (node.task && (edgeLinked || nodeLinks.has(mustOneNode.label.toLowerCase()) || mustOneLinks.has(node.label.toLowerCase()))) {
        pushConnection(connections, { nodeId: node.id, label: node.label, kind: "task-support" });
      }
    }

    result.push({
      topicId: topic.id,
      topicTitle: topic.title,
      mustOneNode,
      zettelkastenCompatible: includesZettelkastenSignals(topic),
      connections: connections.sort((left, right) => left.label.localeCompare(right.label)),
    });
  }

  return result.sort((left, right) => right.connections.length - left.connections.length || left.topicTitle.localeCompare(right.topicTitle));
}
