import type { NodeItem, TopicItem, TopicLinkItem, EdgeItem, CanvasRegion } from "../types";
import { newId } from "./id";

export type TopicFrameworkKind = "issue_tree" | "cynefin";
export type NodeReasoningPreset =
  | "claim"
  | "grounds"
  | "warrant"
  | "backing"
  | "rebuttal"
  | "qualifier"
  | "question"
  | "option";

export type TopicMocSummary = {
  parentTitle: string | null;
  childTitles: string[];
  outgoingLinks: Array<{ title: string; relation: string }>;
  incomingLinks: Array<{ title: string; relation: string }>;
  layerCounts: Array<{ layer: string; count: number }>;
  regionLabels: string[];
  mustOneLabel: string | null;
  markdown: string;
};

const PRESET_META: Record<NodeReasoningPreset, {
  label: { ja: string; en: string };
  type: string;
  layer: string;
  group: string;
  tags: string[];
  note: { ja: string; en: string };
}> = {
  claim: {
    label: { ja: "Claim", en: "Claim" },
    type: "主張",
    layer: "claim",
    group: "toulmin",
    tags: ["toulmin", "claim"],
    note: { ja: "この主張は何を成立させたいのか？", en: "What exactly does this claim try to establish?" },
  },
  grounds: {
    label: { ja: "Grounds", en: "Grounds" },
    type: "根拠",
    layer: "grounds",
    group: "toulmin",
    tags: ["toulmin", "grounds"],
    note: { ja: "この主張を支える具体的な観測・事実は何か？", en: "What concrete facts or observations support this claim?" },
  },
  warrant: {
    label: { ja: "Warrant", en: "Warrant" },
    type: "前提",
    layer: "warrant",
    group: "toulmin",
    tags: ["toulmin", "warrant"],
    note: { ja: "根拠から主張へ飛ぶときの前提は何か？", en: "What assumption connects the grounds to the claim?" },
  },
  backing: {
    label: { ja: "Backing", en: "Backing" },
    type: "根拠",
    layer: "backing",
    group: "toulmin",
    tags: ["toulmin", "backing"],
    note: { ja: "この前提自体を支える根拠は何か？", en: "What supports the warrant itself?" },
  },
  rebuttal: {
    label: { ja: "Rebuttal", en: "Rebuttal" },
    type: "反対意見",
    layer: "rebuttal",
    group: "toulmin",
    tags: ["toulmin", "rebuttal"],
    note: { ja: "どんな条件ならこの主張は崩れるか？", en: "Under what conditions would this claim fail?" },
  },
  qualifier: {
    label: { ja: "Qualifier", en: "Qualifier" },
    type: "主張",
    layer: "qualifier",
    group: "toulmin",
    tags: ["toulmin", "qualifier"],
    note: { ja: "どの程度の強さ・条件付きで言えるか？", en: "With what confidence or conditions does this claim hold?" },
  },
  question: {
    label: { ja: "Question", en: "Question" },
    type: "問い",
    layer: "issue",
    group: "issue-tree",
    tags: ["issue-tree", "question"],
    note: { ja: "このトピックの中心問いは何か？", en: "What is the core question of this topic?" },
  },
  option: {
    label: { ja: "Option", en: "Option" },
    type: "行動案",
    layer: "option",
    group: "issue-tree",
    tags: ["issue-tree", "option"],
    note: { ja: "考えうる選択肢・打ち手は何か？", en: "What options or interventions are available?" },
  },
};

function mergeTags(current: string[] | undefined, next: string[]) {
  return Array.from(new Set([...(current || []), ...next]));
}

function hasEdge(edges: EdgeItem[], from: string, to: string, relation: string) {
  return edges.some((edge) => edge.from === from && edge.to === to && edge.relation === relation);
}

function hasRegion(regions: CanvasRegion[] | undefined, label: string) {
  return (regions || []).some((region) => region.label === label);
}

function scaffoldLabel(kind: TopicFrameworkKind, key: string, lang: "ja" | "en") {
  const labels = {
    issue_tree: {
      question: { ja: "中心問い", en: "Core Question" },
      driverA: { ja: "要因 A", en: "Driver A" },
      driverB: { ja: "要因 B", en: "Driver B" },
      optionA: { ja: "選択肢 A", en: "Option A" },
      optionB: { ja: "選択肢 B", en: "Option B" },
      risk: { ja: "制約 / リスク", en: "Constraint / Risk" },
      regionQuestion: { ja: "Question", en: "Question" },
      regionDrivers: { ja: "Drivers", en: "Drivers" },
      regionOptions: { ja: "Options", en: "Options" },
      regionRisks: { ja: "Risks", en: "Risks" },
    },
    cynefin: {
      situation: { ja: "状況", en: "Situation" },
      clear: { ja: "Clear", en: "Clear" },
      complicated: { ja: "Complicated", en: "Complicated" },
      complex: { ja: "Complex", en: "Complex" },
      chaotic: { ja: "Chaotic", en: "Chaotic" },
      regionMap: { ja: "Cynefin Map", en: "Cynefin Map" },
    },
  } as const;
  return labels[kind][key as keyof typeof labels[typeof kind]][lang];
}

