/**
 * canonical relation type（EdgeItem.relation の正式値セット）
 * 既存データに日本語文字列が入っている場合も後方互換で表示される。
 * 新規作成時はこのセットから選ぶことを推奨。
 */
export const RELATION_TYPES = [
  "supports",
  "opposes",
  "relatesTo",
  "derivedFrom",
  "references",
  "sameAsCandidate",
  "splitFrom",
  "mergedFrom",
  "causes",
  "temporalNext",
  "questions",
  "implements",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const RELATION_TYPE_LABELS: Record<RelationType, { ja: string; en: string }> = {
  supports:        { ja: "支持",     en: "Supports" },
  opposes:         { ja: "反論",     en: "Opposes" },
  relatesTo:       { ja: "関連",     en: "Relates to" },
  derivedFrom:     { ja: "派生",     en: "Derived from" },
  references:      { ja: "参照",     en: "References" },
  sameAsCandidate: { ja: "同一候補", en: "Same-as candidate" },
  splitFrom:       { ja: "分割元",   en: "Split from" },
  mergedFrom:      { ja: "統合元",   en: "Merged from" },
  causes:          { ja: "影響",     en: "Causes" },
  temporalNext:    { ja: "後続",     en: "Temporal next" },
  questions:       { ja: "問題提起", en: "Questions" },
  implements:      { ja: "実装",     en: "Implements" },
};

/** 矛盾・対立タイプ（二階のサイバネティクス + 境界思考） */
export const CONTRADICTION_TYPES = ["direct", "conditional", "contextual", "temporal", "definitional", "unresolved"] as const;
export type ContradictionType = (typeof CONTRADICTION_TYPES)[number];

/** 変換演算タイプ（SECIモデル + システム思考） */
export const TRANSFORM_OPS = ["integrate", "split", "abstract", "concretize", "invert", "oppose", "metaphorize", "taskify", "create", "question"] as const;
export type TransformOp = (typeof TRANSFORM_OPS)[number];

export type EdgeItem = {
  id: string;
  from: string;
  to: string;
  relation: string;
  meaning: string;
  weight: number;
  visible?: boolean;
  /** 矛盾・対立タイプ */
  contradictionType?: ContradictionType;
  /** 変換演算タイプ */
  transformOp?: TransformOp;
};
