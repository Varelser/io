import type { TopicItem, TopicLinkItem } from "../types";
import { NL } from "../constants/defaults";
import { normalizeSourceFilename } from "../utils/slug";

export function serializeTopicToMarkdown(topic: TopicItem, allTopicLinks: TopicLinkItem[] = [], topics: TopicItem[] = []) {
  const topicIdToTitle = new Map((topics || []).map((item) => [item.id, item.title]));
  const topicIdToFile = new Map((topics || []).map((item) => [item.id, item.sourceFile || normalizeSourceFilename(item.title || "topic")]));

  const frontmatter = [
    "---",
    `title: ${topic.title || "Untitled"}`,
    `folder: ${topic.folder || "Imported"}`,
    `description: ${String(topic.description || "").replace(/\n/g, " ")}`,
    `paraCategory: ${topic.paraCategory || "Resources"}`,
    `mustOneNodeId: ${topic.mustOneNodeId || ""}`,
    `size: ${topic.workspace?.size ?? 112}`,
    `axisX: ${topic.axisPreset?.x || "A ↔ B"}`,
    `axisY: ${topic.axisPreset?.y || "過去 ↔ 未来"}`,
    `axisZ: ${topic.axisPreset?.z || "暗黙 ↔ 明示"}`,
    "---",
    "",
  ].join(NL);

  const nodesPart = (topic.nodes || [])
    .map((node) => {
      const layerText = typeof node.layer === "string" ? node.layer : "default";
      const level = /^h[1-6]$/.test(layerText) ? Number(layerText[1]) : 1;
      const hashes = "#".repeat(Math.max(1, Math.min(6, level)));
      const tw = JSON.stringify({
        id: node.id,
        type: node.type,
        tense: node.tense,
        position: node.position,
        size: node.size,
        frameScale: node.frameScale ?? 1,
        group: node.group,
        layer: node.layer,
      });
      return `${hashes} ${node.label}${NL}<!-- tw: ${tw} -->${NL}${node.note || ""}`.trim();
    })
    .join(`${NL}${NL}`);

  const edgesPart = (topic.edges || [])
    .map((edge) => {
      const payload = {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        relation: edge.relation,
        meaning: edge.meaning,
        weight: edge.weight,
        visible: typeof edge.visible === "boolean" ? edge.visible : true,
      };
      return `<!-- tw-edge: ${JSON.stringify(payload)} -->`;
    })
    .join(NL);

  const historyPart = (topic.history || [])
    .map((frame) => `<!-- tw-history: ${JSON.stringify({ id: frame.id, label: frame.label, createdAt: frame.createdAt, nodes: frame.nodes })} -->`)
    .join(NL);

  const topicLinksPart = (allTopicLinks || [])
    .filter((link) => link.from === topic.id || link.to === topic.id)
    .map((link) => {
      const targetId = link.from === topic.id ? link.to : link.from;
      const targetTitle = topicIdToTitle.get(targetId) || targetId;
      const targetFile = topicIdToFile.get(targetId) || normalizeSourceFilename(targetTitle);
      return `<!-- tw-topic-link: ${JSON.stringify({ id: link.id, targetId, targetTitle, targetFile, relation: link.relation, meaning: link.meaning })} -->`;
    })
    .join(NL);

  return [frontmatter, nodesPart, edgesPart, historyPart, topicLinksPart]
    .filter(Boolean)
    .join(`${NL}${NL}`)
    .trim() + NL;
}
