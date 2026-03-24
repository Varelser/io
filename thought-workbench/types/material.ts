import type { MaterialStatus } from "./node";

/** 資料の種別 */
export const MATERIAL_TYPES = ["document", "image", "audio", "pdf", "article", "import", "note", "other"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

/**
 * 独立した資料オブジェクト。
 * NodeItem.materialStatus はノード側の「消化状態」を表すが、
 * Material は資料そのものをファーストクラスオブジェクトとして管理する。
 * NodeItem の linkedUrls / materialStatus は後方互換のまま維持。
 */
export type Material = {
  id: string;
  label: string;
  type: MaterialType;
  status: MaterialStatus;
  url?: string;
  note?: string;
  /** このMaterialを参照しているNodeのID群 */
  linkedNodeIds?: string[];
  /** 所属TopicのID（nullish = 全体共有） */
  topicId?: string;
  createdAt: string;
  updatedAt?: string;
};
