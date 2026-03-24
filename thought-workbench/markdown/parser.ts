import type { TopicItem, NodeItem, EdgeItem, HistoryFrame, UnresolvedTopicLink } from "../types";
import { newId } from "../utils/id";
import { slugify } from "../utils/slug";
import { normalizeSourceFilename } from "../utils/slug";
import { NL } from "../constants/defaults";
import { createDefaultTopicStyle, createDefaultWorkspace } from "../constants/defaults";
import { normalizeAxisPreset } from "../normalize/topic";
import { autoNodePosition } from "../projection/sphere";
import { parseFrontmatter } from "./frontmatter";

export function parseMarkdownTopic(markdown: string, filename: string, mode = "links"): TopicItem & { topicLinkRefs?: UnresolvedTopicLink[] } {
  const { meta, body } = parseFrontmatter(markdown);
  const topicTitle = meta.title || String(filename || "Imported Topic").replace(/\.(md|markdown)$/i, "") || "Imported Topic";

  const nativeEdges: EdgeItem[] = [];
  const nativeHistory: HistoryFrame[] = [];
  const nativeTopicLinks: UnresolvedTopicLink[] = [];

  let cursor = 0;
  while (true) {
    const start = body.indexOf("<!-- tw-edge:", cursor);
    if (start === -1) break;
    const end = body.indexOf("-->", start);
    if (end === -1) break;
    try {
      const edge = JSON.parse(body.slice(start + 13, end).trim());
      nativeEdges.push({
        id: edge.id || newId("edge"),
        from: edge.from,
        to: edge.to,
        relation: edge.relation || "参照",
        meaning: edge.meaning || "imported edge",
        weight: typeof edge.weight === "number" ? edge.weight : 1,
        visible: typeof edge.visible === "boolean" ? edge.visible : true,
      });
    } catch {}
    cursor = end + 3;
  }

  cursor = 0;
  while (true) {
    const start = body.indexOf("<!-- tw-history:", cursor);
    if (start === -1) break;
    const end = body.indexOf("-->", start);
    if (end === -1) break;
    try {
      const frame = JSON.parse(body.slice(start + 16, end).trim());
      nativeHistory.push({
        id: frame.id || newId("frame"),
        label: frame.label || "frame",
        createdAt: frame.createdAt || new Date().toISOString(),
        nodes: Array.isArray(frame.nodes)
          ? frame.nodes.map((node: any) => ({
              id: node?.id,
              position: Array.isArray(node?.position) && node.position.length === 3 ? node.position : [0, 0, 0],
              size: typeof node?.size === "number" ? node.size : 0.6,
              frameScale: typeof node?.frameScale === "number" ? node.frameScale : 1,
            }))
          : [],
      });
    } catch {}
    cursor = end + 3;
  }

  cursor = 0;
  while (true) {
    const start = body.indexOf("<!-- tw-topic-link:", cursor);
    if (start === -1) break;
    const end = body.indexOf("-->", start);
    if (end === -1) break;
    try {
      const link = JSON.parse(body.slice(start + 18, end).trim());
      nativeTopicLinks.push({
        id: link.id || newId("topic-link"),
        targetTitle: link.targetTitle || "",
        targetId: link.targetId || "",
        targetFile: link.targetFile || "",
        relation: link.relation || "参照",
        meaning: link.meaning || "imported topic link",
      });
    } catch {}
    cursor = end + 3;
  }

  const lines = body.split(NL);
  const sections: { level: number; title: string; lines: string[] }[] = [];
  let current: { level: number; title: string; lines: string[] } | null = null;
  lines.forEach((line) => {
    const trimmed = line.trimStart();
    let level = 0;
    while (level < trimmed.length && trimmed[level] === "#") level += 1;
    if (level > 0 && trimmed[level] === " ") {
      if (current) sections.push(current);
      current = { level, title: trimmed.slice(level + 1).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  });
  if (current) sections.push(current);

  let nodes: NodeItem[] = [];
  if (sections.length) {
    nodes = sections.map((section, index) => {
      let content = section.lines.join(NL).trim();
      let tw: any = {};
      const start = content.indexOf("<!-- tw:");
      if (start !== -1) {
        const end = content.indexOf("-->", start);
        if (end !== -1) {
          try { tw = JSON.parse(content.slice(start + 9, end).trim()); } catch {}
          content = `${content.slice(0, start)} ${content.slice(end + 3)}`.trim();
        }
      }
      return {
        id: tw.id || newId("node"),
        label: section.title,
        type: tw.type || "主張",
        tense: tw.tense || "現在",
        position: Array.isArray(tw.position) && tw.position.length === 3 ? tw.position : autoNodePosition(index, sections.length),
        note: content,
        size: typeof tw.size === "number" ? tw.size : 0.6,
        frameScale: typeof tw.frameScale === "number" ? tw.frameScale : 1,
        group: tw.group || "default",
        layer: tw.layer || `h${section.level}`,
      };
    });
  } else {
    nodes = [{ id: newId("node"), label: topicTitle, type: "主張", tense: "現在", position: [0, 0, 0], note: body.trim(), size: 0.7, frameScale: 1, group: "default", layer: "default" }];
  }

  const edges = nativeEdges.slice();
  if (mode !== "simple") {
    const byLabel = new Map(nodes.map((node) => [slugify(node.label), node.id]));
    const existing = new Set(edges.map((edge) => `${edge.from}->${edge.to}:${edge.relation}`));
    const collectTargets = (note: string) => {
      const out: string[] = [];
      let c = 0;
      while (true) {
        const s = note.indexOf("[[", c);
        if (s === -1) break;
        const e = note.indexOf("]]", s + 2);
        if (e === -1) break;
        out.push(note.slice(s + 2, e).trim());
        c = e + 2;
      }
      c = 0;
      while (true) {
        const s = note.indexOf("](#", c);
        if (s === -1) break;
        const e = note.indexOf(")", s + 3);
        if (e === -1) break;
        out.push(note.slice(s + 3, e).trim());
        c = e + 1;
      }
      return out;
    };
    nodes.forEach((node) => {
      collectTargets(node.note).forEach((raw) => {
        const targetId = byLabel.get(slugify(raw));
        if (!targetId || targetId === node.id) return;
        const key = `${node.id}->${targetId}:参照`;
        if (existing.has(key)) return;
        existing.add(key);
        edges.push({ id: newId("edge"), from: node.id, to: targetId, relation: "参照", meaning: "markdown link", weight: 1 });
      });
    });
  }

  return {
    id: newId("topic"),
    title: topicTitle,
    folder: meta.folder || meta.category || "Imported",
    description: meta.description || "Imported from markdown.",
    axisPreset: normalizeAxisPreset({ x: meta.axisX, y: meta.axisY, z: meta.axisZ }),
    workspace: createDefaultWorkspace(18, 18, typeof meta.size === "number" ? meta.size : 112),
    style: createDefaultTopicStyle(),
    history: nativeHistory,
    paraCategory: meta.paraCategory || "Resources",
    mustOneNodeId: meta.mustOneNodeId || null,
    sourceFile: filename || normalizeSourceFilename(topicTitle || "topic"),
    unresolvedTopicLinks: [],
    topicLinkRefs: nativeTopicLinks,
    nodes,
    edges: edges.filter((edge) => nodes.some((node) => node.id === edge.from) && nodes.some((node) => node.id === edge.to)),
  };
}
