/** Bundle: 横断的作業束（Dossier / Case / Project Pack / Workset） */

export const BUNDLE_TYPES = ["research", "project", "case", "composition", "analysis", "lifestyle", "exhibition", "custom"] as const;
export type BundleType = (typeof BUNDLE_TYPES)[number];

export const BUNDLE_STATUSES = ["active", "on-hold", "completed", "archived", "frozen"] as const;
export type BundleStatus = (typeof BUNDLE_STATUSES)[number];

export type BundleItem = {
  id: string;
  /** Bundle の表示名 */
  title: string;
  /** Bundle の種別 */
  bundleType: BundleType;
  /** 説明 */
  description: string;
  /** 所属ノードID群（トピック横断） */
  memberNodeIds: string[];
  /** 所属トピック（球体）ID群 */
  memberTopicIds: string[];
  /** Bundle の状態 */
  status: BundleStatus;
  /** タグ */
  tags?: string[];
  /** レビュー予定日 ISO */
  reviewAt?: string;
  /** 作成日時 ISO */
  createdAt: string;
  /** 更新日時 ISO */
  updatedAt: string;
};
