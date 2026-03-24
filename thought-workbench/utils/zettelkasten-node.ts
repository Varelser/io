import type { NodeItem, TopicItem } from "../types";
import { buildLabelIndex, resolveWikilinks } from "./wikilink";

export type ZettelkastenConnectionKind = "forward-link" | "backlink" | "edge-link" | "orphan-candidate";

export type ZettelkastenConnection = {
  nodeId: string;
  topicId: string;
  topicTitle: string;
  label: string;
  kind: ZettelkastenConnectionKind;
  relation?: string;
  meaning?: string;
};

export type ZettelkastenTemplate = {
  id: string;
  label: string;
  body: string;
  targetNodeId: string;
  targetTopicId: string;
};

export type ZettelkastenNodeContext = {
  topicId: string;
  topicTitle: string;
  zettelkastenCompatible: boolean;
  forwardLinks: ZettelkastenConnection[];
  backlinks: ZettelkastenConnection[];
  edgeLinks: ZettelkastenConnection[];
  orphanCandidates: ZettelkastenConnection[];
  templates: ZettelkastenTemplate[];
};

function includesZettelkastenSignals(topic: TopicItem) {
  if ((topic.activeMethods || []).some((methodId) => methodId.toLowerCase().includes("zettel"))) return true;
  if (topic.nodes.some((node) => node.layer === "zettel" || node.group === "linked" || node.group === "orphan")) return true;
  if (topic.nodes.some((node) => node.note.includes("[["))) return true;
  return false;
}

function hasEdges(topic: TopicItem, nodeId: string) {
  return topic.edges.some((edge) => edge.from === nodeId || edge.to === nodeId);
}

function dedupeConnections(list: ZettelkastenConnection[]) {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = `${item.kind}:${item.topicId}:${item.nodeId}:${item.relation || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortConnections(list: ZettelkastenConnection[]) {
  return [...list].sort((left, right) =>
    left.topicTitle.localeCompare(right.topicTitle)
    || left.label.localeCompare(right.label)
    || left.kind.localeCompare(right.kind)
  );
}

function buildTemplateBody(kind: ZettelkastenConnectionKind, targetLabel: string) {
  if (kind === "backlink") {
    return `[[${targetLabel}]] からこのノートへ戻る理由:\n- どの文脈で参照されるか:\n- 何を補強 / 更新するか:\n- 次に繋げるノート:`;
  }
  if (kind === "edge-link") {
    return `[[${targetLabel}]] と線で結んだ理由:\n- 関係の種類:\n- 差分 / 緊張 / 依存:\n- この接続を見直す条件:`;
  }
  if (kind === "orphan-candidate") {
    return `[[${targetLabel}]] を孤立させない接続案:\n- このノートとの共通文脈:\n- 最初に張るリンク:\n- まだ足りない前提:`;
  }
  return `[[${targetLabel}]] と繋がる理由:\n- 共通する論点:\n- どちらが前提 / 具体例 / 反証か:\n- 読み返すときの手掛かり:`;
}

export function collectZettelkastenNodeContext(topics: TopicItem[], nodeId: string): ZettelkastenNodeContext | null {
  const hostTopic = topics.find((topic) => topic.nodes.some((node) => node.id === nodeId));
  if (!hostTopic) return null;
  const node = hostTopic.nodes.find((item) => item.id === nodeId);
  if (!node) return null;

  const labelIndex = buildLabelIndex(topics);
  const forwardLinks: ZettelkastenConnection[] = [];
  for (const match of resolveWikilinks(node.note, labelIndex)) {
    if (!match.resolved || !match.nodeId || !match.topicId || match.nodeId === node.id) continue;
      const targetTopic = topics.find((topic) => topic.id === match.topicId);
      const targetNode = targetTopic?.nodes.find((item) => item.id === match.nodeId);
      if (targetTopic && targetNode) {
        forwardLinks.push({
        nodeId: targetNode.id,
        topicId: targetTopic.id,
        topicTitle: targetTopic.title,
        label: targetNode.label,
        kind: "forward-link" as const,
        });
      }
  }

  const backlinks: ZettelkastenConnection[] = [];
  const orphanCandidates: ZettelkastenConnection[] = [];
  for (const topic of topics) {
    for (const candidate of topic.nodes) {
      if (candidate.id === node.id) continue;
      const links = new Set(resolveWikilinks(candidate.note, labelIndex).map((match) => match.label.toLowerCase()));
      if (links.has(node.label.toLowerCase())) {
        backlinks.push({
          nodeId: candidate.id,
          topicId: topic.id,
          topicTitle: topic.title,
          label: candidate.label,
          kind: "backlink",
        });
      }
      if (
        topic.id === hostTopic.id
        && !hasEdges(topic, candidate.id)
        && (candidate.group === "orphan" || candidate.layer === "inbox")
        && (links.has(node.label.toLowerCase()) || forwardLinks.some((entry) => entry.nodeId === candidate.id))
      ) {
        orphanCandidates.push({
          nodeId: candidate.id,
          topicId: topic.id,
          topicTitle: topic.title,
          label: candidate.label,
          kind: "orphan-candidate",
        });
      }
    }
  }

  const edgeLinks: ZettelkastenConnection[] = [];
  for (const edge of hostTopic.edges) {
    if (edge.from !== node.id && edge.to !== node.id) continue;
    const targetId = edge.from === node.id ? edge.to : edge.from;
    const targetNode = hostTopic.nodes.find((item) => item.id === targetId);
    if (targetNode) {
      edgeLinks.push({
        nodeId: targetNode.id,
        topicId: hostTopic.id,
        topicTitle: hostTopic.title,
        label: targetNode.label,
        kind: "edge-link" as const,
        relation: edge.relation,
        meaning: edge.meaning,
      });
    }
  }

  const allTemplates = dedupeConnections([...forwardLinks, ...backlinks, ...edgeLinks, ...orphanCandidates])
    .slice(0, 6)
    .map((connection) => ({
      id: `${connection.kind}-${connection.topicId}-${connection.nodeId}`,
      label: `[[${connection.label}]]`,
      body: buildTemplateBody(connection.kind, connection.label),
      targetNodeId: connection.nodeId,
      targetTopicId: connection.topicId,
    }));

  const result = {
    topicId: hostTopic.id,
    topicTitle: hostTopic.title,
    zettelkastenCompatible: includesZettelkastenSignals(hostTopic),
    forwardLinks: sortConnections(dedupeConnections(forwardLinks)),
    backlinks: sortConnections(dedupeConnections(backlinks)),
    edgeLinks: sortConnections(dedupeConnections(edgeLinks)),
    orphanCandidates: sortConnections(dedupeConnections(orphanCandidates)),
    templates: allTemplates,
  } satisfies ZettelkastenNodeContext;

  if (
    !result.zettelkastenCompatible
    && result.forwardLinks.length === 0
    && result.backlinks.length === 0
    && result.edgeLinks.length === 0
    && result.orphanCandidates.length === 0
  ) {
    return null;
  }
  return result;
}
