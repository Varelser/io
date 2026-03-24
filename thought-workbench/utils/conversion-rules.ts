import type { ConversionRule, ConversionItem } from "../types/app-state";
import type { TopicItem } from "../types/topic";
import { newId } from "./id";

/**
 * ルール条件とノードのフィールドを照合する。
 * 条件フィールドが未指定の場合はワイルドカード（常に一致）。
 */
function nodeMatchesRule(
  node: TopicItem["nodes"][0],
  conditions: ConversionRule["conditions"],
): boolean {
  if (conditions.intakeStatus && node.intakeStatus !== conditions.intakeStatus) return false;
  if (conditions.workStatus && node.workStatus !== conditions.workStatus) return false;
  if (conditions.nodeType && node.type !== conditions.nodeType) return false;
  if (conditions.hypothesisStage && node.hypothesisStage !== conditions.hypothesisStage) return false;
  if (conditions.knowledgePhase && node.knowledgePhase !== conditions.knowledgePhase) return false;
  return true;
}

/**
 * 有効なルールを全トピックのノードに適用し、
 * まだキューに入っていないノードに対する新規 ConversionItem 候補を返す。
 */
export function evaluateConversionRules(
  topics: TopicItem[],
  rules: ConversionRule[],
  existingQueue: ConversionItem[],
): Omit<ConversionItem, "id" | "createdAt">[] {
  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) return [];

  // 既にキューにある (sourceTopicId, sourceNodeId) のセット
  const inQueue = new Set(existingQueue.map((item) => `${item.sourceTopicId}:${item.sourceNodeId}`));

  const candidates: Omit<ConversionItem, "id" | "createdAt">[] = [];

  for (const topic of topics) {
    for (const node of topic.nodes) {
      const key = `${topic.id}:${node.id}`;
      if (inQueue.has(key)) continue;

      for (const rule of enabledRules) {
        if (nodeMatchesRule(node, rule.conditions)) {
          candidates.push({
            sourceTopicId: topic.id,
            sourceNodeId: node.id,
            sourceLabel: node.label,
            targetType: rule.targetType,
            status: "pending",
            note: `Auto: ${rule.label}`,
          });
          // 同一ノードで複数ルールが一致しても1件のみ追加（最初のルールを優先）
          break;
        }
      }
    }
  }

  return candidates;
}

/**
 * 候補リストを ConversionItem[] に変換する（id・createdAt を付与）
 */
export function buildConversionItemsFromCandidates(
  candidates: Omit<ConversionItem, "id" | "createdAt">[],
): ConversionItem[] {
  return candidates.map((c) => ({
    ...c,
    id: newId("cq"),
    createdAt: new Date().toISOString(),
  }));
}
