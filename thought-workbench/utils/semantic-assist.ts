import type { NodeItem } from "../types";

export type SemanticLayerSummary = {
  layer: string;
  depth: number;
  count: number;
  examples: string[];
};

export type SemanticRelationSuggestion = {
  id: string;
  relation: string;
  meaningJa: string;
  meaningEn: string;
  reasonJa: string;
  reasonEn: string;
};

function parseLayerDepth(layer: string) {
  const normalized = layer.toLowerCase();
  const matched = normalized.match(/(?:^h|^layer-|^l)(\d+)/);
  if (matched) return Number(matched[1]);
  if (normalized === "core") return 0;
  if (normalized === "abstract") return 1;
  if (normalized === "concrete") return 3;
  return 99;
}

export function buildSemanticLayerSummary(nodes: NodeItem[]): SemanticLayerSummary[] {
  const byLayer = new Map<string, NodeItem[]>();
  nodes.forEach((node) => {
    const key = node.layer || "(none)";
    if (!byLayer.has(key)) byLayer.set(key, []);
    byLayer.get(key)!.push(node);
  });
  return [...byLayer.entries()]
    .map(([layer, items]) => ({
      layer,
      depth: parseLayerDepth(layer),
      count: items.length,
      examples: items.slice(0, 3).map((item) => item.label),
    }))
    .sort((left, right) => left.depth - right.depth || left.layer.localeCompare(right.layer));
}

function uniqueByRelation(list: SemanticRelationSuggestion[]) {
  const seen = new Set<string>();
  return list.filter((item) => {
    if (seen.has(item.relation)) return false;
    seen.add(item.relation);
    return true;
  });
}

export function buildSemanticRelationSuggestions(nodes: NodeItem[], fromId: string, toId: string): SemanticRelationSuggestion[] {
  const from = nodes.find((node) => node.id === fromId);
  const to = nodes.find((node) => node.id === toId);
  if (!from || !to) {
    return [
      {
        id: "semantic-reference",
        relation: "参照",
        meaningJa: "関連語・近い意味で接続",
        meaningEn: "Connect as a nearby meaning or related term",
        reasonJa: "意味の近さを先に置く基本形。",
        reasonEn: "Basic semantic link for nearby meanings.",
      },
      {
        id: "semantic-detail",
        relation: "具体化",
        meaningJa: "上位概念から具体例へ落とす",
        meaningEn: "Move from the higher concept to a concrete example",
        reasonJa: "抽象から具体への整理に使う。",
        reasonEn: "Useful for abstract-to-concrete organization.",
      },
    ];
  }

  const fromDepth = parseLayerDepth(from.layer);
  const toDepth = parseLayerDepth(to.layer);
  const suggestions: SemanticRelationSuggestion[] = [];

  if (fromDepth < toDepth) {
    suggestions.push({
      id: "semantic-detail",
      relation: "具体化",
      meaningJa: `${from.label} を ${to.label} で具体化する`,
      meaningEn: `Use ${to.label} as a concrete instance of ${from.label}`,
      reasonJa: "上位レイヤーから下位レイヤーへの接続。",
      reasonEn: "The source sits above the target in the layer stack.",
    });
  }
  if (fromDepth > toDepth) {
    suggestions.push({
      id: "semantic-abstraction",
      relation: "生成",
      meaningJa: `${from.label} から ${to.label} という上位概念を引き上げる`,
      meaningEn: `Lift ${to.label} as the higher-level concept from ${from.label}`,
      reasonJa: "具体側から抽象側へまとめ直す流れ。",
      reasonEn: "This rolls a concrete item up into an abstraction.",
    });
  }
  if (fromDepth === toDepth) {
    suggestions.push({
      id: "semantic-reference",
      relation: "参照",
      meaningJa: `${from.label} と ${to.label} は近い意味圏にある`,
      meaningEn: `${from.label} and ${to.label} belong to a nearby semantic field`,
      reasonJa: "同じ階層にある概念同士の横連結。",
      reasonEn: "Horizontal link between concepts at the same layer.",
    });
  }
  if (to.type === "反対意見" || /反|対義|逆/.test(to.label)) {
    suggestions.push({
      id: "semantic-counter",
      relation: "反論",
      meaningJa: `${to.label} を ${from.label} の対立概念として置く`,
      meaningEn: `Treat ${to.label} as a counter-concept to ${from.label}`,
      reasonJa: "語義の対立や緊張を示しやすい。",
      reasonEn: "Useful when the target is a semantic contrast.",
    });
  }
  if (to.type === "根拠") {
    suggestions.push({
      id: "semantic-support",
      relation: "支持",
      meaningJa: `${to.label} を ${from.label} の根拠として結ぶ`,
      meaningEn: `Use ${to.label} as support for ${from.label}`,
      reasonJa: "意味だけでなく裏付け関係も明示できる。",
      reasonEn: "Adds evidential support instead of only similarity.",
    });
  }
  if (to.type === "理想" || to.tense === "未来") {
    suggestions.push({
      id: "semantic-goal",
      relation: "到達点",
      meaningJa: `${from.label} が向かう到達点として ${to.label} を置く`,
      meaningEn: `Set ${to.label} as the destination state for ${from.label}`,
      reasonJa: "未来志向の概念をゴールとして扱う。",
      reasonEn: "Useful when the target represents a future state.",
    });
  }

  suggestions.push({
    id: "semantic-impact",
    relation: "影響",
    meaningJa: `${from.label} が ${to.label} に意味上の影響を与える`,
    meaningEn: `${from.label} semantically influences ${to.label}`,
    reasonJa: "意味圏は近いが上下関係が曖昧なときの中立案。",
    reasonEn: "Neutral fallback when the hierarchy is ambiguous.",
  });

  return uniqueByRelation(suggestions);
}
