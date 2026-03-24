/** 管理法が要求するプロパティ定義 */
export type PropertyDef = {
  key: string;
  label: { ja: string; en: string };
  type: "string" | "number" | "boolean" | "select" | "tags" | "date" | "textarea" | "range";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
};

/** 管理法の表示ルール */
export type DisplayRule = {
  /** 推奨ビュー */
  recommendedViews?: string[];
  /** デフォルトのソートキー */
  defaultSortKey?: string;
  /** 色分け条件 */
  colorBy?: string;
  /** 強調条件 */
  highlightWhen?: string;
};

/** 管理法の検索ルール */
export type SearchRule = {
  /** 検索対象フィールド */
  searchableFields?: string[];
  /** デフォルトフィルタ */
  defaultFilters?: Record<string, string>;
};

/** 管理法カテゴリ */
export const METHOD_CATEGORIES = ["standard", "library", "pkm", "task", "research", "assessment", "custom"] as const;
export type MethodCategory = (typeof METHOD_CATEGORIES)[number];

/** 管理法オブジェクト */
export type ManagementMethod = {
  id: string;
  name: { ja: string; en: string };
  description: { ja: string; en: string };
  category: MethodCategory;
  /** この管理法が要求/推奨するプロパティ群 */
  properties: PropertyDef[];
  /** 重視する関係タイプ */
  preferredRelations?: string[];
  /** 表示ルール */
  displayRules?: DisplayRule;
  /** 検索ルール */
  searchRules?: SearchRule;
  /** ビルトインかユーザー定義か */
  builtin?: boolean;
};
