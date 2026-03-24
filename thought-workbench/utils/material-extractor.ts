import type { Material } from "../types/material";
import type { TopicItem } from "../types/topic";

export type ExtractionCandidate = {
  keyword: string;
  /** 既存ノードとのマッチ（ラベルが近い） */
  matchedNode?: { nodeId: string; topicId: string; topicTitle: string; label: string };
  /** 新規ノード作成候補（既存ノードに一致しない） */
  isNew: boolean;
  score: number;
};

const STOP_WORDS_JA = new Set([
  "する","ない","ある","いる","できる","なる","これ","それ","あれ","この","その","あの",
  "ため","こと","もの","よう","から","まで","より","について","として","にとって",
  "ため","ように","ための","ことが","ことを","ことに","ものが","ものを","ものの",
  "また","なお","ただし","しかし","および","あるいは","または","ならびに",
  "という","といった","といえば","とした","として","しており","されている",
  "では","には","とは","への","からの","による","に対する","に関する","に関して",
]);

const STOP_WORDS_EN = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "from","up","about","into","through","during","is","are","was","were","be",
  "been","being","have","has","had","do","does","did","will","would","could",
  "should","may","might","shall","can","need","dare","ought","used","this","that",
  "these","those","it","its","they","them","their","we","our","you","your","he",
  "she","him","her","his","not","no","nor","so","yet","both","either","neither",
  "each","few","more","most","other","some","such","than","too","very","just",
]);

/** テキストからキーワード候補を抽出する */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  // 句読点・記号で分割
  const tokens = text
    .replace(/[「」『』【】（）()[\]{}<>""''。、，．·・\n\r\t/\\|@#$%^&*+=~`]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const seen = new Set<string>();
  const results: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (seen.has(lower)) continue;
    // 数字のみ・記号のみはスキップ
    if (/^[\d\s\-_.,]+$/.test(token)) continue;
    // ストップワードスキップ
    if (STOP_WORDS_JA.has(token) || STOP_WORDS_EN.has(lower)) continue;
    seen.add(lower);
    results.push(token);
  }

  return results.slice(0, 40);
}

/** 文字列類似度: 最長共通部分列ベースの簡易スコア */
function similarity(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.8;
  // 共通文字数 / 最大長
  const setA = new Set(la.split(""));
  const setB = new Set(lb.split(""));
  let common = 0;
  for (const c of setA) { if (setB.has(c)) common++; }
  return common / Math.max(la.length, lb.length);
}

/**
 * マテリアルのラベル + note からキーワードを抽出し、
 * 既存ノードとの一致候補および新規ノード作成候補を返す。
 */
export function extractNodeCandidatesFromMaterial(
  material: Material,
  topics: TopicItem[],
  similarityThreshold = 0.65,
): ExtractionCandidate[] {
  const text = [material.label, material.note || ""].join(" ");
  const keywords = extractKeywords(text);
  if (keywords.length === 0) return [];

  // 全ノードのインデックスを構築
  const allNodes: { nodeId: string; topicId: string; topicTitle: string; label: string }[] = [];
  for (const topic of topics) {
    for (const node of topic.nodes) {
      allNodes.push({ nodeId: node.id, topicId: topic.id, topicTitle: topic.title, label: node.label });
    }
  }

  // 既にリンク済みノードのIDセット
  const linkedIds = new Set(material.linkedNodeIds || []);

  const candidates: ExtractionCandidate[] = [];

  for (const keyword of keywords) {
    // 既存ノードとのマッチ検索
    let bestMatch: (typeof allNodes)[0] | undefined;
    let bestScore = 0;

    for (const n of allNodes) {
      if (linkedIds.has(n.nodeId)) continue; // 既にリンク済みはスキップ
      const s = similarity(keyword, n.label);
      if (s > bestScore) {
        bestScore = s;
        bestMatch = n;
      }
    }

    if (bestScore >= similarityThreshold && bestMatch) {
      candidates.push({
        keyword,
        matchedNode: bestMatch,
        isNew: false,
        score: bestScore,
      });
    } else if (keyword.length >= 3) {
      // 新規ノード候補
      candidates.push({
        keyword,
        isNew: true,
        score: 0.3,
      });
    }
  }

  // スコア降順ソート、最大20件
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 20);
}