export function getReasoningPresetMeta(preset: NodeReasoningPreset) {
  return PRESET_META[preset];
}

export function applyNodeReasoningPreset(node: NodeItem, preset: NodeReasoningPreset, lang: "ja" | "en" = "ja"): Partial<NodeItem> {
  const meta = PRESET_META[preset];
  return {
    type: meta.type,
    layer: meta.layer,
    group: meta.group,
    tags: mergeTags(node.tags, meta.tags),
    note: node.note.trim().length > 0 ? node.note : meta.note[lang],
  };
}

export function buildTopicMoc(topic: TopicItem, topics: TopicItem[], topicLinks: TopicLinkItem[], lang: "ja" | "en" = "ja"): TopicMocSummary {
  const parentTitle = topic.parentTopicId ? topics.find((item) => item.id === topic.parentTopicId)?.title || null : null;
  const childTitles = topics.filter((item) => item.parentTopicId === topic.id).map((item) => item.title);
  const outgoingLinks = topicLinks
    .filter((link) => link.from === topic.id)
    .map((link) => ({ title: topics.find((item) => item.id === link.to)?.title || link.to, relation: link.relation || "-" }));
  const incomingLinks = topicLinks
    .filter((link) => link.to === topic.id)
    .map((link) => ({ title: topics.find((item) => item.id === link.from)?.title || link.from, relation: link.relation || "-" }));
  const layerCounts = Object.entries(
    topic.nodes.reduce<Record<string, number>>((acc, node) => {
      const key = node.layer || "(none)";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([layer, count]) => ({ layer, count }))
    .sort((a, b) => b.count - a.count || a.layer.localeCompare(b.layer));
  const regionLabels = (topic.canvasRegions || []).map((region) => region.label);
  const mustOneLabel = topic.mustOneNodeId ? topic.nodes.find((node) => node.id === topic.mustOneNodeId)?.label || null : null;

  const heading = lang === "ja" ? `# MOC: ${topic.title}` : `# MOC: ${topic.title}`;
  const lines = [
    heading,
    "",
    `- ${lang === "ja" ? "フォルダ" : "Folder"}: ${topic.folder}`,
    `- PARA: ${topic.paraCategory}`,
    `- ${lang === "ja" ? "親トピック" : "Parent"}: ${parentTitle || "-"}`,
    `- ${lang === "ja" ? "Must One" : "Must One"}: ${mustOneLabel || "-"}`,
    "",
    `## ${lang === "ja" ? "子トピック" : "Child Topics"}`,
    ...(childTitles.length ? childTitles.map((title) => `- ${title}`) : ["- -"]),
    "",
    `## ${lang === "ja" ? "リンク先トピック" : "Linked Topics"}`,
    ...(outgoingLinks.length ? outgoingLinks.map((item) => `- -> ${item.title} (${item.relation})`) : ["- -> -"]),
    ...(incomingLinks.length ? incomingLinks.map((item) => `- <- ${item.title} (${item.relation})`) : ["- <- -"]),
    "",
    `## ${lang === "ja" ? "ノード層" : "Node Layers"}`,
    ...(layerCounts.length ? layerCounts.map((item) => `- ${item.layer}: ${item.count}`) : ["- -"]),
    "",
    `## ${lang === "ja" ? "領域" : "Regions"}`,
    ...(regionLabels.length ? regionLabels.map((label) => `- ${label}`) : ["- -"]),
  ];

  return {
    parentTitle,
    childTitles,
    outgoingLinks,
    incomingLinks,
    layerCounts,
    regionLabels,
    mustOneLabel,
    markdown: lines.join("\n"),
  };
}

export function applyTopicFramework(topic: TopicItem, kind: TopicFrameworkKind, lang: "ja" | "en" = "ja"): Pick<TopicItem, "nodes" | "edges" | "canvasRegions" | "description"> {
  const nodes = [...topic.nodes];
  const edges = [...topic.edges];
  const regions = [...(topic.canvasRegions || [])];
  const labelToNode = new Map(nodes.map((node) => [node.label, node]));

  if (kind === "issue_tree") {
    const templates = [
      { key: "question", type: "問い", layer: "issue", group: "issue-tree", position: [0, 0, 2.1] as [number, number, number] },
      { key: "driverA", type: "前提", layer: "driver", group: "issue-tree", position: [-1.4, 0.6, 1.4] as [number, number, number] },
      { key: "driverB", type: "前提", layer: "driver", group: "issue-tree", position: [1.4, 0.6, 1.4] as [number, number, number] },
      { key: "optionA", type: "行動案", layer: "option", group: "issue-tree", position: [-1.2, -0.9, 1.2] as [number, number, number] },
      { key: "optionB", type: "行動案", layer: "option", group: "issue-tree", position: [1.2, -0.9, 1.2] as [number, number, number] },
      { key: "risk", type: "反対意見", layer: "risk", group: "issue-tree", position: [0, -1.6, 1.1] as [number, number, number] },
    ];
    for (const template of templates) {
      const label = scaffoldLabel(kind, template.key, lang);
      if (!labelToNode.has(label)) {
        const node: NodeItem = {
          id: newId("node"),
          label,
          type: template.type,
          tense: "現在",
          position: template.position,
          note: "",
          size: 0.88,
          group: template.group,
          layer: template.layer,
        };
        nodes.push(node);
        labelToNode.set(label, node);
      }
    }
    const center = labelToNode.get(scaffoldLabel(kind, "question", lang));
    const relationMap: Array<[string, string]> = [
      ["driverA", "factor"],
      ["driverB", "factor"],
      ["optionA", "option"],
      ["optionB", "option"],
      ["risk", "risk"],
    ];
    if (center) {
      for (const [key, relation] of relationMap) {
        const target = labelToNode.get(scaffoldLabel(kind, key, lang));
        if (target && !hasEdge(edges, center.id, target.id, relation)) {
          edges.push({
            id: newId("edge"),
            from: center.id,
            to: target.id,
            relation,
            meaning: relation,
            weight: 1,
          });
        }
      }
    }
    const regionTemplates = [
      { key: "regionQuestion", color: "rgba(59,130,246,0.38)", bounds: { x: 39, y: 8, w: 22, h: 16 } },
      { key: "regionDrivers", color: "rgba(234,179,8,0.30)", bounds: { x: 12, y: 18, w: 76, h: 22 } },
      { key: "regionOptions", color: "rgba(34,197,94,0.26)", bounds: { x: 16, y: 44, w: 68, h: 20 } },
      { key: "regionRisks", color: "rgba(239,68,68,0.24)", bounds: { x: 28, y: 68, w: 44, h: 16 } },
    ];
    for (const region of regionTemplates) {
      const label = scaffoldLabel(kind, region.key, lang);
      if (!hasRegion(regions, label)) {
        regions.push({ id: newId("region"), label, color: region.color, bounds: region.bounds });
      }
    }
  }

  if (kind === "cynefin") {
    const templates = [
      { key: "situation", type: "問い", layer: "situation", group: "cynefin", position: [0, 0, 2.2] as [number, number, number] },
      { key: "clear", type: "主張", layer: "clear", group: "cynefin", position: [-1.2, 0.8, 1.3] as [number, number, number] },
      { key: "complicated", type: "主張", layer: "complicated", group: "cynefin", position: [1.2, 0.8, 1.3] as [number, number, number] },
      { key: "complex", type: "主張", layer: "complex", group: "cynefin", position: [-1.2, -0.9, 1.3] as [number, number, number] },
      { key: "chaotic", type: "主張", layer: "chaotic", group: "cynefin", position: [1.2, -0.9, 1.3] as [number, number, number] },
    ];
    for (const template of templates) {
      const label = scaffoldLabel(kind, template.key, lang);
      if (!labelToNode.has(label)) {
        const node: NodeItem = {
          id: newId("node"),
          label,
          type: template.type,
          tense: "現在",
          position: template.position,
          note: "",
          size: 0.84,
          group: template.group,
          layer: template.layer,
        };
        nodes.push(node);
        labelToNode.set(label, node);
      }
    }
    const center = labelToNode.get(scaffoldLabel(kind, "situation", lang));
    if (center) {
      for (const key of ["clear", "complicated", "complex", "chaotic"] as const) {
        const target = labelToNode.get(scaffoldLabel(kind, key, lang));
        if (target && !hasEdge(edges, center.id, target.id, key)) {
          edges.push({
            id: newId("edge"),
            from: center.id,
            to: target.id,
            relation: key,
            meaning: key,
            weight: 1,
          });
        }
      }
    }
    const label = scaffoldLabel(kind, "regionMap", lang);
    if (!hasRegion(regions, label)) {
      regions.push({
        id: newId("region"),
        label,
        color: "rgba(168,85,247,0.24)",
        bounds: { x: 12, y: 14, w: 76, h: 62 },
      });
    }
  }

  const marker = kind === "issue_tree"
    ? (lang === "ja" ? "[Scaffold] Issue Tree を適用" : "[Scaffold] Issue Tree applied")
    : (lang === "ja" ? "[Scaffold] Cynefin を適用" : "[Scaffold] Cynefin applied");
  const description = topic.description.includes(marker)
    ? topic.description
    : `${topic.description.trim()}${topic.description.trim() ? "\n\n" : ""}${marker}`;

  return {
    nodes,
    edges,
    canvasRegions: regions,
    description,
  };
}
